# Nexus Auctions 🔨

A decentralized auction application built on Ethereum, deployed on the Sepolia testnet. Nexus Auctions allows anyone to participate in auctions — placing bids, completing purchases, and withdrawing funds — all trustlessly on-chain, with owner-approved auction creation.

---

## Live Demo

> Deployed on Sepolia Testnet
> Contract Address: `0xbb08e8ff7B8668B4039F04e70891BFAC017FE17e`
> [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xbb08e8ff7B8668B4039F04e70891BFAC017FE17e)

---

## Features

- **Owner-approved auctions** — only the contract owner can create auctions, assigning a seller per auction
- **Open bidding** — anyone can place a bid above the current highest bid
- **Automatic refunds** — outbid participants are not refunded automatically; payment is only sent on `completeTransaction`
- **Winner purchase flow** — the highest bidder completes the purchase by sending the exact bid amount after the auction ends
- **Seller withdrawal** — sellers withdraw their funds after the winner completes the purchase
- **Result announcements** — anyone can announce results on-chain after an auction ends, emitting a verifiable event
- **Auction cancellation** — the owner can cancel an active auction at any time
- **Role-based UI** — the frontend shows different panels depending on whether you are the owner, seller, or winner

---

## Tech Stack

**Smart Contract**

- Solidity `^0.8.26`
- Hardhat
- Deployed & verified on Sepolia testnet

**Frontend**

- React + Vite
- Wagmi v2
- Viem v2
- RainbowKit v2
- TanStack Query

---

## Project Structure

```
Nexus-Auctions/
├── Auction/                  # Hardhat project
│   ├── contracts/
│   │   └── Auction.sol       # Main auction smart contract
│   ├── scripts/
│   │   └── deploy.js         # Deployment script
│   ├── hardhat.config.js
│   └── package.json
├── src/                      # React frontend
│   ├── App.jsx               # Main UI component
│   ├── main.jsx              # Wagmi + RainbowKit providers
│   └── auction.js            # Contract ABI and address
├── public/
├── index.html
└── package.json
```

---

## Smart Contract

The `Auction.sol` contract supports the following functions:

| Function                                                        | Access      | Description                                     |
| --------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| `createAuction(seller, auctionNumber, startingPrice, duration)` | Owner only  | Creates a new auction                           |
| `bid(auctionNumber, bidAmount)`                                 | Anyone      | Places a bid above the current highest          |
| `cancelAuction(auctionNumber)`                                  | Owner only  | Cancels an active auction                       |
| `completeTransaction(auctionNumber)`                            | Winner only | Winner sends ETH to complete the purchase       |
| `sellerWithdrawal(auctionNumber)`                               | Seller only | Seller withdraws funds after purchase           |
| `announceResults(auctionNumber)`                                | Anyone      | Emits ResultsAnnounced event after auction ends |
| `checkAuctionActive(auctionNumber)`                             | View        | Returns whether an auction is currently active  |
| `timeLeft(auctionNumber)`                                       | View        | Returns seconds remaining in the auction        |
| `checkHighestBidder(auctionNumber)`                             | View        | Returns the current highest bidder address      |
| `checkActiveBidPrice(auctionNumber)`                            | View        | Returns the current highest bid amount          |

---

## Getting Started

### Prerequisites

- Node.js v18+
- MetaMask browser extension
- Sepolia testnet ETH (get from [sepoliafaucet.com](https://sepoliafaucet.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/Sammmmx/Nexus-Auctions.git
cd Nexus-Auctions

# Install frontend dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Environment Setup

Create a `.env` file in the `Auction/` folder for contract deployment:

```
SEPOLIA_RPC_URL=your_alchemy_or_infura_sepolia_url
PRIVATE_KEY=your_wallet_private_key
```

> ⚠️ Never commit your `.env` file. It is already included in `.gitignore`.

### Deploy the Contract

```bash
cd Auction
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

After deploying, update `src/auction.js` with the new contract address and ABI.

---

## How It Works

1. **Owner creates an auction** — specifying the seller address, auction number, starting price, and duration in seconds
2. **Bidders place bids** — any bid must be above the current highest bid (or above starting price for the first bid)
3. **Auction ends** — once the duration expires, no more bids are accepted
4. **Results announced** — anyone can call `announceResults` to emit a verifiable on-chain event
5. **Winner completes purchase** — the highest bidder calls `completeTransaction`, sending the exact bid amount in ETH
6. **Seller withdraws** — after the purchase is complete, the seller calls `sellerWithdrawal` to receive the funds

---

## Custom Errors

The contract uses custom errors for gas-efficient reverts:

- `NotOwner` — caller is not the contract owner
- `AuctionAlreadyExists` — auction number already in use
- `AuctionDoesNotExist` — auction number not found
- `AuctionNotActive` — auction has ended or been cancelled
- `BidTooLow` — bid is not above current highest bid
- `LowerThanStartingPrice` — first bid is below starting price
- `YouAreNotTheWinner` — only the highest bidder can complete the transaction
- `YouAreNotTheSeller` — only the assigned seller can withdraw
- `WrongAmount` — ETH sent does not match the winning bid
- `AlreadyPurchased` — purchase already completed
- `AlreadyWithdrawn` — seller has already withdrawn funds
- `NoBidders` — no bids were placed before auction ended

---

## License

MIT
