const createApp = require("./createApp");

const app = createApp();

function handler(req, res) {
  return app(req, res);
}

module.exports = handler;
