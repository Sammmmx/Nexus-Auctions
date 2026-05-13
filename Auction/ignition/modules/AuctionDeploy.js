const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AuctionModuleV5", (m) => {
  const auction = m.contract("Auction");
  return { auction };
});
