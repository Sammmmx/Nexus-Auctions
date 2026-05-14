import { useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { AUCTION_ADDRESS, AUCTION_ABI } from "./auction";

function RequestCard({ address, auctionNumber, onApprove }) {
  // Read this specific requester's details from the mapping
  const { data: request } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "auctionRequests",
    args: [address],
    enabled: !!address,
  });

  const { writeContract, isPending } = useWriteContract();

  const handleApprove = () => {
    if (!auctionNumber) return;
    writeContract(
      {
        address: AUCTION_ADDRESS,
        abi: AUCTION_ABI,
        functionName: "createAuction",
        args: [address, BigInt(auctionNumber)],
      },
      {
        onSuccess: () => onApprove(),
      },
    );
  };

  if (!request) return null;

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "0.75rem",
  };

  const btnStyle = {
    padding: "0.5rem 1rem",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
  };

  const inputStyle = {
    padding: "0.4rem",
    fontSize: "0.9rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginRight: "0.5rem",
    width: "120px",
  };

  return (
    <div style={cardStyle}>
      <p>
        <strong>Requester:</strong> {address.slice(0, 6)}...{address.slice(-4)}
      </p>
      <p>
        <strong>Item Name:</strong> {request[0]}
      </p>
      <p>
        <strong>Starting Price:</strong> {formatEther(request[1])} ETH
      </p>
      <p>
        <strong>Duration:</strong> {Number(request[2])} seconds
      </p>
      <div style={{ marginTop: "0.5rem" }}>
        <input
          style={inputStyle}
          type="number"
          placeholder="Auction number"
          value={auctionNumber}
          onChange={(e) => onApprove(e.target.value)}
        />
        <button style={btnStyle} onClick={handleApprove} disabled={isPending}>
          {isPending ? "Approving..." : "Approve"}
        </button>
      </div>
    </div>
  );
}

export default RequestCard;
