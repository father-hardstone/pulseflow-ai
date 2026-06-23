const { createApp } = require("../src/app");

// Vercel Node Function handler.
// Express apps can be used directly by calling app(req, res).
module.exports = (req, res) => {
  const app = createApp();
  return app(req, res);
};

