const createApp = require("../src/createExpressApp");

// Vercel serverless entry — do not add app.listen() here.
module.exports = (req, res) => createApp()(req, res);
