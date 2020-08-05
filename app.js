var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var usersRouter = require("./routes/users");
var fs = require("fs");
var cors = require("cors");
var moment = require("moment");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
app.use(express.static(__dirname + "/node_modules"));
const { spawn } = require("child_process");

const directoryFullLatestCode = process.cwd() + "/latestCode";

var port = process.env.PORT || 5000;

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", function (req, res, next) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/deploy", function (req, res, next) {
  // executeDeploy();
  res.sendFile(__dirname + "/index.html");
});
app.get("/clone", function (req, res, next) {
  res.sendFile(__dirname + "/index.html");
});

app.post("/clone", async function (req, res, next) {
  const splitUrl = req.body.url.split("/");
  const folderName = splitUrl[splitUrl.length - 1].split(".")[0];
  console.log(folderName);

  var userFolderPath = `${directoryFullLatestCode}/${folderName}`;
  const logsEmitter = logsEmitterFn(req.body.topic);
  const cloneStatus = await createClone(
    req.body.url,
    req.body.branch,
    logsEmitter
  ).catch((err) => {
    console.log(err);
    io.emit(eq.body.topic, err);
  });

  const code2 = await installPackages(userFolderPath, logsEmitter,req.body.packageManager);
  if (fs.existsSync(`${userFolderPath}/build`)) {
    const code3 = await executeDeploy(userFolderPath, logsEmitter);
    res.json({ deployed: true });
  } else {
    const code4 = await executeBuild(userFolderPath, logsEmitter,req.body.buildCommand, req.body.packageManager).catch(
      (err) => {
        console.log(err);
        io.emit(req.body.topic, err);
      }
    );

    const code5 = await executeDeploy(userFolderPath, logsEmitter).catch(
      async (err) => {
        console.log(err);
        io.emit(req.body.topic, err);
        await executeDeploy(userFolderPath, logsEmitter).catch((err) => {
          console.log(err);
          io.emit(
            req.body.topic,
            "Second Attempt also failed. Please check your network connection or try again later"
          );
          res.json({ deployed: false });
        });
      }
    );
    res.json({ deployed: true });
  }
});

const logsEmitterFn = (topic) => {
  return (data) => {
    io.emit(topic, `${data}`);
  };
};
function createClone(url, branch, callbackFn) {
  return new Promise((resolve, reject) => {
    createDir();
    let gitClone;
    
    callbackFn("Clone started at " + moment().format("hh:mm:ss A MM-DD-YYYY"));

    if (branch != "master") {
      console.log(`I am pulling ${branch}`);
      gitClone = spawn("git", [
        "-C",
        directoryFullLatestCode,
        "clone",
        "--branch",
        branch,
        url,
      ]);
    } else {
      console.log(`I am pulling master`);
      gitClone = spawn("git", ["-C", directoryFullLatestCode, "clone", url]);
    }

    gitClone.stdout.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    gitClone.stderr.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    gitClone.on("error", (error) => {
      callbackFn(`${error.message}`);
      reject(2);
      console.log(`error: ${error.message}`);
    });

    gitClone.on("close", (code) => {
      if(`${code}` == 0)
      {
        callbackFn("Clone completed at " + moment().format("hh:mm:ss A MM-DD-YYYY"))
        resolve(`${code}`);
      }
      else
      {
        console.log(`child process exited with code ${code}`);
        callbackFn("Error in cloning repository");
        resolve("Error in cloning repository");
      }
    });
  });
}

function installPackages(path, callbackFn,packageManager) {
  return new Promise((resolve, reject) => {
    callbackFn("Package Installation started");

    let buildAppSpawn;
    callbackFn("Package Installation started at " + moment().format("hh:mm:ss A MM-DD-YYYY"));
    if(packageManager == 'npm')
    {
      buildAppSpawn = spawn(packageManager, ["install", "-C", path]);
    }
    if (packageManager == 'yarn')
    {
      buildAppSpawn = spawn(packageManager, ["--cwd", path]);
    }
    
    buildAppSpawn.stdout.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    buildAppSpawn.stderr.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    buildAppSpawn.on("error", (error) => {
      callbackFn(`${error.message}`);
      console.log(`error: ${error.message}`);
    });

    buildAppSpawn.on("close", (code) => {
      if(`${code}` == 0)
      {
        callbackFn("Package Installation completed at " + moment().format("hh:mm:ss A MM-DD-YYYY"));
        resolve(`${code}`);
      }
      else
      {
        console.log(`child process exited with code ${code}`);
        callbackFn("Error installing packages");
        resolve("Error installing packages");
      }
    });
  });
}

function createDir(path, callbackFn) {
  try {
    var dir = __dirname + "/latestCode";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, 0744);
    }
  } catch (err) {
    console.log("i", err.message);
  }
}

function executeBuild(path,callbackFn,buildCommand, packageManager) {
  return new Promise((resolve, reject) => {
    callbackFn("Build started at " + moment().format("hh:mm:ss A MM-DD-YYYY"));
    var packageJson = fs.readFileSync(`${path}/package.json`);
    const packageJsonModified = JSON.stringify({
      ...JSON.parse(`${packageJson}`),
      homepage: "./",
    });
    fs.writeFileSync(`${path}/package.json`, packageJsonModified);
    let arweaveCom;

    let build = buildCommand.split(' ')

    if(packageManager === 'npm')
    {
       arweaveCom = spawn(build[0], ["run", "-C", path, build[build.length-1]]);
    }
    else if(packageManager === 'yarn') {
       arweaveCom = spawn(build[0], ['--cwd',path,  build[build.length-1]]);
    }
    arweaveCom.stdout.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    arweaveCom.stderr.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    arweaveCom.on("error", (error) => {
      callbackFn(`${error.message}`);
      reject("Error in processing the file");
      console.log(`error: ${error.message}`);
    });

    arweaveCom.on("close", (code) => {
      if(`${code}` == 0)
      {
        callbackFn("Build completed at " + moment().format("hh:mm:ss A MM-DD-YYYY"));
        resolve(`${code}`);
      }
      else
      {
        console.log(`child process exited with code ${code}`);
        callbackFn("Build error");
        resolve("Error in building application");
      }
    });
  });
}

function executeDeploy(path, callbackFn) {
  return new Promise((resolve, reject) => {
    callbackFn("Deploy started at " + moment().format("hh:mm:ss A MM-DD-YYYY"));
    const buildPath = `${path}/build`;
    const arweaveCom = spawn("webdapparweave/arweave", [
      "deploy-dir",
      buildPath,
      "--key-file",
      "./arweavesecrets/arweave-keyfile-mglUufXx6iyx4xRmzXyXJlgr_B6oBWCPhpTqXymDrvA.json",
    ]);

    callbackFn("Arweave Deployment Started... Your site will be live soon");

    arweaveCom.stdout.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`stdout: ${data}`);
    });

    arweaveCom.stderr.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    arweaveCom.on("error", (error) => {
      callbackFn(`${error.message}`);
      reject("Error in deploying to arweave. Attrmpting redeployment");
      console.log(`error: ${error.message}`);
    });

    arweaveCom.on("close", (code) => {
      if(`${code}` == 0)
      {
        callbackFn("Deployed at " + moment().format("hh:mm:ss A MM-DD-YYYY"));
        resolve(`${code}`);
      }
      else
      {
        console.log(`child process exited with code ${code}`);
        callbackFn("Deployment error");
        callbackFn("Error in deploying to arweave network. Please retry deployment");
        resolve("Error in deploying to arweave network. Please retry deployment");
      }
      
    });
  });
}

//app.use('/deploy', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send("error");
});
io.on("connection", function (socket) {
  console.log("connected with the client");
});
http.listen(port);
console.log("Magic happens on port " + port);
module.exports = app;
