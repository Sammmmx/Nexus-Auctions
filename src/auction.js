export const AUCTION_ADDRESS = "0xbb08e8ff7B8668B4039F04e70891BFAC017FE17e";

export const AUCTION_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "AlreadyPurchased", type: "error" },
  { inputs: [], name: "AlreadyWithdrawn", type: "error" },
  { inputs: [], name: "AuctionActive", type: "error" },
  { inputs: [], name: "AuctionAlreadyExists", type: "error" },
  { inputs: [], name: "AuctionDoesNotExist", type: "error" },
  { inputs: [], name: "AuctionEnded", type: "error" },
  { inputs: [], name: "AuctionNotActive", type: "error" },
  { inputs: [], name: "BidTooLow", type: "error" },
  { inputs: [], name: "InvalidValues", type: "error" },
  { inputs: [], name: "LowerThanStartingPrice", type: "error" },
  { inputs: [], name: "NoBidders", type: "error" },
  {
    inputs: [{ internalType: "address", name: "caller", type: "address" }],
    name: "NotOwner",
    type: "error",
  },
  { inputs: [], name: "NotPurchased", type: "error" },
  { inputs: [], name: "WrongAmount", type: "error" },
  { inputs: [], name: "YouAreNotTheSeller", type: "error" },
  { inputs: [], name: "YouAreNotTheWinner", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_auctionNumber",
        type: "uint256",
      },
    ],
    name: "AuctionCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_seller",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_auctionNumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_startingPrice",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_duration",
        type: "uint256",
      },
    ],
    name: "AuctionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_bidder",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_auctionNumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_bidAmount",
        type: "uint256",
      },
    ],
    name: "Bids",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_auctionNumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_winner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_bidAmount",
        type: "uint256",
      },
    ],
    name: "Purchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_auctionNumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_highestBidder",
        type: "address",
      },
    ],
    name: "ResultsAnnounced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_seller",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "auctionNumber",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "Withdrawn",
    type: "event",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "announceResults",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "auctionList",
    outputs: [
      { internalType: "address", name: "seller", type: "address" },
      { internalType: "uint256", name: "startingPrice", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "uint256", name: "high", type: "uint256" },
      { internalType: "address", name: "highBidder", type: "address" },
      { internalType: "bool", name: "status", type: "bool" },
      { internalType: "bool", name: "purchased", type: "bool" },
      { internalType: "bool", name: "withdrawn", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
      { internalType: "uint256", name: "bidAmount", type: "uint256" },
    ],
    name: "bid",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "cancelAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "checkActiveBidPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "checkAuctionActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "checkHighestBidder",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "completeTransaction",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_seller", type: "address" },
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
      { internalType: "uint256", name: "_startingPrice", type: "uint256" },
      { internalType: "uint256", name: "_duration", type: "uint256" },
    ],
    name: "createAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "sellerWithdrawal",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionNumber", type: "uint256" },
    ],
    name: "timeLeft",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
