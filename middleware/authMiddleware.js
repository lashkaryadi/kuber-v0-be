import jwt from "jsonwebtoken";
import User from "../models/User.js";
import process from "process";

/* =========================
   PROTECT MIDDLEWARE (Authentication)
========================= */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Attach user and ownerId to request
      req.user = user;
      req.user.ownerId = decoded.ownerId; // Extract ownerId from token

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

/* =========================
   ADMIN ONLY MIDDLEWARE
========================= */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
};

/* =========================
   STAFF RESTRICTIONS MIDDLEWARE
   Staff CANNOT:
   - Edit pieces, weight, purchase code, sale code
   - Create/Edit/Delete categories
   - Delete invoices
   - Edit invoice amounts
   - Delete sold records
   - Change GST data
========================= */
export const restrictStaffFromCriticalFields = (req, res, next) => {
  if (req.user.role === "staff") {
    const restrictedFields = [
      "totalPieces",
      "availablePieces",
      "totalWeight",
      "availableWeight",
      "pieces",
      "weight",
      "purchaseCode",
      "saleCode",
      "shapes", // ✅ NEW: Staff cannot edit shapes
    ];

    const hasRestrictedField = restrictedFields.some(
      (field) => req.body[field] !== undefined
    );

    if (hasRestrictedField) {
      return res.status(403).json({
        success: false,
        message:
          "Staff members cannot edit pieces, weight, purchase code, sale code, or shapes",
      });
    }
  }

  next();
};

/* =========================
   STAFF CANNOT DELETE CATEGORIES
========================= */
export const preventStaffCategoryDeletion = (req, res, next) => {
  if (req.user.role === "staff") {
    return res.status(403).json({
      success: false,
      message: "Staff members cannot delete categories",
    });
  }

  next();
};

/* =========================
   STAFF CANNOT CREATE/EDIT CATEGORIES
========================= */
export const preventStaffCategoryModification = (req, res, next) => {
  if (req.user.role === "staff") {
    return res.status(403).json({
      success: false,
      message: "Staff members cannot create or edit categories",
    });
  }

  next();
};

/* =========================
   PREVENT INVOICE MODIFICATION (ALL ROLES)
   Once an invoice is locked, NO ONE can edit it
========================= */
export const preventInvoiceModification = async (req, res, next) => {
  try {
    const Invoice = (await import("../models/Invoice.js")).default;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.isLocked) {
      return res.status(403).json({
        success: false,
        message: "This invoice is locked and cannot be modified",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking invoice lock status",
    });
  }
};

/* =========================
   PREVENT SOLD RECORD DELETION (STAFF)
========================= */
export const preventStaffSoldDeletion = (req, res, next) => {
  if (req.user.role === "staff") {
    return res.status(403).json({
      success: false,
      message: "Staff members cannot delete sold records",
    });
  }

  next();
};


// import jwt from "jsonwebtoken";

// export const protect = (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     token = req.headers.authorization.split(" ")[1];
//   }

//   if (!token) {
//     return res.status(401).json({ message: "Not authorized, no token" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Token failed" });
//   }
// };

// // 🔐 Admin only
// export const adminOnly = (req, res, next) => {
//   if (req.user.role !== "admin") {
//     return res.status(403).json({ message: "Admin access only" });
//   }
//   next();
// };
