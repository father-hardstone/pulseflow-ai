/**
 * Local development only — starts Express with app.listen().
 * Not used on Vercel (production entry is api/index.js).
 */
const config = require("../src/config");
const appModule = require("../src/app");
const { bootstrapFirstAdmin } = require("../src/services/adminAuthService");

const app = appModule.createApp();

bootstrapFirstAdmin().catch((err) => {
  // eslint-disable-next-line no-console
  console.warn(`[admin] bootstrap skipped: ${err.message}`);
});

app.listen(config.port, () => {
  console.log(`server listening on http://localhost:${config.port}`);
});
