const express = require("express");
const db = require("../db");
const { requireRole } = require("../middleware/auth");
const { rentalDays, todayISO, plusDaysISO } = require("../helpers");

const router = express.Router();

router.get("/katalog", (req, res) => {
  const city = String(req.query.city || "").trim();
  const type = String(req.query.type || "").trim();
  const startDate = req.query.startDate || todayISO();
  const endDate = req.query.endDate || plusDaysISO(3);

  let vehicles = db.getVehicles().filter((vehicle) => vehicle.status === "available");
  if (city) {
    vehicles = vehicles.filter((vehicle) => vehicle.city === city);
  }
  if (type) {
    vehicles = vehicles.filter((vehicle) => vehicle.type === type);
  }

  const cities = [...new Set(db.getVehicles().map((vehicle) => vehicle.city))];

  res.render("customer/catalog", {
    title: "Sewa Mobil",
    vehicles,
    cities,
    filters: { city, type, startDate, endDate },
    canReview: db.customerHasCompletedOrder(req.session.user),
  });
});

router.post("/pesan/:id", requireRole("customer"), (req, res) => {
  const vehicle = db.getVehicleById(req.params.id);
  if (!vehicle || vehicle.status !== "available") {
    req.session.flash = { type: "error", message: "Mobil tidak tersedia." };
    return res.redirect("/katalog");
  }

  const startDate = req.body.startDate || todayISO();
  const endDate = req.body.endDate || plusDaysISO(3);
  const days = rentalDays(startDate, endDate);

  const booking = db.createBooking({
    userId: req.session.user.id,
    customerName: req.session.user.name,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    city: vehicle.city,
    startDate,
    endDate,
    days,
    totalPrice: days * vehicle.pricePerDay,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  });

  db.createOrder({
    serviceType: "rental",
    customerName: req.session.user.name,
    customerEmail: req.session.user.email,
    customerPhone: "",
    userId: req.session.user.id,
    sourceBookingId: booking.id,
    details: {
      rentalType: "Lepas kunci",
      pickupDate: startDate,
      durationDays: days,
      vehicleName: vehicle.name,
      city: vehicle.city,
      endDate,
      totalPrice: days * vehicle.pricePerDay,
    },
  });

  req.session.flash = {
    type: "success",
    message: `Pesanan ${vehicle.name} berhasil dibuat.`,
  };
  res.redirect("/pesanan");
});

router.post("/ulasan", (req, res) => {
  if (!db.customerHasCompletedOrder(req.session.user)) {
    req.session.flash = {
      type: "error",
      message: "Ulasan hanya dapat diberikan setelah Anda menyelesaikan perjalanan bersama kami.",
    };
    return res.redirect("/katalog");
  }
  const category = String(req.body.category || "");
  const nama = String(req.body.nama_customer || req.session.user?.name || "").trim();
  const rating = Number(req.body.rating);
  const feedback = String(req.body.feedback || "").trim();
  const vehicleName = String(req.body.vehicleName || "").trim();
  const allowed = ["kendaraan", "layanan_sopir", "situs_web"];
  if (!allowed.includes(category) || !nama || !feedback || rating < 1 || rating > 5) {
    req.session.flash = { type: "error", message: "Lengkapi nama, bintang 1–5, dan ulasan." };
    return res.redirect("/katalog");
  }
  if (category === "kendaraan" && !vehicleName) {
    req.session.flash = { type: "error", message: "Pilih kendaraan yang diulas." };
    return res.redirect("/katalog");
  }
  db.createReview({ category, nama_customer: nama, rating, feedback, vehicleName });
  req.session.flash = { type: "success", message: "Ulasan tersimpan. Rating katalog sudah diperbarui." };
  res.redirect("/katalog");
});

router.get("/pesanan", requireRole("customer"), (req, res) => {
  res.render("customer/bookings", {
    title: "Pesanan Saya",
    bookings: db.getBookingsByUser(req.session.user.id),
    orders: db.getOrdersByUser(req.session.user.id),
  });
});

module.exports = router;
