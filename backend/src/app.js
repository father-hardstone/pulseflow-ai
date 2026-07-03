const express = require("express");
const cors = require("cors");

const config = require("./config");
const { router } = require("./routes");
const { errorMiddleware } = require("./middlewares/errorMiddleware");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins || true, // true => reflect request origin
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (req, res) => {
    res.status(200).json({
      ok: true,
      service: "PulseFlow AI API",
      docs: {
        health: "GET /api/health",
        stats: "GET /api/stats",
        knowledge: "GET|POST /api/knowledge, POST /api/knowledge/stream/upload, DELETE /api/knowledge/:id",
        campaigns: "POST /api/campaigns",
        leads: "GET /api/leads, POST /api/leads/:id/generate, POST /api/leads/generate-all",
      },
    });
  });
  app.get("/favicon.ico", (req, res) => res.status(204).end());

  app.use(router);
  app.use(errorMiddleware);
  return app;
}

function handler(req, res) {
  const app = createApp();
  return app(req, res);
}

module.exports = handler;
module.exports.createApp = createApp;
