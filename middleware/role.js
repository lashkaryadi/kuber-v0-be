/**
 * Role-based access control middleware
 */

export const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.'
    });
  }

  next();
};