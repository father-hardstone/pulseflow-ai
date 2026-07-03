const { createApp } = require("../src/app");

// Vercel serverless function entry — Express app as (req, res) handler.
module.exports = (req, res) => {
  const app = createApp();
  return app(req, res);
};
