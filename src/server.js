require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const db = require("./db");
const { DRIVER_TERMS, ZONE_AREA_LABELS } = require("./finance");
const { rupiah, serviceLabel, orderStatusLabel, orderStatusColor, expenseCategoryLabel, todayISO, orderEditable, sectionFor, whatsAppConfirmLink, driverTaskLink, staffCheckLink, driverWhatsAppLink, staffWhatsAppLink } = require("./helpers");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const customerRoutes = require("./routes/customer");
const orderRoutes = require("./routes/orders");
const bookingRoutes = require("./routes/booking");
const driverRoutes = require("./routes/driver");
const staffRoutes = require("./routes/staff");
const { LANGUAGES, translate, resolveLang } = require("./i18n");
const { trackVisitor } = require("./middleware/traffic");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from correct location (support Railway volume)
const publicDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "public")
  : path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "rental-core-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 },
  })
);

app.get("/bahasa/:code", (req, res) => {
  const code = resolveLang(req.params.code);
  if (LANGUAGES.some((item) => item.code === String(req.params.code || "").toLowerCase())) {
    req.session.lang = code;
  }
  const referer = req.get("referer") || "/";
  let nextUrl = "/";
  try {
    const parsed = new URL(referer, "http://localhost");
    nextUrl = `${parsed.pathname}${parsed.search}`;
  } catch (error) {
    nextUrl = "/";
  }
  if (!nextUrl.startsWith("/") || nextUrl.startsWith("//") || nextUrl.startsWith("/bahasa")) {
    nextUrl = "/";
  }
  res.redirect(nextUrl);
});

app.use((req, res, next) => {
  const lang = resolveLang(req.session.lang);
  req.lang = lang;
  req.t = (key) => translate(lang, key);
  res.locals.lang = lang;
  res.locals.languages = LANGUAGES;
  res.locals.t = req.t;
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  res.locals.rupiah = rupiah;
  res.locals.serviceLabel = serviceLabel;
  res.locals.orderStatusLabel = orderStatusLabel;
  res.locals.expenseCategoryLabel = expenseCategoryLabel;
  res.locals.orderEditable = orderEditable;
  res.locals.whatsAppConfirmLink = whatsAppConfirmLink;
  res.locals.driverTaskLink = driverTaskLink;
  res.locals.staffCheckLink = staffCheckLink;
  res.locals.driverWhatsAppLink = driverWhatsAppLink;
  res.locals.staffWhatsAppLink = staffWhatsAppLink;
  res.locals.orderStatusColor = orderStatusColor;
  const pricing = db.getPricingSettings();
  res.locals.pricing = pricing;
  res.locals.tourPackages = pricing.tours;
  res.locals.airportBase = pricing.airportBase;
  res.locals.brand = db.APP_NAME;
  res.locals.brandShort = "Jalanin";
  const settings = db.getCompanySettings();
  res.locals.company = settings;
  res.locals.bankAccounts = db.getBankAccounts();
  res.locals.paymentMethods = db.getPaymentMethods().filter((item) => item.active);
  res.locals.zoneTariffs = db.getZoneTariffs();
  res.locals.ratings = db.ratingSummary();
  res.locals.driverAddons = pricing.addons;
  res.locals.driverDailyFee = pricing.driverDailyFee;
  res.locals.areaMultiplier = pricing.areaMultiplier;
  res.locals.driverTerms = DRIVER_TERMS;
  res.locals.zoneAreaLabels = ZONE_AREA_LABELS;
  const pathName = req.path || "/";
  if (!pathName.includes(".") && !pathName.startsWith("/api") && !pathName.startsWith("/uploads")) {
    const current = sectionFor(pathName);
    const last = req.session.currentSection;
    if (!last || last.href !== current.href) {
      req.session.previousSection = last || { href: "/", label: "Beranda" };
      req.session.currentSection = current;
    }
    res.locals.currentSection = current;
    res.locals.previousSection = req.session.previousSection || { href: "/", label: "Beranda" };
  }
  delete req.session.flash;
  next();
});

app.use(trackVisitor);

app.get("/", (req, res) => {
  res.render("home", {
    title: "Beranda",
    vehicles: db.getVehicles().filter((vehicle) => vehicle.status === "available"),
    testimonials: db.getTestimonials(),
    reviewCards: db.publicReviewCards(),
    today: todayISO(),
  });
});

app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use(orderRoutes);
app.use(bookingRoutes);
app.use(customerRoutes);
app.use(driverRoutes);
app.use(staffRoutes);

app.use((req, res) => {
  res.status(404).render("not-found", { title: "Halaman tidak ditemukan" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).send(err.message || "Terjadi kesalahan server.");
});

async function start() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

start();
