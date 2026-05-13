const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Auction Contract", function () {
  async function deployAuctionFixture() {
    const [owner, seller, bidder1, bidder2] = await ethers.getSigners();
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.deploy();

    const FEES = ethers.parseEther("0.0005");
    const AUCTION_ID = 1;
    const STARTING_PRICE = ethers.parseEther("1");
    const DURATION = 3600; // 1 hour
    const NAME = "Vintage Watch";

    return {
      auction,
      owner,
      seller,
      bidder1,
      bidder2,
      FEES,
      AUCTION_ID,
      STARTING_PRICE,
      DURATION,
      NAME,
    };
  }

  describe("requestAuction", function () {
    it("Should allow a user to request an auction with correct fees", async function () {
      const { auction, seller, FEES, NAME, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);

      await expect(
        auction
          .connect(seller)
          .requestAuction(NAME, STARTING_PRICE, DURATION, { value: FEES }),
      )
        .to.emit(auction, "AuctionRequested")
        .withArgs(NAME, seller.address);

      const request = await auction.auctionRequests(seller.address);
      expect(request.name).to.equal(NAME);
      expect(request.startingPrice).to.equal(STARTING_PRICE);
      expect(request.duration).to.equal(DURATION);
    });

    it("Should revert if the fee is incorrect", async function () {
      const { auction, seller, NAME, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);
      const wrongFee = ethers.parseEther("0.0001");

      await expect(
        auction
          .connect(seller)
          .requestAuction(NAME, STARTING_PRICE, DURATION, { value: wrongFee }),
      ).to.be.revertedWithCustomError(auction, "InvalidFees");
    });

    it("Should revert if name is empty", async function () {
      const { auction, seller, FEES, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);

      await expect(
        auction
          .connect(seller)
          .requestAuction("", STARTING_PRICE, DURATION, { value: FEES }),
      ).to.be.revertedWithCustomError(auction, "EmptyName");
    });

    it("Should revert if there is already a pending request", async function () {
      const { auction, seller, FEES, NAME, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);

      await auction
        .connect(seller)
        .requestAuction(NAME, STARTING_PRICE, DURATION, { value: FEES });

      await expect(
        auction
          .connect(seller)
          .requestAuction("Second Request", STARTING_PRICE, DURATION, {
            value: FEES,
          }),
      ).to.be.revertedWithCustomError(auction, "PendingRequest");
    });

    it("Should revert if starting price or duration is zero", async function () {
      const { auction, seller, FEES, NAME } = await loadFixture(
        deployAuctionFixture,
      );

      await expect(
        auction.connect(seller).requestAuction(NAME, 0, 3600, { value: FEES }),
      ).to.be.revertedWithCustomError(auction, "InvalidValues");

      await expect(
        auction.connect(seller).requestAuction(NAME, 100, 0, { value: FEES }),
      ).to.be.revertedWithCustomError(auction, "InvalidValues");
    });
  });

  describe("createAuction", function () {
    async function setupRequest() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const { auction, seller, FEES, NAME, STARTING_PRICE, DURATION } =
        fixtures;

      // Pre-requisite: Seller must request an auction
      await auction
        .connect(seller)
        .requestAuction(NAME, STARTING_PRICE, DURATION, { value: FEES });

      return fixtures;
    }

    it("Should allow the owner to create an auction from a valid request", async function () {
      const {
        auction,
        owner,
        seller,
        AUCTION_ID,
        NAME,
        STARTING_PRICE,
        DURATION,
      } = await loadFixture(setupRequest);

      // ownerWithdrawal is called internally, so we check the owner's balance increase
      // (Simplified check via event emission and state)
      await expect(
        auction.connect(owner).createAuction(AUCTION_ID, seller.address),
      )
        .to.emit(auction, "AuctionCreated")
        .withArgs(seller.address, AUCTION_ID, STARTING_PRICE, DURATION);

      const item = await auction.auctionList(AUCTION_ID);
      expect(item.name).to.equal(NAME);
      expect(item.seller).to.equal(seller.address);
      expect(item.status).to.equal(true);
    });

    it("Should delete the request after the auction is created", async function () {
      const { auction, owner, seller, AUCTION_ID } = await loadFixture(
        setupRequest,
      );

      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      const request = await auction.auctionRequests(seller.address);
      expect(request.duration).to.equal(0); // Struct is deleted
    });

    it("Should revert if a non-owner tries to create the auction", async function () {
      const { auction, seller, AUCTION_ID } = await loadFixture(setupRequest);

      await expect(
        auction.connect(seller).createAuction(AUCTION_ID, seller.address),
      )
        .to.be.revertedWithCustomError(auction, "NotOwner")
        .withArgs(seller.address);
    });

    it("Should revert if the auction ID already exists", async function () {
      const { auction, owner, seller, AUCTION_ID } = await loadFixture(
        setupRequest,
      );

      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      // Attempting to use the same AUCTION_ID again
      await expect(
        auction.connect(owner).createAuction(AUCTION_ID, seller.address),
      ).to.be.revertedWithCustomError(auction, "AuctionAlreadyExists");
    });

    it("Should revert if there is no pending request for the seller", async function () {
      const { auction, owner, bidder1, AUCTION_ID } = await loadFixture(
        deployAuctionFixture,
      );

      await expect(
        auction.connect(owner).createAuction(AUCTION_ID, bidder1.address),
      ).to.be.revertedWithCustomError(auction, "InvalidRequest");
    });

    it("Should revert if the seller address is address(0)", async function () {
      const { auction, owner, AUCTION_ID } = await loadFixture(
        deployAuctionFixture,
      );

      await expect(
        auction.connect(owner).createAuction(AUCTION_ID, ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(auction, "ZeroAddress");
    });
  });

  describe("cancelRequest", function () {
    async function setupRequest() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const { auction, seller, FEES, NAME, STARTING_PRICE, DURATION } =
        fixtures;

      // Setup: Seller creates a request
      await auction
        .connect(seller)
        .requestAuction(NAME, STARTING_PRICE, DURATION, { value: FEES });

      return fixtures;
    }

    it("Should allow a seller to cancel their request and receive a refund", async function () {
      const { auction, seller, FEES, NAME } = await loadFixture(setupRequest);

      // Check balance before cancellation to verify refund
      const initialBalance = await ethers.provider.getBalance(seller.address);

      // Execute cancellation
      const tx = await auction.connect(seller).cancelRequest();
      const receipt = await tx.wait();

      // Calculate gas spent to ensure precise balance check
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(auction, "RequestCancelled")
        .withArgs(NAME, seller.address);

      // Verify the seller received the 0.0005 ether back
      const finalBalance = await ethers.provider.getBalance(seller.address);
      expect(finalBalance).to.equal(initialBalance + FEES - gasSpent);

      // Verify request is deleted from state
      const request = await auction.auctionRequests(seller.address);
      expect(request.duration).to.equal(0);
    });

    it("Should revert if a user tries to cancel when they have no pending request", async function () {
      const { auction, bidder1 } = await loadFixture(deployAuctionFixture);

      await expect(
        auction.connect(bidder1).cancelRequest(),
      ).to.be.revertedWithCustomError(auction, "NoneRequest");
    });

    it("Should allow the user to submit a new request after cancelling an old one", async function () {
      const { auction, seller, FEES, NAME, STARTING_PRICE, DURATION } =
        await loadFixture(setupRequest);

      // Cancel the first one
      await auction.connect(seller).cancelRequest();

      // Should now be able to request again without PendingRequest error
      await expect(
        auction
          .connect(seller)
          .requestAuction(NAME, STARTING_PRICE, DURATION, { value: FEES }),
      ).to.not.be.reverted;
    });
  });

  describe("bid", function () {
    async function setupActiveAuction() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const { auction, owner, seller, AUCTION_ID, STARTING_PRICE, DURATION } =
        fixtures;

      // Setup: Create a request and then an auction
      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      return fixtures;
    }

    it("Should allow a first bid higher than the starting price", async function () {
      const { auction, bidder1, AUCTION_ID, STARTING_PRICE } =
        await loadFixture(setupActiveAuction);
      const bidAmount = STARTING_PRICE + 100n;

      await expect(auction.connect(bidder1).bid(AUCTION_ID, bidAmount))
        .to.emit(auction, "Bids")
        .withArgs(bidder1.address, AUCTION_ID, bidAmount);

      const item = await auction.auctionList(AUCTION_ID);
      expect(item.high).to.equal(bidAmount);
      expect(item.highBidder).to.equal(bidder1.address);
    });

    it("Should revert if the first bid is lower than or equal to the starting price", async function () {
      const { auction, bidder1, AUCTION_ID, STARTING_PRICE } =
        await loadFixture(setupActiveAuction);

      // Input Validation: Testing bidAmount <= startingPrice
      await expect(
        auction.connect(bidder1).bid(AUCTION_ID, STARTING_PRICE),
      ).to.be.revertedWithCustomError(auction, "LowerThanStartingPrice");
    });

    it("Should allow a second bidder to outbid the first", async function () {
      const { auction, bidder1, bidder2, AUCTION_ID, STARTING_PRICE } =
        await loadFixture(setupActiveAuction);

      const firstBid = STARTING_PRICE + 100n;
      const secondBid = STARTING_PRICE + 200n;

      await auction.connect(bidder1).bid(AUCTION_ID, firstBid);

      await expect(auction.connect(bidder2).bid(AUCTION_ID, secondBid))
        .to.emit(auction, "Bids")
        .withArgs(bidder2.address, AUCTION_ID, secondBid);
    });

    it("Should revert if a new bid is lower than or equal to the current high bid", async function () {
      const { auction, bidder1, bidder2, AUCTION_ID, STARTING_PRICE } =
        await loadFixture(setupActiveAuction);

      const firstBid = STARTING_PRICE + 500n;
      await auction.connect(bidder1).bid(AUCTION_ID, firstBid);

      // Input Validation: Testing bidAmount <= current high
      await expect(
        auction.connect(bidder2).bid(AUCTION_ID, firstBid),
      ).to.be.revertedWithCustomError(auction, "BidTooLow");
    });

    it("Should revert if the auction does not exist", async function () {
      const { auction, bidder1 } = await loadFixture(deployAuctionFixture);
      const INVALID_ID = 999;

      // Modifier Validation: auctionCheck
      await expect(
        auction.connect(bidder1).bid(INVALID_ID, 1000),
      ).to.be.revertedWithCustomError(auction, "AuctionDoesNotExist");
    });
  });

  describe("cancelAuction", function () {
    async function setupActiveAuction() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const { auction, owner, seller, AUCTION_ID, STARTING_PRICE, DURATION } =
        fixtures;

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      return fixtures;
    }

    it("Should allow the owner to cancel an active auction", async function () {
      const { auction, owner, AUCTION_ID } = await loadFixture(
        setupActiveAuction,
      );

      await expect(auction.connect(owner).cancelAuction(AUCTION_ID))
        .to.emit(auction, "AuctionCancelled")
        .withArgs(AUCTION_ID);

      const item = await auction.auctionList(AUCTION_ID);
      expect(item.status).to.equal(false);
    });

    it("Should revert if a non-owner attempts to cancel", async function () {
      const { auction, bidder1, AUCTION_ID } = await loadFixture(
        setupActiveAuction,
      );

      // Validation: onlyOwner modifier
      await expect(auction.connect(bidder1).cancelAuction(AUCTION_ID))
        .to.be.revertedWithCustomError(auction, "NotOwner")
        .withArgs(bidder1.address);
    });

    it("Should revert if the auction is already inactive (already cancelled)", async function () {
      const { auction, owner, AUCTION_ID } = await loadFixture(
        setupActiveAuction,
      );

      await auction.connect(owner).cancelAuction(AUCTION_ID);

      // Validation: auctionCheck modifier (since status is now false)
      await expect(
        auction.connect(owner).cancelAuction(AUCTION_ID),
      ).to.be.revertedWithCustomError(auction, "AuctionDoesNotExist");
    });

    it("Should revert if the auction duration has passed", async function () {
      const { auction, owner, AUCTION_ID, DURATION } = await loadFixture(
        setupActiveAuction,
      );

      // Fast-forward time past the duration
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");

      // Validation: checkActive modifier
      await expect(
        auction.connect(owner).cancelAuction(AUCTION_ID),
      ).to.be.revertedWithCustomError(auction, "AuctionNotActive");
    });
  });

  describe("View Functions", function () {
    async function setupActiveAuction() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const { auction, owner, seller, AUCTION_ID, STARTING_PRICE, DURATION } =
        fixtures;

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      return fixtures;
    }

    it("checkAuctionActive: Should return true for an ongoing auction and false after it ends", async function () {
      const { auction, AUCTION_ID, DURATION } = await loadFixture(
        setupActiveAuction,
      );

      // Should be active initially
      expect(await auction.checkAuctionActive(AUCTION_ID)).to.equal(true);

      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");

      // Should be inactive now
      expect(await auction.checkAuctionActive(AUCTION_ID)).to.equal(false);
    });

    it("timeLeft: Should accurately report remaining time", async function () {
      const { auction, AUCTION_ID, DURATION } = await loadFixture(
        setupActiveAuction,
      );

      const timeRemaining = await auction.timeLeft(AUCTION_ID);
      // Hardhat mines a block for the creation, so time is usually DURATION or DURATION - 1
      expect(Number(timeRemaining)).to.be.closeTo(DURATION, 5);

      // Revert check: Should revert if auction ended
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");
      await expect(auction.timeLeft(AUCTION_ID)).to.be.revertedWithCustomError(
        auction,
        "AuctionEnded",
      );
    });

    it("checkHighestBidder: Should return the correct address or zero address", async function () {
      const { auction, bidder1, AUCTION_ID, STARTING_PRICE } =
        await loadFixture(setupActiveAuction);

      // Initially zero address
      expect(await auction.checkHighestBidder(AUCTION_ID)).to.equal(
        ethers.ZeroAddress,
      );

      // Place a bid
      await auction.connect(bidder1).bid(AUCTION_ID, STARTING_PRICE + 100n);
      expect(await auction.checkHighestBidder(AUCTION_ID)).to.equal(
        bidder1.address,
      );
    });

    it("checkActiveBidPrice: Should return the current high bid", async function () {
      const { auction, bidder1, AUCTION_ID, STARTING_PRICE } =
        await loadFixture(setupActiveAuction);

      const bidAmount = STARTING_PRICE + 500n;
      await auction.connect(bidder1).bid(AUCTION_ID, bidAmount);

      expect(await auction.checkActiveBidPrice(AUCTION_ID)).to.equal(bidAmount);
    });
  });

  describe("announceResults", function () {
    async function setupFinishedAuction() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const {
        auction,
        owner,
        seller,
        bidder1,
        AUCTION_ID,
        STARTING_PRICE,
        DURATION,
      } = fixtures;

      // Setup: Create auction and place a bid
      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      const bidAmount = STARTING_PRICE + ethers.parseEther("0.1");
      await auction.connect(bidder1).bid(AUCTION_ID, bidAmount);

      // Fast-forward time to make it InActive
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");

      return { ...fixtures, bidAmount };
    }

    it("Should successfully announce the winner after auction ends", async function () {
      const { auction, bidder1, AUCTION_ID } = await loadFixture(
        setupFinishedAuction,
      );

      // checkInActive should now pass because block.timestamp > duration
      await expect(auction.announceResults(AUCTION_ID))
        .to.emit(auction, "ResultsAnnounced")
        .withArgs(AUCTION_ID, bidder1.address);
    });

    it("Should revert if called while the auction is still active", async function () {
      const { auction, owner, seller, AUCTION_ID, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      // Validation: checkInActive modifier should trigger AuctionActive error
      await expect(
        auction.announceResults(AUCTION_ID),
      ).to.be.revertedWithCustomError(auction, "AuctionActive");
    });

    it("Should revert if there were no bidders", async function () {
      const { auction, owner, seller, AUCTION_ID, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      // End auction without bidding
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        auction.announceResults(AUCTION_ID),
      ).to.be.revertedWithCustomError(auction, "NoBidders");
    });

    it("Should return the correct winner address via static call", async function () {
      const { auction, bidder1, AUCTION_ID } = await loadFixture(
        setupFinishedAuction,
      );

      // Using callStatic (or just calling the function if it's view/pure,
      // but here it's public returning address)
      const winner = await auction.announceResults.staticCall(AUCTION_ID);
      expect(winner).to.equal(bidder1.address);
    });
  });

  describe("completeTransaction", function () {
    async function setupFinishedAuction() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const {
        auction,
        owner,
        seller,
        bidder1,
        AUCTION_ID,
        STARTING_PRICE,
        DURATION,
      } = fixtures;

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      const bidAmount = STARTING_PRICE + ethers.parseEther("0.1");
      await auction.connect(bidder1).bid(AUCTION_ID, bidAmount);

      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");

      return { ...fixtures, bidAmount };
    }

    it("Should allow the winner to pay the high bid and mark as purchased", async function () {
      const { auction, bidder1, AUCTION_ID, bidAmount } = await loadFixture(
        setupFinishedAuction,
      );

      await expect(
        auction
          .connect(bidder1)
          .completeTransaction(AUCTION_ID, { value: bidAmount }),
      )
        .to.emit(auction, "Purchased")
        .withArgs(AUCTION_ID, bidder1.address, bidAmount);

      const item = await auction.auctionList(AUCTION_ID);
      expect(item.purchased).to.equal(true);
    });

    it("Should revert if a non-winner tries to complete the transaction", async function () {
      const { auction, bidder1, bidder2, AUCTION_ID, bidAmount } =
        await loadFixture(setupFinishedAuction);
      // bidder1 is the winner, bidder2 is not.

      await expect(
        auction
          .connect(bidder2)
          .completeTransaction(AUCTION_ID, { value: bidAmount }),
      ).to.be.revertedWithCustomError(auction, "YouAreNotTheWinner");
    });

    it("Should revert if the payment amount does not match the high bid", async function () {
      const { auction, bidder1, AUCTION_ID, bidAmount } = await loadFixture(
        setupFinishedAuction,
      );
      const wrongAmount = bidAmount - 100n;

      await expect(
        auction
          .connect(bidder1)
          .completeTransaction(AUCTION_ID, { value: wrongAmount }),
      ).to.be.revertedWithCustomError(auction, "WrongAmount");
    });

    it("Should revert if the auction is still active", async function () {
      const {
        auction,
        owner,
        seller,
        bidder1,
        AUCTION_ID,
        STARTING_PRICE,
        DURATION,
      } = await loadFixture(deployAuctionFixture);

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);
      const bidAmount = STARTING_PRICE + 100n;
      await auction.connect(bidder1).bid(AUCTION_ID, bidAmount);

      // No time increase here
      await expect(
        auction
          .connect(bidder1)
          .completeTransaction(AUCTION_ID, { value: bidAmount }),
      ).to.be.revertedWithCustomError(auction, "AuctionActive");
    });

    it("Should revert if the item has already been purchased", async function () {
      const { auction, bidder1, AUCTION_ID, bidAmount } = await loadFixture(
        setupFinishedAuction,
      );

      await auction
        .connect(bidder1)
        .completeTransaction(AUCTION_ID, { value: bidAmount });

      await expect(
        auction
          .connect(bidder1)
          .completeTransaction(AUCTION_ID, { value: bidAmount }),
      ).to.be.revertedWithCustomError(auction, "AlreadyPurchased");
    });
  });

  describe("sellerWithdrawal", function () {
    async function setupPaidAuction() {
      const fixtures = await loadFixture(deployAuctionFixture);
      const {
        auction,
        owner,
        seller,
        bidder1,
        AUCTION_ID,
        STARTING_PRICE,
        DURATION,
      } = fixtures;

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      const bidAmount = STARTING_PRICE + ethers.parseEther("0.1");
      await auction.connect(bidder1).bid(AUCTION_ID, bidAmount);

      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");

      // Winner completes the purchase
      await auction
        .connect(bidder1)
        .completeTransaction(AUCTION_ID, { value: bidAmount });

      return { ...fixtures, bidAmount };
    }

    it("Should allow the seller to withdraw the bid amount after purchase", async function () {
      const { auction, seller, AUCTION_ID, bidAmount } = await loadFixture(
        setupPaidAuction,
      );

      const initialBalance = await ethers.provider.getBalance(seller.address);

      const tx = await auction.connect(seller).sellerWithdrawal(AUCTION_ID);
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(auction, "Withdrawn")
        .withArgs(seller.address, AUCTION_ID, bidAmount);

      const finalBalance = await ethers.provider.getBalance(seller.address);
      expect(finalBalance).to.equal(initialBalance + bidAmount - gasSpent);

      const item = await auction.auctionList(AUCTION_ID);
      expect(item.withdrawn).to.equal(true);
    });

    it("Should revert if a non-seller attempts to withdraw", async function () {
      const { auction, bidder1, AUCTION_ID } = await loadFixture(
        setupPaidAuction,
      );

      await expect(
        auction.connect(bidder1).sellerWithdrawal(AUCTION_ID),
      ).to.be.revertedWithCustomError(auction, "YouAreNotTheSeller");
    });

    it("Should revert if the item has not been purchased yet", async function () {
      const { auction, owner, seller, AUCTION_ID, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);

      await auction
        .connect(seller)
        .requestAuction("Item", STARTING_PRICE, DURATION, {
          value: ethers.parseEther("0.0005"),
        });
      await auction.connect(owner).createAuction(AUCTION_ID, seller.address);

      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        auction.connect(seller).sellerWithdrawal(AUCTION_ID),
      ).to.be.revertedWithCustomError(auction, "NotPurchased");
    });

    it("Should revert if the seller tries to withdraw twice", async function () {
      const { auction, seller, AUCTION_ID } = await loadFixture(
        setupPaidAuction,
      );

      await auction.connect(seller).sellerWithdrawal(AUCTION_ID);

      await expect(
        auction.connect(seller).sellerWithdrawal(AUCTION_ID),
      ).to.be.revertedWithCustomError(auction, "AlreadyWithdrawn");
    });
  });

  describe("ownerWithdrawal", function () {
    it("Should allow the owner to manually withdraw accumulated fees", async function () {
      const { auction, owner, seller, FEES, NAME, STARTING_PRICE, DURATION } =
        await loadFixture(deployAuctionFixture);

      // Seller makes a request, putting 0.0005 ETH into the contract
      await auction
        .connect(seller)
        .requestAuction(NAME, STARTING_PRICE, DURATION, { value: FEES });

      const initialOwnerBalance = await ethers.provider.getBalance(
        owner.address,
      );

      // Owner calls withdrawal
      const tx = await auction.connect(owner).ownerWithdrawal();
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

      // Verify owner received the fees (minus gas)
      expect(finalOwnerBalance).to.equal(initialOwnerBalance + FEES - gasSpent);
    });

    it("Should revert if a non-owner attempts to call ownerWithdrawal", async function () {
      const { auction, seller } = await loadFixture(deployAuctionFixture);

      await expect(auction.connect(seller).ownerWithdrawal())
        .to.be.revertedWithCustomError(auction, "NotOwner")
        .withArgs(seller.address);
    });
  });
});
