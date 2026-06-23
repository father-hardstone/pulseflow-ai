const config = require("./config");
const { createApp } = require("./app");
const { bootstrapFirstAdmin } = require("./services/adminAuthService");

const app = createApp();

bootstrapFirstAdmin().catch((err) => {
  // eslint-disable-next-line no-console
  console.warn(`[admin] bootstrap skipped: ${err.message}`);
});

app.listen(config.port, () => {
  console.log(`server listening on http://localhost:${config.port}`);
});

