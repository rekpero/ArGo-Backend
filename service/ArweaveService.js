const Arweave = require("arweave/node");

const arweave = Arweave.init({
    host: "arweave.net", // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: "https", // Network protocol http or https
    timeout: 20000, // Network request timeouts in milliseconds
    logging: false, // Enable network request logging
});
  
const arweaveKeyFile = fs.readdirSync(__dirname + '/arweavesecrets/').filter(file => file.endsWith('.json'))[0];
console.log(arweaveKeyFile);
const KEY = require(`../arweavesecrets/${arweaveKeyFile}`);


const saveDeployment = (deploymentConfig) => {
    const transaction = await arweave.createTransaction(
      { data: 'his' },
      KEY
    );
    transaction.addTag("type", notary.type);
    transaction.addTag("title", notary.title);
    transaction.addTag("description", notary.description);
    if (notary.type === "text") transaction.addTag("content", notary.content);
    else {
      const documentId = await this.uploadFiles(
        notary.document.buffer,
        notary.document.file.type,
        wallet
      );
      transaction.addTag("document", documentId);
      console.log(documentId);
    }
    transaction.addTag("time", Math.round(new Date().getTime() / 1000));
    transaction.addTag("App-Name", APP_NAME);
    transaction.addTag("App-Version", APP_VERSION);

    await arweave.transactions.sign(transaction, wallet);
    await arweave.transactions.post(transaction);
}

module.exports = {
    saveDeployment
}