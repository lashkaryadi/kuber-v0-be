export function notFound(req, res, next) {
  res.status(404).json({ message: 'Endpoint not found' });
}
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
  });
};
