const db = require("../db");

function pageVisited(pathName) {
  if (pathName.startsWith("/voucher/")) {
    return "/voucher";
  }
  if (pathName.startsWith("/pesanan/")) {
    return "/pesanan";
  }
  return pathName || "/";
}

function trackVisitor(req, res, next) {
  if (req.method !== "GET") {
    return next();
  }
  const pathName = req.path || "/";
  const isPublicPage =
    pathName === "/" ||
    pathName === "/katalog" ||
    pathName === "/checkout" ||
    pathName === "/login" ||
    pathName === "/daftar" ||
    pathName.startsWith("/voucher/") ||
    pathName === "/pesanan";
  if (!isPublicPage) {
    return next();
  }
  if (!req.session.visitorKey) {
    req.session.visitorKey = req.sessionID;
  }
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  db.recordVisit({
    ip_address: forwarded || req.ip || "",
    session_id: req.session.visitorKey,
    user_agent: String(req.headers["user-agent"] || "").slice(0, 300),
    page_visited: pageVisited(pathName),
    timestamp: new Date().toISOString(),
  });
  next();
}

module.exports = { trackVisitor };
