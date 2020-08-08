class Logs {
  logs = [];

  addLogs = (log) => {
    this.logs.push(log);
  };

  getLogs = () => {
    return this.logs;
  };
}

module.exports = Logs;
