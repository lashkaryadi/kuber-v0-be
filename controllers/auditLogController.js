import AuditLog from "../models/auditLogModel.js";
import { generateExcel } from "../utils/excel.js";

export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      inventoryId,
    } = req.query;

    const query = {};

    if (action) {
      query.action = action;
    }

    if (inventoryId) {
      query.entityId = inventoryId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("performedBy", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    });
  }
};

export const exportAuditLogs = async (req, res) => {
  const logs = await AuditLog.find()
    .populate("performedBy", "username email")
    .sort({ createdAt: -1 });

  const data = logs.map((log) => ({
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId.toString(),
    performedBy: log.performedBy?.email || "-",
    createdAt: log.createdAt,
  }));

  const file = generateExcel(data);

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=audit-logs.xlsx"
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.send(file);
};
