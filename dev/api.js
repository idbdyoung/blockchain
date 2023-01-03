const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { v4: uuid } = require("uuid");

const Blockchain = require("./blockchain");
const bitcoin = new Blockchain();

const PORT = 3000;

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

app.listen(PORT, function () {
  console.log(`listening on port: ${PORT}`);
});
