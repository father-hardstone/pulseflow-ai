/**
 * Local development only. Production entry is api/index.js (serverless).
 */
const config = require("../src/config");
const createApp = require("../src/createExpressApp");
const { bootstrapFirstAdmin } = require("../src/services/adminAuthService");

const app = createApp();

bootstrapFirstAdmin().catch((err) => {
  // eslint-disable-next-line no-console
  console.warn(`[admin] bootstrap skipped: ${err.message}`);
});

app.listen(config.port, () => {
  console.log(`server listening on http://localhost:${config.port}`);
});
