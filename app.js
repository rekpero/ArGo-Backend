var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var usersRouter = require("./routes/users");
var fs = require("fs");
var cors = require("cors");
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

  const code2 = await installPackages(userFolderPath, logsEmitter);
  if (fs.existsSync(`${userFolderPath}/build`)) {
    const code3 = await executeDeploy(userFolderPath, logsEmitter);
    res.json({ deployed: true });
  } else {
    const code4 = await executeBuild(userFolderPath, logsEmitter).catch(
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
      callbackFn(`${code}`);
      resolve(0);
      console.log(`child process exited with code ${code}`);
    });
  });
}

function createPullRequest(branchName, path, callbackFn) {
  return new Promise((resolve, reject) => {
    console.log(branchName);
    const gitClone = spawn("git", ["-C", path, `pull origin ${branchName}`]);

    gitClone.stdout.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    gitClone.stderr.on("data", (data) => {
      callbackFn(`${data}`);
      console.log(`${data}`);
    });

    gitClone.on("error", (error) => {
      {
        callbackFn;
      }
      `${error.message}`;
      reject(2);
      console.log(`error: ${error.message}`);
    });

    gitClone.on("close", (code) => {
      callbackFn(`${code}`);
      resolve(0);
      console.log(`child process exited with code ${code}`);
    });
  });
}

function installPackages(path, callbackFn) {
  return new Promise((resolve, reject) => {
    console.log("Installing", path);

    const buildAppSpawn = spawn("npm", ["install", "-C", path]);

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
      callbackFn(`${code}`);
      resolve(`${code}`);
      console.log(`child process exited with code ${code}`);
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

function executeBuild(path, callbackFn) {
  return new Promise((resolve, reject) => {
    var packageJson = fs.readFileSync(`${path}/package.json`);
    const packageJsonModified = JSON.stringify({
      ...JSON.parse(`${packageJson}`),
      homepage: "./",
    });
    fs.writeFileSync(`${path}/package.json`, packageJsonModified);
    const arweaveCom = spawn("npm", ["run", "build", "-C", path, "build"]);

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
      callbackFn(`${code}`);
      resolve(`${code}`);
      console.log(`child process exited with code ${code}`);
    });
  });
}

function executeDeploy(path, callbackFn) {
  return new Promise((resolve, reject) => {
    const buildPath = `${path}/build`;
    const arweaveCom = spawn("webdapparweave/arweave", [
      "deploy-dir",
      buildPath,
      "--key-file",
      "./arweavesecrets/arweave-keyfile-jeNnvxnU0qguF-xj3k1hMYlSHgEOMAxtpeYBwKy1r9k.json",
    ]);

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
      callbackFn(`${code}`);
      resolve(`${code}`);
      console.log(`child process exited with code ${code}`);
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
