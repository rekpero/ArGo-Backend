const Arweave = require("arweave/node");
var fs = require("fs");
var path = require("path");
const { and, or, equals } = require("arql-ops");

const APP_NAME = "permadeploy";
const APP_VERSION = "0.1"


const arweave = Arweave.init({
    host: "arweave.net", // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: "https", // Network protocol http or https
    timeout: 20000, // Network request timeouts in milliseconds
    logging: false, // Enable network request logging
});
  
const arweaveKeyFilePath = path.resolve(process.cwd() + "/arweavesecrets/") 

const arweaveKeyFile = fs.readdirSync(arweaveKeyFilePath).filter(file => file.endsWith('.json'))[0];

const KEY = require(`../arweavesecrets/${arweaveKeyFile}`);


const saveDeployment = async (logs,address,webAddress,gitAddress,buildTime) =>  {
    const transaction = await arweave.createTransaction(
      { 
        data: JSON.stringify(logs)
      },
      KEY
    );
    transaction.addTag("buildTime",buildTime);
    transaction.addTag("gitAddress",gitAddress);
    transaction.addTag("logs",logs);
    transaction.addTag("useraddress",address)
    transaction.addTag("Content-Type", "application/json")
    transaction.addTag("webaddress", webAddress);
    transaction.addTag("time", Math.round(new Date().getTime() / 1000));
    transaction.addTag("App-Name", APP_NAME);
    transaction.addTag("App-Version", APP_VERSION);

    await arweave.transactions.sign(transaction, KEY);
    let status =  await arweave.transactions.post(transaction);
    console.log(status, transaction);
    return { status : true };
}

const getData = async (address) => {
    const queryToFetch = and (
      equals('useraddress',address),
      equals('App-Name',APP_NAME),
      equals('App-Version',APP_VERSION)
    )
    const txIds = await arweave.arql(queryToFetch);
  const transactions = await Promise.all(
    txIds.map(txid => arweave.transactions.get(txid))
  );

  return allTransactions = await Promise.all(
    transactions.map(async (transaction, id) => {
      let tx_row = {}
      tx_row['logs'] = JSON.parse(transaction.get('data', {
        decode: true,
        string: true
      }))
      transaction.get("tags").forEach((tag) => {
        let key = tag.get("name", { decode: true, string: true });
        let value = tag.get("value", { decode: true, string: true });
        tx_row[key] = value;
      });
      console.log(tx_row);
      return tx_row;
    })
  );
}

module.exports = {
    saveDeployment,
    getData
}