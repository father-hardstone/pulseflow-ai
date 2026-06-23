function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details !== undefined) err.details = details;
  return err;
}

function errorToResponse(err) {
  const status = Number(err?.status) || 500;
  const payload = { ok: false, error: err?.message || String(err) };
  if (err?.details !== undefined) payload.details = err.details;
  if (err?.code) payload.code = err.code;
  return { status, payload };
}

module.exports = { httpError, errorToResponse };

