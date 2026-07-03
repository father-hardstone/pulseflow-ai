const config = require("./config");
const createApp = require("./createApp");
const { bootstrapFirstAdmin } = require("./services/adminAuthService");

const app = createApp();

bootstrapFirstAdmin().catch((err) => {
  // eslint-disable-next-line no-console
  console.warn(`[admin] bootstrap skipped: ${err.message}`);
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`server listening on http://localhost:${config.port}`);
  });
}

// Vercel experimental backend bundles this file to server.cjs and uses the export.
module.exports = app;
