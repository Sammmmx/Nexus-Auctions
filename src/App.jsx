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
import RequestCard from "./RequestCard";

function App() {
  const { address, isConnected } = useAccount();
  const [auctionNumber, setAuctionNumber] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [approveNumbers, setApproveNumbers] = useState({});
  const [requestForm, setRequestForm] = useState({
    name: "",
    startingPrice: "",
    duration: "",
  });
  const [createForm, setCreateForm] = useState({
    auctionNumber: "",
    seller: "",
  });

  const auctionId = auctionNumber ? BigInt(auctionNumber) : undefined;

  // ─── READS ───────────────────────────────────────────

  const { data: fees } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "fees",
  });

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
    auctionData[5]?.toLowerCase() === address.toLowerCase();
  const isSeller =
    auctionData &&
    address &&
    auctionData[1]?.toLowerCase() === address.toLowerCase();

  const { data: allRequesters, refetch: refetchRequesters } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "getRequests",
    args: [],
    enabled: !!isOwner,
  });

  const { data: myRequest, refetch: refetchMyRequest } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "auctionRequests",
    args: [address],
    enabled: !!address && !isOwner,
  });

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
    refetchMyRequest();
    refetchRequesters();
  };

  const handleRequestAuction = () => {
    const { name, startingPrice, duration } = requestForm;
    if (!name || !startingPrice || !duration) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "requestAuction",
      args: [name, parseEther(startingPrice), BigInt(duration)],
      value: fees,
    });
  };

  const handleCancelRequest = () => {
    if (!myRequest) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "cancelRequest",
      args: [],
    });
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
      value: auctionData[4], // high bid amount
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
    const { auctionNumber, seller } = createForm;
    if (!seller || !auctionNumber) return;
    writeContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "createAuction",
      args: [BigInt(auctionNumber), seller],
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

          {/* Request Auction */}
          {!isOwner && !myRequest?.[2] && (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>📝 Request an Auction</h3>
              <p style={{ fontSize: "0.9rem", color: "#666" }}>
                Fee: {fees ? formatEther(fees) : "—"} ETH
              </p>
              <input
                style={inputStyle}
                placeholder="Item name"
                value={requestForm.name}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, name: e.target.value })
                }
              />
              <input
                style={inputStyle}
                placeholder="Starting price in ETH (e.g. 0.01)"
                type="number"
                value={requestForm.startingPrice}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    startingPrice: e.target.value,
                  })
                }
              />
              <input
                style={inputStyle}
                placeholder="Duration in seconds (e.g. 3600 = 1hr)"
                type="number"
                value={requestForm.duration}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, duration: e.target.value })
                }
              />
              <button
                style={btnStyle("#7c3aed")}
                onClick={handleRequestAuction}
                disabled={isPending || isConfirming}
              >
                Submit Request
              </button>
            </div>
          )}

          {/* My Pending Request */}
          {!isOwner && myRequest && myRequest[2] > 0n && (
            <div
              style={{
                ...cardStyle,
                background: "#fefce8",
                border: "1px solid #fde68a",
              }}
            >
              <h3 style={{ marginTop: 0 }}>📋 My Pending Request</h3>
              <p>
                <strong>Item Name:</strong> {myRequest[0]}
              </p>
              <p>
                <strong>Starting Price:</strong> {formatEther(myRequest[1])} ETH
              </p>
              <p>
                <strong>Duration:</strong> {Number(myRequest[2])} seconds
              </p>
              <button
                style={btnStyle("#dc2626")}
                onClick={handleCancelRequest}
                disabled={isPending || isConfirming}
              >
                Cancel Request
              </button>
            </div>
          )}

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
                <strong>Item Name:</strong> {auctionData ? auctionData[0] : "—"}
              </p>
              <p>
                <strong>Seller:</strong>{" "}
                {auctionData ? shortAddress(auctionData[1]) : "—"}
              </p>
              <p>
                <strong>Starting Price:</strong>{" "}
                {auctionData ? `${formatEther(auctionData[2])} ETH` : "—"}
              </p>
              <p>
                <strong>Highest Bid:</strong>{" "}
                {auctionData && auctionData[4] > 0n
                  ? `${formatEther(auctionData[4])} ETH`
                  : "—"}
              </p>
              <p>
                <strong>Highest Bidder:</strong>{" "}
                {auctionData ? shortAddress(auctionData[5]) : "—"}
              </p>
              <p>
                <strong>Time Left:</strong>{" "}
                {isActive ? formatTime(timeLeft) : "—"}
              </p>
              <p>
                <strong>Purchased:</strong>{" "}
                {auctionData ? (auctionData[7] ? "✅ Yes" : "❌ No") : "—"}
              </p>
              <p>
                <strong>Withdrawn:</strong>{" "}
                {auctionData ? (auctionData[8] ? "✅ Yes" : "❌ No") : "—"}
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
          {isWinner && !isActive && auctionData && !auctionData[7] && (
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
                  {auctionData ? formatEther(auctionData[4]) : "—"} ETH
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
          {isSeller && auctionData && auctionData[7] && !auctionData[8] && (
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
                  {auctionData ? formatEther(auctionData[4]) : "—"} ETH
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

              <h4 style={{ marginTop: "1rem" }}>Pending Requests</h4>
              {allRequesters && allRequesters.length === 0 && (
                <p style={{ fontSize: "0.9rem", color: "#666" }}>
                  No pending requests.
                </p>
              )}
              {allRequesters &&
                allRequesters.map((requesterAddr) => (
                  <RequestCard
                    key={requesterAddr}
                    address={requesterAddr}
                    auctionNumber={approveNumbers[requesterAddr] || ""}
                    onApprove={(val) =>
                      setApproveNumbers({
                        ...approveNumbers,
                        [requesterAddr]: val,
                      })
                    }
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
