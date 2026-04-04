function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const details = error.details || null;
  res.status(statusCode).json({
    message: error.message || "Internal Server Error",
    details,
    errors: details?.errors || null
  });
}

module.exports = { notFoundHandler, errorHandler };
