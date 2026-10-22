const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { redirectIfLoggedIn } = require("../middleware/auth");
const { isValidEmail, normalizeWhatsApp } = require("../validation");

const router = express.Router();

router.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login", { title: "Masuk" });
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  const user = db.findUserByEmail(email);

  if (!user) {
    req.session.flash = { type: "error", message: "Email atau kata sandi salah." };
    return res.redirect("/login");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    req.session.flash = { type: "error", message: "Email atau kata sandi salah." };
    return res.redirect("/login");
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
  };

  if (user.role === "admin") {
    delete req.session.returnTo;
    return res.redirect("/admin");
  }
  const nextUrl = req.session.returnTo;
  delete req.session.returnTo;
  if (nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//")) {
    return res.redirect(nextUrl);
  }
  return res.redirect("/katalog");
});

router.get("/daftar", redirectIfLoggedIn, (req, res) => {
  res.render("register", { title: "Daftar" });
});

router.post("/daftar", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  const phone = normalizeWhatsApp(req.body.phone || req.body.whatsapp);

  if (!name || !isValidEmail(email) || password.length < 6) {
    req.session.flash = {
      type: "error",
      message: "Lengkapi nama, email yang valid, dan kata sandi minimal 6 karakter.",
    };
    return res.redirect("/daftar");
  }
  if (!phone) {
    req.session.flash = {
      type: "error",
      message: req.t("error.phone"),
    };
    return res.redirect("/daftar");
  }

  if (db.findUserByEmail(email)) {
    req.session.flash = { type: "error", message: "Email sudah terdaftar. Silakan masuk." };
    return res.redirect("/daftar");
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = db.createUser({
    name,
    email,
    password: hashed,
    role: "customer",
    phone,
  });

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone,
  };
  const nextUrl = req.session.returnTo;
  delete req.session.returnTo;
  if (nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//")) {
    return res.redirect(nextUrl);
  }
  return res.redirect("/katalog");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
