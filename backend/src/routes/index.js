const express = require("express");

const { health, stats } = require("../controllers/healthController");
const auth = require("../controllers/authController");
const { generateEmail, generateEmailFromApollo } = require("../controllers/emailController");
const {
  listKnowledge,
  createKnowledge,
  createKnowledgeStream,
  createKnowledgeStreamUpload,
  searchKnowledge,
  deleteKnowledge,
} = require("../controllers/knowledgeController");
const {
  listLeads,
  getLead,
  createCampaign,
  generateLeadEmail,
  generateAllEmails,
  clearLeads,
  apolloQuota,
  sendLeadEmail,
} = require("../controllers/campaignController");
const demoEmailCtrl = require("../controllers/demoEmailController");
const worker = require("../controllers/workerController");
const adminAuth = require("../controllers/adminAuthController");
const admin = require("../controllers/adminController");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { knowledgeUpload, handleUploadError } = require("../middlewares/uploadMiddleware");
const { authRequired, workerAuth, adminAuthRequired } = require("../middlewares/authMiddleware");

const router = express.Router();

// ---- Public ----
router.get("/health", health);
router.get("/api/health", health);

// ---- Auth (public) ----
router.post("/api/auth/signup", asyncHandler(auth.signup));
router.post("/api/auth/login", asyncHandler(auth.login));
router.post("/api/auth/refresh", asyncHandler(auth.refresh));
router.post("/api/auth/logout", asyncHandler(auth.logout));
router.get("/api/auth/me", authRequired, asyncHandler(auth.me));
router.patch("/api/auth/me", authRequired, asyncHandler(auth.updateMe));

router.get("/api/demo-email", authRequired, asyncHandler(demoEmailCtrl.getDemoEmail));
router.patch("/api/demo-email", authRequired, asyncHandler(demoEmailCtrl.patchDemoEmail));
router.post("/api/demo-email/recipients", authRequired, asyncHandler(demoEmailCtrl.addRecipient));
router.patch(
  "/api/demo-email/recipients/:id",
  authRequired,
  asyncHandler(demoEmailCtrl.patchRecipient)
);
router.delete(
  "/api/demo-email/recipients/:id",
  authRequired,
  asyncHandler(demoEmailCtrl.removeRecipient)
);

// ---- Admin auth (public login/refresh; private me/create) ----
router.post("/api/admin/auth/login", asyncHandler(adminAuth.login));
router.post("/api/admin/auth/refresh", asyncHandler(adminAuth.refresh));
router.post("/api/admin/auth/logout", adminAuthRequired, asyncHandler(adminAuth.logout));
router.get("/api/admin/auth/me", adminAuthRequired, asyncHandler(adminAuth.me));
router.patch("/api/admin/auth/me", adminAuthRequired, asyncHandler(adminAuth.updateMe));
router.post("/api/admin/auth/change-password", adminAuthRequired, asyncHandler(adminAuth.changePassword));
router.post("/api/admin/auth/admins", adminAuthRequired, asyncHandler(adminAuth.createAdmin));

// ---- Admin controls (admin JWT required) ----
router.get("/api/admin/stats", adminAuthRequired, asyncHandler(admin.stats));
router.get("/api/admin/integrations", adminAuthRequired, asyncHandler(admin.integrations));
router.get("/api/admin/users", adminAuthRequired, asyncHandler(admin.listUsers));
router.get("/api/admin/users/:id", adminAuthRequired, asyncHandler(admin.getUser));
router.patch("/api/admin/users/:id", adminAuthRequired, asyncHandler(admin.patchUser));
router.delete("/api/admin/users/:id", adminAuthRequired, asyncHandler(admin.removeUser));
router.get("/api/admin/knowledge", adminAuthRequired, asyncHandler(admin.listKnowledge));
router.delete("/api/admin/knowledge/:id", adminAuthRequired, asyncHandler(admin.removeKnowledge));
router.get("/api/admin/leads", adminAuthRequired, asyncHandler(admin.listLeads));
router.delete("/api/admin/leads/:id", adminAuthRequired, asyncHandler(admin.removeLead));
router.get("/api/admin/admins", adminAuthRequired, asyncHandler(admin.listAdmins));

// ---- Worker endpoints (n8n -> backend, shared-secret auth) ----
router.post("/api/worker/leads", workerAuth, asyncHandler(worker.ingestLeads));
router.post("/api/worker/generate-outreach", workerAuth, asyncHandler(worker.generateOutreach));

// ---- Private (JWT required) ----
router.get("/api/stats", authRequired, asyncHandler(stats));

router.get("/api/knowledge", authRequired, asyncHandler(listKnowledge));
router.post("/api/knowledge/search", authRequired, asyncHandler(searchKnowledge));
router.post(
  "/api/knowledge/stream/upload",
  authRequired,
  knowledgeUpload,
  handleUploadError,
  asyncHandler(createKnowledgeStreamUpload)
);
router.post("/api/knowledge/stream", authRequired, asyncHandler(createKnowledgeStream));
router.post("/api/knowledge", authRequired, asyncHandler(createKnowledge));
router.delete("/api/knowledge/:id", authRequired, asyncHandler(deleteKnowledge));

router.get("/api/leads", authRequired, asyncHandler(listLeads));
router.get("/api/apollo/quota", authRequired, asyncHandler(apolloQuota));
router.get("/api/leads/:id", authRequired, asyncHandler(getLead));
router.post("/api/campaigns", authRequired, asyncHandler(createCampaign));
router.post("/api/leads/:id/generate", authRequired, asyncHandler(generateLeadEmail));
router.post("/api/leads/:id/send", authRequired, asyncHandler(sendLeadEmail));
router.post("/api/leads/generate-all", authRequired, asyncHandler(generateAllEmails));
router.delete("/api/leads", authRequired, asyncHandler(clearLeads));

// ---- Legacy auxiliary generator (Module F), private ----
router.get("/generate-email", authRequired, asyncHandler(generateEmail));
router.post("/generate-email", authRequired, asyncHandler(generateEmail));
router.get("/generate-email-from-apollo", authRequired, asyncHandler(generateEmailFromApollo));
router.post("/generate-email-from-apollo", authRequired, asyncHandler(generateEmailFromApollo));

module.exports = { router };
