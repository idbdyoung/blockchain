import express from "express";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";

import Blockchain from "./blockchain.js";

const app = express();
const PORT = process.argv[2];

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/blockchain", function (req, res) {
  return res.send(bitcoin);
});

app.post("/transaction", function (req, res) {
  const { amount, sender, recipient } = req.body;
  const blockIndex = bitcoin.createNewTransaction(amount, sender, recipient);

  return res.json({ note: `Transaction will be added in block ${blockIndex}` });
});

app.get("/mine", function (req, res) {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock.hash;
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock + 1,
  };
  const nounce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(previousBlockHash, nounce, currentBlockData);
  const newBlock = bitcoin.createNewBlock(nounce, previousBlockHash, blockHash);

  const nodeAddress = uuid().split("-").join();
  bitcoin.createNewTransaction(12.5, "00", nodeAddress);

  return res.json({
    note: "New block mined succesfully",
    block: newBlock,
  });
});

app.post("/register-and-broadcast-node", function (req, res) {
  const { newNodeUrl } = req.body;

  if (bitcoin.networkNodes.indexOf(newNodeUrl) === -1) {
    const regNodesPromises = [];

    bitcoin.networkNodes.push(newNodeUrl);
    bitcoin.networkNodes.forEach((networkNodeUrl) => {
      const promise = fetch(networkNodeUrl + "/register-node", getFetchPostOption({ newNodeUrl }));
      regNodesPromises.push(promise);
    });

    return Promise.all(regNodesPromises).then(() => {
      fetch(
        newNodeUrl + "/register-nodes-bulk",
        getFetchPostOption({
          allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl],
        })
      ).then(() => {
        return res.json({ note: "New Node registerd network sucessfully✔️" });
      });
    });
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

app.listen(PORT, function () {
  console.log(`listening on port: ${PORT}`);
});

const getFetchPostOption = (body) => ({
  method: "post",
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});
