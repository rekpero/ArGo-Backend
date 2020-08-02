var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var usersRouter = require('./routes/users');
var fs = require('fs');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static(__dirname + '/node_modules'));
const { spawn } = require("child_process");


const directoryFullLatestCode = process.cwd() + '/latestCode'; 

var port = process.env.PORT || 5000;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', function(req, res,next) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/deploy', function (req, res, next) {
  // executeDeploy();
  res.sendFile(__dirname + '/index.html');
});
app.get('/clone', function (req, res, next) {
  // executeDeploy();
  res.sendFile(__dirname + '/index.html');
});

app.post('/clone', function (req, res, next) {
  createClone(req.body.url, (data) => {
    io.emit(req.body.topic, `${data}`);
  }, (absolutePath) => {
    installPackages(absolutePath, (data) => {
      io.emit(req.body.topic, `${data}`);
    }, (absolutePath) => {
      if(fs.existsSync(`${absolutePath}/build`)) {
        executeDeploy(absolutePath, (data) => {
          io.emit(req.body.topic, `${data}`);
        })
      } else {
        executeBuild(absolutePath,(data) => {
          io.emit(req.body.topic, `${data}`);
        }, (absolutePath) => {
          executeDeploy(absolutePath, (data) => {
            io.emit(req.body.topic, `${data}`);
          })
        });
      }
    });
  });
  res.sendFile(__dirname + '/index.html');
});

function createClone(url,callbackFn, callbackFn2) 
{
  createDir();

  const gitClone = spawn('git',['-C',directoryFullLatestCode,'clone',url]);

  const splitUrl =  url.split('/');
  const folderName = splitUrl[splitUrl.length - 1].split('.')[0];
  console.log(folderName);
 
  var userFolderPath =  `${directoryFullLatestCode}/${folderName}`
  gitClone.stdout.on("data", data => {
    callbackFn(`${data}`);
    console.log(`${data}`);
  });
  gitClone.stderr.on("data", data => {
    callbackFn(`${data}`);
    console.log(`${data}`);
  });
  gitClone.on('error', (error) => {
    callbackFn(`${error.message}`);
    console.log(`error: ${error.message}`);
  });
  gitClone.on("close", code => {
    callbackFn(`${code}`);
    callbackFn2(userFolderPath);
    console.log(`child process exited with code ${code}`);
  });

}

function installPackages(path, callbackFn,callbackFn2) 
{
  const buildAppSpawn = spawn('yarn', ['--cwd',path]);
  buildAppSpawn.stdout.on("data", data => {
    callbackFn(`${data}`);
    console.log(`${data}`);
  });
  buildAppSpawn.stderr.on("data", data => {
    callbackFn(`${data}`);
    console.log(`${data}`);
  });
  buildAppSpawn.on('error', (error) => {
    callbackFn(`${error.message}`);
    console.log(`error: ${error.message}`);
  });
  buildAppSpawn.on("close", code => {
    callbackFn(`${code}`);
    callbackFn2(path);
    console.log(`child process exited with code ${code}`);
  });

}

function createDir(path,callbackFn) {
  try
  {
    var dir = __dirname + '/latestCode'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, 0744);
    }
  }
  catch(err) {
    console.log("i", err.message);
  }
 
}

function executeBuild(path,callbackFn, callbackFn2)
{
  var packageJson = fs.readFileSync(`${path}/package.json`);
  const packageJsonModified = JSON.stringify({...JSON.parse(`${packageJson}`), homepage: "./"});
  fs.writeFileSync(`${path}/package.json`, packageJsonModified)
  const arweaveCom = spawn("yarn", ["--cwd", path, "build"]);

  arweaveCom.stdout.on("data", data => {
    callbackFn(`${data}`);
    console.log(`${data}`);
  });
  arweaveCom.stderr.on("data", data => {
    callbackFn(`${data}`);
    console.log(`${data}`);
  });
  arweaveCom.on('error', (error) => {
    callbackFn(`${error.message}`);
    console.log(`error: ${error.message}`);
  });
  arweaveCom.on("close", code => {
    callbackFn(`${code}`);
    callbackFn2(path)
    console.log(`child process exited with code ${code}`);
  });
}

function executeDeploy(path, callbackFn)
{
  const buildPath = `${path}/build`;
  const arweaveCom = spawn("webdapparweave/arweave", ["deploy-dir", buildPath, "--key-file", "./arweavesecrets/arweave-keyfile-mglUufXx6iyx4xRmzXyXJlgr_B6oBWCPhpTqXymDrvA.json"]);

  arweaveCom.stdout.on("data", data => {
    callbackFn(`${data}`);
    console.log(`stdout: ${data}`);
  });

  arweaveCom.stderr.on("data", data => {
    callbackFn(`${data}`);
    console.log(`${data}`);
  });

  arweaveCom.on('error', (error) => {
    callbackFn(`${error.message}`);
    console.log(`error: ${error.message}`);
  });
 
  arweaveCom.on("close", code => {
    callbackFn(`${code}`);
    console.log(`child process exited with code ${code}`);
  });
}


//app.use('/deploy', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send('error');
});
io.on('connection', function(socket){
  console.log("connected with the client");
})
http.listen(port);
console.log('Magic happens on port ' + port);
module.exports = app;
