// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

// Custom errors
error NotOwner(address caller);
error AuctionAlreadyExists();
error AuctionDoesNotExist();
error InvalidValues();
error AuctionNotActive();
error BidTooLow();
error IncorrectPayment();
error AuctionEnded();
error AuctionActive();
error NoBidders();
error YouAreNotTheWinner();
error AlreadyPurchased();
error LowerThanStartingPrice();
error WrongAmount();
error YouAreNotTheSeller();
error AlreadyWithdrawn();
error NotPurchased();
error ZeroAddress();
error EmptyName();
error InvalidFees();
error InvalidRequest();
error NoneRequest();
error PendingRequest();

contract Auction {

    address public immutable owner;
    uint256 public immutable fees = 0.0005 ether;
    
    constructor() {
        owner = msg.sender;
    }

    struct Details {
        string name;
        address seller;
        uint256 startingPrice;
        uint256 duration;
        uint256 high;
        address highBidder;
        bool status;
        bool purchased;
        bool withdrawn;
    }
    mapping(uint256 => Details) public auctionList;

    struct requestsDetails {
        string name;
        uint256 startingPrice;
        uint256 duration;
    }
    mapping(address=> requestsDetails) public auctionRequests;

    modifier onlyOwner() {
        if(msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    modifier auctionCheck(uint256 _auctionNumber) {
        if(!auctionList[_auctionNumber].status) revert AuctionDoesNotExist();
        _;
    }

    modifier checkActive(uint256 _auctionNumber) {
        if (auctionList[_auctionNumber].duration < block.timestamp) revert AuctionNotActive();
        _;
    }

    modifier checkInActive(uint256 _auctionNumber) {
        if (auctionList[_auctionNumber].duration > block.timestamp) revert AuctionActive();
        _;
    }

    event AuctionCreated(address indexed seller, uint256 indexed auctionNumber, uint256 indexed startingPrice, uint256 duration);

    event Bids(address indexed bidder, uint256 indexed auctionNumber, uint256 indexed bidAmount);

    event AuctionCancelled(uint256 indexed auctionNumber);

    event ResultsAnnounced(uint256 indexed auctionNumber, address indexed highestBidder);

    event Purchased(uint256 indexed auctionNumber, address indexed winner, uint256 indexed bidAmount);

    event Withdrawn(address indexed seller, uint256 indexed auctionNumber, uint256 indexed amount);

    event AuctionRequested(string name, address indexed seller);

    event RequestCancelled(string name, address indexed seller);

    function requestAuction(string memory name, uint256 startingPrice, uint256 duration) public payable {
        if (msg.value != fees) revert InvalidFees();
        if (auctionRequests[msg.sender].duration > 0) revert PendingRequest();
        if (bytes(name).length == 0) revert EmptyName();
        if(startingPrice == 0 || duration == 0) revert InvalidValues();

        auctionRequests[msg.sender] = requestsDetails ({
            name: name,
            startingPrice: startingPrice,
            duration: duration
        });

        emit AuctionRequested(name, msg.sender);
    }

    function cancelRequest() public {
        if (auctionRequests[msg.sender].duration == 0) revert NoneRequest();
        string memory _name = auctionRequests[msg.sender].name;
        delete auctionRequests[msg.sender];
        
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Transaction Failed");

        emit RequestCancelled(_name, msg.sender);
    }

    function createAuction(uint256 auctionNumber, address seller) public onlyOwner {
        requestsDetails storage t = auctionRequests[seller];
        if(auctionList[auctionNumber].duration != 0) revert AuctionAlreadyExists();
        if (seller == address(0)) revert ZeroAddress();
        if (t.startingPrice == 0) revert InvalidRequest();

        auctionList[auctionNumber] = Details ({
            name: t.name,
            seller: seller,
            startingPrice: t.startingPrice,
            duration: block.timestamp + t.duration,
            high: 0,
            highBidder: address(0),
            status: true,
            purchased: false,
            withdrawn: false
        });

        emit AuctionCreated(seller, auctionNumber, t.startingPrice, t.duration);

        delete auctionRequests[seller];

        ownerWithdrawal();
    }

    function bid(uint256 auctionNumber, uint256 bidAmount) public 
    auctionCheck(auctionNumber) 
    checkActive(auctionNumber) {
        uint256 _high = auctionList[auctionNumber].high;
        if(_high == 0) {
            if (bidAmount <= auctionList[auctionNumber].startingPrice) revert LowerThanStartingPrice();
        } else {
            if(bidAmount <= auctionList[auctionNumber].high) revert BidTooLow();
        }

        auctionList[auctionNumber].high = bidAmount;
        auctionList[auctionNumber].highBidder = msg.sender;

        emit Bids(msg.sender, auctionNumber, bidAmount);
    }

    function cancelAuction(uint256 auctionNumber) public 
    onlyOwner 
    auctionCheck(auctionNumber) 
    checkActive(auctionNumber) {
        auctionList[auctionNumber].status = false;

        emit AuctionCancelled(auctionNumber);
    }


    function checkAuctionActive(uint256 auctionNumber) public view returns (bool) {
        return auctionList[auctionNumber].duration > block.timestamp && auctionList[auctionNumber].status;
    }

    function timeLeft(uint256 auctionNumber) public view 
    auctionCheck(auctionNumber) 
    returns (uint256) {
        if(auctionList[auctionNumber].duration <= block.timestamp) revert AuctionEnded();
        return auctionList[auctionNumber].duration - block.timestamp;
    }

    function checkHighestBidder(uint256 auctionNumber) public view
    auctionCheck(auctionNumber) 
    returns (address) {
        if(auctionList[auctionNumber].duration == 0 || !auctionList[auctionNumber].status) {
            return address(0);
        }
        return auctionList[auctionNumber].highBidder;
    }

    function checkActiveBidPrice(uint256 auctionNumber) public view 
    auctionCheck(auctionNumber) 
    checkActive(auctionNumber) 
    returns (uint256) {
        return auctionList[auctionNumber].high;
    }

    function announceResults(uint256 auctionNumber) public
    auctionCheck(auctionNumber)
    checkInActive(auctionNumber)
    returns(address) {
        address _winner = auctionList[auctionNumber].highBidder;
        if (_winner == address(0)) revert NoBidders();
        emit ResultsAnnounced(auctionNumber, _winner);

        return _winner;
    }

    function completeTransaction(uint256 auctionNumber) public payable
    auctionCheck(auctionNumber) 
    checkInActive(auctionNumber) {
        if (auctionList[auctionNumber].purchased) revert AlreadyPurchased();
        address _winner = auctionList[auctionNumber].highBidder;
        if (_winner == address(0)) revert NoBidders();
        if (_winner != msg.sender) revert YouAreNotTheWinner();
        uint256 _bidAmount = auctionList[auctionNumber].high;
        if (msg.value != _bidAmount) revert WrongAmount();
        auctionList[auctionNumber].purchased = true;

        emit Purchased(auctionNumber, _winner, _bidAmount);
    }

    function sellerWithdrawal(uint256 auctionNumber) public 
    auctionCheck(auctionNumber) 
    checkInActive(auctionNumber) {
        if (auctionList[auctionNumber].seller != msg.sender) revert YouAreNotTheSeller();
        if (!auctionList[auctionNumber].purchased) revert NotPurchased();
        if (auctionList[auctionNumber].withdrawn) revert AlreadyWithdrawn();
        auctionList[auctionNumber].withdrawn = true;
        uint256 amount = auctionList[auctionNumber].high;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transaction Failed");

        emit Withdrawn(msg.sender, auctionNumber, amount);
    }

    function ownerWithdrawal() public onlyOwner{
        (bool success, ) = owner.call{value: fees}("");
        require(success, "Transaction Failed");
    }
}