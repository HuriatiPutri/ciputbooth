/**
 * Global 404 handler for API routes
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

/**
 * Global centralized error handling middleware
 */
export function errorHandler(err, req, res, next) {
  if (!err.statusCode || err.statusCode >= 500) console.error('[API Error]:', err);

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
}
