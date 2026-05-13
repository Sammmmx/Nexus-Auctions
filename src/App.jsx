import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { AUCTION_ADDRESS, AUCTION_ABI } from "./auction";

function App() {
  const { address, isConnected } = useAccount();
  const [auctionNumber, setAuctionNumber] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [createForm, setCreateForm] = useState({
    seller: "",
    auctionNumber: "",
    startingPrice: "",
    duration: "",
  });

  const auctionId = auctionNumber ? BigInt(auctionNumber) : undefined;

  // ─── READS ───────────────────────────────────────────

  const { data: isActive, refetch: refetchActive } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "checkAuctionActive",
    args: [auctionId],
    enabled: auctionId !== undefined,
  });

  const { data: highestBid, refetch: refetchBid } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "checkActiveBidPrice",
    args: [auctionId],
    enabled: auctionId !== undefined,
  });

  const { data: highestBidder, refetch: refetchBidder } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "checkHighestBidder",
    args: [auctionId],
    enabled: auctionId !== undefined,
  });

  const { data: timeLeft, refetch: refetchTime } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "timeLeft",
    args: [auctionId],
    enabled: auctionId !== undefined && isActive === true,
  });

  const { data: auctionData, refetch: refetchAuction } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "auctionList",
    args: [auctionId],
    enabled: auctionId !== undefined,
  });

  const { data: contractOwner } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "owner",
  });

  const isOwner =
    address &&
    contractOwner &&
    address.toLowerCase() === contractOwner.toLowerCase();
  const isWinner =
    auctionData &&
    address &&
    auctionData[4]?.toLowerCase() === address.toLowerCase();
  const isSeller =
    auctionData &&
    address &&
    auctionData[0]?.toLowerCase() === address.toLowerCase();

  // ─── WRITES ──────────────────────────────────────────

  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  useEffect(() => {
    if (isConfirmed) {
      refetchAll();
    }
  }, [isConfirmed]);

  const refetchAll = () => {
    refetchActive();
    refetchBid();
    refetchBidder();
    refetchTime();
    refetchAuction();
  };

  // Bid
  const handleBid = () => {
    if (!bidAmount || !auctionId) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "bid",
      args: [auctionId, parseEther(bidAmount)],
    });
  };

  // Complete transaction (winner pays)
  const handleCompleteTransaction = () => {
    if (!auctionId || !auctionData) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "completeTransaction",
      args: [auctionId],
      value: auctionData[3], // high bid amount
    });
  };

  // Seller withdrawal
  const handleWithdraw = () => {
    if (!auctionId) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "sellerWithdrawal",
      args: [auctionId],
    });
  };

  // Announce results (anyone can call after auction ends)
  const handleAnnounceResults = () => {
    if (!auctionId) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "announceResults",
      args: [auctionId],
    });
  };

  // Owner: Create auction
  const handleCreateAuction = () => {
    const { seller, auctionNumber, startingPrice, duration } = createForm;
    if (!seller || !auctionNumber || !startingPrice || !duration) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "createAuction",
      args: [
        seller,
        BigInt(auctionNumber),
        parseEther(startingPrice),
        BigInt(duration),
      ],
    });
  };

  // Owner: Cancel auction
  const handleCancelAuction = () => {
    if (!auctionId) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "cancelAuction",
      args: [auctionId],
    });
  };

  // ─── HELPERS ─────────────────────────────────────────

  const formatTime = (seconds) => {
    if (!seconds) return "—";
    const s = Number(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  const shortAddress = (addr) =>
    addr && addr !== "0x0000000000000000000000000000000000000000"
      ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
      : "None";

  const txStatus = isPending
    ? "⏳ Waiting for wallet approval..."
    : isConfirming
      ? "⏳ Transaction confirming on-chain..."
      : isConfirmed
        ? "✅ Transaction confirmed!"
        : null;

  // ─── UI ──────────────────────────────────────────────

  const cardStyle = {
    background: "#f9f9f9",
    borderRadius: "10px",
    padding: "1.25rem",
    marginBottom: "1.25rem",
    border: "1px solid #e0e0e0",
  };
  const inputStyle = {
    padding: "0.5rem",
    fontSize: "1rem",
    width: "100%",
    boxSizing: "border-box",
    marginBottom: "0.5rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
  };
  const btnStyle = (color = "#2563eb") => ({
    padding: "0.6rem 1.2rem",
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.95rem",
    marginTop: "0.25rem",
  });

  return (
    <div
      style={{
        maxWidth: "620px",
        margin: "2rem auto",
        fontFamily: "sans-serif",
        padding: "0 1rem",
      }}
    >
      <h1>🔨 Auction dApp</h1>
      <ConnectButton />

      {isConnected && (
        <div style={{ marginTop: "2rem" }}>
          {/* TX Status */}
          {txStatus && (
            <div
              style={{
                ...cardStyle,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              {txStatus}
              {isConfirmed && (
                <button
                  style={{
                    ...btnStyle(),
                    marginLeft: "1rem",
                    fontSize: "0.8rem",
                  }}
                  onClick={refetchAll}
                >
                  Refresh Data
                </button>
              )}
            </div>
          )}

          {/* Item Lookup */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>🔍 Look up Auction</h3>
            <input
              type="number"
              placeholder="Enter auction number (e.g. 1)"
              value={auctionNumber}
              onChange={(e) => setAuctionNumber(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Auction Info */}
          {auctionId !== undefined && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>📋 Auction #{auctionNumber}</h3>
              <p>
                <strong>Status:</strong>{" "}
                {isActive === undefined
                  ? "Loading..."
                  : isActive
                    ? "🟢 Active"
                    : "🔴 Ended / Inactive"}
              </p>
              <p>
                <strong>Seller:</strong>{" "}
                {auctionData ? shortAddress(auctionData[0]) : "—"}
              </p>
              <p>
                <strong>Starting Price:</strong>{" "}
                {auctionData ? `${formatEther(auctionData[1])} ETH` : "—"}
              </p>
              <p>
                <strong>Highest Bid:</strong>{" "}
                {auctionData && auctionData[3] > 0n
                  ? `${formatEther(auctionData[3])} ETH`
                  : "—"}
              </p>

              <p>
                <strong>Highest Bidder:</strong>{" "}
                {auctionData ? shortAddress(auctionData[4]) : "—"}
              </p>
              <p>
                <strong>Time Left:</strong>{" "}
                {isActive ? formatTime(timeLeft) : "—"}
              </p>
              <p>
                <strong>Purchased:</strong>{" "}
                {auctionData ? (auctionData[6] ? "✅ Yes" : "❌ No") : "—"}
              </p>
              <p>
                <strong>Withdrawn:</strong>{" "}
                {auctionData ? (auctionData[7] ? "✅ Yes" : "❌ No") : "—"}
              </p>
            </div>
          )}

          {/* Place a Bid */}
          {isActive && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>💰 Place a Bid</h3>
              <input
                type="number"
                placeholder="Bid amount in ETH (e.g. 0.05)"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                style={inputStyle}
              />
              <button
                style={btnStyle()}
                onClick={handleBid}
                disabled={isPending || isConfirming}
              >
                Place Bid
              </button>
            </div>
          )}

          {/* Winner: Complete Transaction */}
          {isWinner && !isActive && auctionData && !auctionData[6] && (
            <div
              style={{
                ...cardStyle,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <h3 style={{ marginTop: 0 }}>🏆 You Won!</h3>
              <p>
                Complete the purchase by sending{" "}
                <strong>
                  {auctionData ? formatEther(auctionData[3]) : "—"} ETH
                </strong>
              </p>
              <button
                style={btnStyle("#16a34a")}
                onClick={handleCompleteTransaction}
                disabled={isPending || isConfirming}
              >
                Complete Purchase
              </button>
            </div>
          )}

          {/* Announce Results */}
          {!isActive && auctionId !== undefined && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>📣 Announce Results</h3>
              <p style={{ fontSize: "0.9rem", color: "#666" }}>
                Anyone can announce results after the auction ends.
              </p>
              <button
                style={btnStyle("#7c3aed")}
                onClick={handleAnnounceResults}
                disabled={isPending || isConfirming}
              >
                Announce Results
              </button>
            </div>
          )}

          {/* Seller: Withdraw */}
          {isSeller && auctionData && auctionData[6] && !auctionData[7] && (
            <div
              style={{
                ...cardStyle,
                background: "#fefce8",
                border: "1px solid #fde68a",
              }}
            >
              <h3 style={{ marginTop: 0 }}>💸 Withdraw Funds</h3>
              <p>
                The item was purchased. You can now withdraw{" "}
                <strong>
                  {auctionData ? formatEther(auctionData[3]) : "—"} ETH
                </strong>
              </p>
              <button
                style={btnStyle("#d97706")}
                onClick={handleWithdraw}
                disabled={isPending || isConfirming}
              >
                Withdraw
              </button>
            </div>
          )}

          {/* Owner Panel */}
          {isOwner && (
            <div
              style={{
                ...cardStyle,
                border: "1px solid #fca5a5",
                background: "#fff5f5",
              }}
            >
              <h3 style={{ marginTop: 0 }}>🛠 Owner Panel</h3>

              <h4>Create Auction</h4>
              <input
                style={inputStyle}
                placeholder="Seller address (0x...)"
                value={createForm.seller}
                onChange={(e) =>
                  setCreateForm({ ...createForm, seller: e.target.value })
                }
              />
              <input
                style={inputStyle}
                placeholder="Auction number (e.g. 1)"
                type="number"
                value={createForm.auctionNumber}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    auctionNumber: e.target.value,
                  })
                }
              />
              <input
                style={inputStyle}
                placeholder="Starting price in ETH (e.g. 0.01)"
                type="number"
                value={createForm.startingPrice}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    startingPrice: e.target.value,
                  })
                }
              />
              <input
                style={inputStyle}
                placeholder="Duration in seconds (e.g. 3600 = 1hr)"
                type="number"
                value={createForm.duration}
                onChange={(e) =>
                  setCreateForm({ ...createForm, duration: e.target.value })
                }
              />
              <button
                style={btnStyle("#dc2626")}
                onClick={handleCreateAuction}
                disabled={isPending || isConfirming}
              >
                Create Auction
              </button>

              <h4 style={{ marginTop: "1rem" }}>Cancel Auction</h4>
              <p style={{ fontSize: "0.9rem", color: "#666" }}>
                Uses the auction number entered above.
              </p>
              <button
                style={btnStyle("#991b1b")}
                onClick={handleCancelAuction}
                disabled={isPending || isConfirming}
              >
                Cancel Auction #{auctionNumber || "?"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
