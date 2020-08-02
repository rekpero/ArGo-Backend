var express = require('express');
const { spawn } = require("child_process");
var router = express.Router();


router.get('/', function(req, res, next) {

  const arweaveCom = spawn("./webdapparweave/arweave",["deploy-dir" , "./deploy/build", "--key-file","./arweavesecrets/arweave-keyfile-mglUufXx6iyx4xRmzXyXJlgr_B6oBWCPhpTqXymDrvA.json"]);
  res.send("Deployment is in progress");

  arweaveCom.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
  });

  arweaveCom.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });

  arweaveCom.on('error', (error) => {
    console.log(`error: ${error.message}`);
  });

  arweaveCom.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
 
});

module.exports = router;
