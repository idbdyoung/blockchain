import Blockchain from "./blockchain.js";

const bitcoin = new Blockchain();

const ch1 = {
  chain: [
    {
      index: 1,
      timestamp: 1672966225377,
      transactions: [],
      nounce: 100,
      previousBlockHash: "0",
      hash: "0",
    },
    {
      index: 2,
      timestamp: 1672966229063,
      transactions: [],
      nounce: 18140,
      previousBlockHash: "0",
      hash: "0000b9135b054d1131392c9eb9d03b0111d4b516824a03c35639e12858912100",
    },
  ],
  pendingTransactions: [],
  currentNodeUrl: "http://localhost:4000",
  networkNodes: [],
};

console.log(bitcoin.chainIsValid(ch1.chain));
