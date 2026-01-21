export function notFound(req, res, next) {
  res.status(404);
  res.json({ message: 'Endpoint not found' });
}
export function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message);
  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    message: err.message || 'Internal Server Error',
  });
}
