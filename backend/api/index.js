const createApp = require("../src/createApp");

const app = createApp();

// Vercel Node Function handler.
module.exports = (req, res) => app(req, res);
