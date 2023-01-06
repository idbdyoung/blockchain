import sha256 from "sha256";
import { v4 as uuid } from "uuid";

const currentNodeUrl = process.argv[3];

function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];
  this.currentNodeUrl = currentNodeUrl;
  this.networkNodes = [];
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
    transactionId: uuid().split("-").join(),
  };

  return newTransaction;
};

Blockchain.prototype.addTransactionToPendingTransactions = function (transactionObj) {
  this.pendingTransactions.push(transactionObj);

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

Blockchain.prototype.chainIsValid = function (blockchain) {
  let validChain = true;

  //제네시스 블록을 확인
  const genesisBlock = blockchain[0];
  const correctNounce = genesisBlock["nounce"] === 100;
  const correctPreviousBlockHash = genesisBlock["previousBlockHash"] === "0";
  const correctHash = genesisBlock["hash"] === "0";

  if (!correctNounce || !correctPreviousBlockHash || !correctHash) {
    validChain = false;
  }

  //제네시스 블록 이상의 블록들을 확인
  for (let i = 1; i < blockchain.length; i++) {
    const currentBlock = blockchain[i];
    const prevBlock = blockchain[i - 1];
    const blockHash = this.hashBlock(prevBlock["hash"], currentBlock["nounce"], {
      transactions: currentBlock["transactions"],
      index: currentBlock["index"],
    });

    //블록이 작업증명을 통해 등록된 것임을 확인
    if (blockHash.substring(0, 4) !== "0000") {
      validChain = false;
    }

    //블록에 기록된 이전 블록의 해시와 이전 블록의 해시를 비교
    if (currentBlock["previousBlockHash"] !== prevBlock["hash"]) {
      validChain = false;
    }
  }

  return validChain;
};

export default Blockchain;
