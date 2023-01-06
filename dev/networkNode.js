import express from "express";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";

import Blockchain from "./blockchain.js";

const app = express();
const PORT = process.argv[2];

const bitcoin = new Blockchain();
const nodeAddress = uuid().split("-").join();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/blockchain", function (req, res) {
  return res.send(bitcoin);
});

app.post("/transaction", function (req, res) {
  const newTransaction = req.body;
  const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);

  return res.json({ note: `Transaction will be added in block ${blockIndex}✔️` });
});

app.post("/transaction/broadcast", function (req, res) {
  const { amount, sender, recipient } = req.body;
  const newTransaction = bitcoin.createNewTransaction(amount, sender, recipient);
  bitcoin.addTransactionToPendingTransactions(newTransaction);

  const regTransactionPromises = [];
  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const promise = fetch(networkNodeUrl + "/transaction", getFetchPostOption(newTransaction));
    regTransactionPromises.push(promise);
  });

  return Promise.all(regTransactionPromises).then(() => {
    res.json({ note: "Tx created and broadcast successfully✔️" });
  });
});

app.get("/mine", function (req, res) {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock.hash;
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock["index"] + 1,
  };
  console.log(currentBlockData);
  const nounce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(previousBlockHash, nounce, currentBlockData);
  const newBlock = bitcoin.createNewBlock(nounce, previousBlockHash, blockHash);

  const regBlockPromises = [];
  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const promise = fetch(networkNodeUrl + "/receive-new-block", getFetchPostOption(newBlock));
    regBlockPromises.push(promise);
  });

  return Promise.all(regBlockPromises).then(() => {
    fetch(bitcoin.currentNodeUrl + "/transaction/broadcast", {
      amount: 12.5,
      sender: "00",
      nodeAddress,
    }).then(() => {
      return res.json({
        note: "New block mined succesfully",
        block: newBlock,
      });
    });
  });
});

app.post("/receive-new-block", function (req, res) {
  const newBlock = req.body;
  const lastBlock = bitcoin.getLastBlock();
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock["index"] + 1 === newBlock["index"];

  if (!correctHash || !correctIndex) {
    return res.json({ note: "New Block rejected", newBlock });
  }
  bitcoin.chain.push(newBlock);
  bitcoin.pendingTransactions = [];

  return res.json({ note: "New Block received an accepted", newBlock });
});

app.post("/register-and-broadcast-node", function (req, res) {
  const { newNodeUrl } = req.body;

  if (bitcoin.networkNodes.indexOf(newNodeUrl) === -1) {
    const regNodesPromises = [];

    bitcoin.networkNodes.push(newNodeUrl);
    bitcoin.networkNodes.forEach((networkNodeUrl) => {
      const promise = fetch(
        networkNodeUrl + "/register-node",
        getFetchPostOption({ newNodeUrl })
      ).catch(() => `${newNodeUrl} 연결 실패`);
      regNodesPromises.push(promise);
    });

    return Promise.all(regNodesPromises)
      .then(() => {
        fetch(
          newNodeUrl + "/register-nodes-bulk",
          getFetchPostOption({
            allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl],
          })
        ).then(() => {
          return res.json({ note: "New Node registerd network sucessfully✔️" });
        });
      })
      .catch(() => {});
  }

  return res.json({ note: "New Node registered failed❌" });
});

app.post("/register-node", function (req, res) {
  const { newNodeUrl } = req.body;
  const isNodeAlreadyExist = bitcoin.networkNodes.indexOf(newNodeUrl) !== -1;
  const isCurentNode = bitcoin.currentNodeUrl === newNodeUrl;

  if (!isNodeAlreadyExist && !isCurentNode) {
    bitcoin.networkNodes.push(newNodeUrl);

    return res.json({ note: "New node registered successfully✔️" });
  }

  return res.json({ note: "New Node registered failed❌" });
});

app.post("/register-nodes-bulk", function (req, res) {
  const { allNetworkNodes } = req.body;

  allNetworkNodes.forEach((networkNodeUrl) => {
    const isNodeAlreadyExist = bitcoin.networkNodes.indexOf(networkNodeUrl) !== -1;
    const isCurentNode = bitcoin.currentNodeUrl === networkNodeUrl;

    if (!isNodeAlreadyExist && !isCurentNode) {
      bitcoin.networkNodes.push(networkNodeUrl);
    }
  });

  return res.json({ note: "Bulk registration successfully✔️" });
});

app.get("/consensus", function (req, res) {
  const promises = [];

  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const promise = fetch(networkNodeUrl + "/blockchain", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }).then((res) => res.json());
    promises.push(promise);
  });
  Promise.all(promises).then((blockchains) => {
    const currentChainLength = bitcoin.chain.length;
    let maxChainLength = currentChainLength;
    let newLongestChain = null;
    let newPendingTransaction = null;

    blockchains.forEach((blockchain) => {
      if (blockchain.chain.length > maxChainLength) {
        maxChainLength = blockchain.chain.length;
        newLongestChain = blockchain.chain;
        newPendingTransaction = blockchain.pendingTransactions;
      }
    });

    if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
      return res.json({
        note: "Current chain has not beean replaced❌",
        chain: bitcoin.chain,
      });
    }
    bitcoin.chain = newLongestChain;
    bitcoin.pendingTransactions = newPendingTransaction;

    return res.json({
      note: "This chain has been replaced✔️",
    });
  });
});

app.listen(PORT, function () {
  console.log(`listening on port: ${PORT}`);
});

const getFetchPostOption = (body) => ({
  method: "post",
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});
