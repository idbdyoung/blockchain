const sha256 = require("sha256");

function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];
  this.createNewBlock(100, "0", "0");
}

Blockchain.prototype.createNewBlock = function (nounce, previousBlockHash, hash) {
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nounce,
    previousBlockHash,
    hash,
  };
  this.pendingTransactions = [];
  this.chain.push(newBlock);

  return newBlock;
};

Blockchain.prototype.getLastBlock = function () {
  return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = function (amount, sender, recipient) {
  const newTransaction = {
    amount,
    sender,
    recipient,
  };
  this.pendingTransactions.push(newTransaction);

  return this.getLastBlock()["index"] + 1;
};

Blockchain.prototype.hashBlock = function (previousBlockHash, nounce, currentBlockData) {
  const dataAsString = previousBlockHash + nounce.toString() + JSON.stringify(currentBlockData);
  const hash = sha256(dataAsString);

  return hash;
};

Blockchain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
  let nounce = 0;
  let hash = this.hashBlock(previousBlockHash, nounce, currentBlockData);

  while (hash.substring(0, 4) !== "0000") {
    nounce++;
    hash = this.hashBlock(previousBlockHash, nounce, currentBlockData);
  }

  return nounce;
};

module.exports = Blockchain;
