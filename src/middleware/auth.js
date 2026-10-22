const BOOKING_LOGIN_MESSAGE = "Silakan daftar akun terlebih dahulu dengan email dan nomor WhatsApp untuk melakukan pemesanan.";

function requireBookingLogin(req, res, next) {
  if (req.session.user) {
    return next();
  }
  const target = req.originalUrl && req.method === "GET" ? req.originalUrl : "/checkout";
  if (target.startsWith("/") && !target.startsWith("//")) {
    req.session.returnTo = target;
  }
  req.session.flash = { type: "error", message: BOOKING_LOGIN_MESSAGE };
  return res.redirect("/daftar");
}

function requireFleetSearch(req, res, next) {
  const searching = ["city", "type", "startDate", "endDate"].some((key) =>
    Object.prototype.hasOwnProperty.call(req.query, key)
  );
  if (!searching) {
    return next();
  }
  return requireBookingLogin(req, res, next);
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.flash = {
      type: "error",
      message: "Silakan login terlebih dahulu.",
    };
    return res.redirect("/login");
  }
  next();
}

function requireRole(role) {
  return function roleGuard(req, res, next) {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    if (req.session.user.role !== role) {
      req.session.flash = {
        type: "error",
        message: "Anda tidak punya akses ke halaman itu.",
      };
      if (req.session.user.role === "admin") {
        return res.redirect("/admin");
      }
      return res.redirect("/");
    }
    next();
  };
}

function redirectIfLoggedIn(req, res, next) {
  if (!req.session.user) {
    return next();
  }
  if (req.session.user.role === "admin") {
    return res.redirect("/admin");
  }
  return res.redirect("/");
}

module.exports = {
  requireLogin,
  requireBookingLogin,
  requireFleetSearch,
  requireRole,
  redirectIfLoggedIn,
  BOOKING_LOGIN_MESSAGE,
};
