const Arweave = require("arweave/node");
var fs = require("fs");
var path = require("path");
const { and, or, equals } = require("arql-ops");

const APP_NAME = "permadeploy";
const APP_VERSION = "0.0.2";

const arweave = Arweave.init({
  host: "arweave.net", // Hostname or IP address for a Arweave host
  port: 443, // Port
  protocol: "https", // Network protocol http or https
  timeout: 20000, // Network request timeouts in milliseconds
  logging: false, // Enable network request logging
});

const arweaveKeyFilePath = path.resolve(process.cwd() + "/arweavesecrets/");

const arweaveKeyFile = fs
  .readdirSync(arweaveKeyFilePath)
  .filter((file) => file.endsWith(".json"))[0];

const KEY = require(`../arweavesecrets/${arweaveKeyFile}`);

const saveDeployment = async (
  logs,
  address,
  webAddress,
  gitUrl,
  branch,
  buildCommand,
  packageManager,
  buildTime
) => {
  const transaction = await arweave.createTransaction(
    {
      data: JSON.stringify(logs),
    },
    KEY
  );
  console.log(
    address,
    webAddress,
    gitUrl,
    branch,
    buildCommand,
    packageManager,
    buildTime
  );
  transaction.addTag("Content-Type", "application/json");
  transaction.addTag("buildTime", buildTime);
  transaction.addTag("gitUrl", gitUrl);
  transaction.addTag("userAddress", address);
  transaction.addTag("deployedLink", webAddress);
  transaction.addTag("branch", branch);
  transaction.addTag("buildCommand", buildCommand);
  transaction.addTag("packageManager", packageManager);
  transaction.addTag("time", Math.round(new Date().getTime() / 1000));
  transaction.addTag("appName", APP_NAME);
  transaction.addTag("appVersion", APP_VERSION);

  await arweave.transactions.sign(transaction, KEY);
  let status = await arweave.transactions.post(transaction);
  console.log(status, transaction);
  return { status: true };
};

const getData = async (address) => {
  const queryToFetch = and(
    equals("userAddress", address),
    equals("appName", APP_NAME),
    equals("appVersion", APP_VERSION)
  );
  const txIds = await arweave.arql(queryToFetch);
  console.log(txIds);

  let allTransactions = await Promise.all(
    txIds.map(async (id) => {
      console.log(id);
      let tx_row = {};
      const tx_status = await arweave.transactions.getStatus(id);
      console.log(tx_status);
      if (tx_status.confirmed) {
        const tx = await arweave.transactions.get(id);
        tx_row["logs"] = JSON.parse(
          tx.get("data", {
            decode: true,
            string: true,
          })
        );
        tx.get("tags").forEach((tag) => {
          let key = tag.get("name", { decode: true, string: true });
          let value = tag.get("value", { decode: true, string: true });
          if (key !== "appName" || key !== "appVersion") {
            tx_row[key] = value;
          }
        });
        console.log(tx_row);
        return tx_row;
      }
    })
  );
  allTransactions = allTransactions.filter((tx) => tx);
  return allTransactions;
};

module.exports = {
  saveDeployment,
  getData,
};
