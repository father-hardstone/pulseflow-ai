const { errorToResponse } = require("../helpers/errors");

function errorMiddleware(err, _req, res, _next) {
  const { status, payload } = errorToResponse(err);
  res.status(status).json(payload);
}

module.exports = { errorMiddleware };

