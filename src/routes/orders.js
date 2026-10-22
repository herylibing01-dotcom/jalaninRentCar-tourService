const express = require("express");
const db = require("../db");
const { priceBreakdown } = require("../finance");
const { rentalDays, todayISO, orderEditable } = require("../helpers");
const { validateCheckout } = require("../validation");
const { referenceUpload } = require("../middleware/upload");
const { requireBookingLogin } = require("../middleware/auth");

const router = express.Router();

function wantsJson(req) {
  return Boolean(
    req.is("application/json") ||
      String(req.headers.accept || "").includes("application/json")
  );
}

function finish(req, res, order, message) {
  req.session.lastOrderId = order.id;
  if (wantsJson(req)) {
    return res.status(201).json({ ok: true, order });
  }
  req.session.flash = { type: "success", message };
  return res.redirect(`/voucher/${order.id}`);
}

function reject(req, res, message) {
  if (wantsJson(req)) {
    return res.status(400).json({ ok: false, message });
  }
  req.session.flash = { type: "error", message };
  return res.redirect("/checkout");
}

function checkoutExtras(req, contact) {
  if (req.uploadError) {
    return { error: req.uploadError };
  }
  const checked = validateCheckout({ ...req.body, ...contact });
  if (!checked.ok) {
    return { error: checked.errors[0] };
  }
  const prices = priceBreakdown({
    serviceType: req.serviceType,
    vehicleName: req.body.vehicleName,
    durationDays: req.body.durationDays,
    packageType: req.body.packageType,
    zone: checked.zone,
    vehicles: db.getVehicles(),
  });
  return {
    contact: {
      ...contact,
      customerEmail: checked.email,
      customerPhone: checked.phone,
    },
    details: {
      zone: checked.zone,
      zoneLabel: checked.zone === "luar_kota_bali" ? "Luar Kota Bali" : "Dalam Kota",
      specialRequest: checked.specialRequest,
      referenceImage: req.file ? `/uploads/${req.file.filename}` : "",
      termsAccepted: true,
      baseAmount: prices.baseAmount,
      zoneFee: prices.zoneFee,
      totalPrice: prices.totalPrice,
    },
  };
}

function contactFrom(req) {
  const body = req.body || {};
  const sessionUser = req.session.user;
  return {
    customerName: String(body.customerName || sessionUser?.name || "").trim(),
    customerEmail: String(body.customerEmail || "").trim(),
    customerPhone: String(body.customerPhone || "").trim(),
    userId: sessionUser?.role === "customer" ? sessionUser.id : null,
  };
}

router.post("/api/pesanan/rental", requireBookingLogin, referenceUpload, (req, res) => {
  req.serviceType = "rental";
  const extras = checkoutExtras(req, contactFrom(req));
  if (extras.error) {
    return reject(req, res, extras.error);
  }
  const rentalType = String(req.body.rentalType || "").trim();
  const pickupDate = String(req.body.pickupDate || "").trim();
  const durationDays = Number(req.body.durationDays) || 0;
  if (!rentalType || !pickupDate || durationDays < 1) {
    return reject(req, res, "Lengkapi tipe sewa, tanggal ambil, dan durasi.");
  }
  const order = db.createOrder({
    ...extras.contact,
    serviceType: "rental",
    details: {
      ...extras.details,
      rentalType,
      pickupDate,
      durationDays,
      vehicleName: String(req.body.vehicleName || "").trim(),
      city: String(req.body.city || "Bali").trim(),
    },
  });
  return finish(req, res, order, "Pesanan rental berhasil. E-voucher sudah dibuat.");
});

router.post("/api/pesanan/airport", requireBookingLogin, referenceUpload, (req, res) => {
  req.serviceType = "airport";
  const extras = checkoutExtras(req, contactFrom(req));
  if (extras.error) {
    return reject(req, res, extras.error);
  }
  const serviceKind = String(req.body.serviceKind || "").trim();
  const flightNumber = String(req.body.flightNumber || "").trim();
  const landingAt = String(req.body.landingAt || "").trim();
  const hotelLocation = String(req.body.hotelLocation || "").trim();
  if (!serviceKind || !landingAt || !hotelLocation) {
    return reject(req, res, "Lengkapi jenis layanan, jam kedatangan, dan lokasi hotel.");
  }
  const order = db.createOrder({
    ...extras.contact,
    serviceType: "airport",
    details: {
      ...extras.details,
      serviceKind,
      flightNumber,
      landingAt,
      hotelLocation,
    },
  });
  return finish(req, res, order, "Pesanan transfer berhasil. E-voucher sudah dibuat.");
});

router.post("/api/pesanan/wisata", requireBookingLogin, referenceUpload, (req, res) => {
  req.serviceType = "tour";
  const extras = checkoutExtras(req, contactFrom(req));
  if (extras.error) {
    return reject(req, res, extras.error);
  }
  const packageType = String(req.body.packageType || "").trim();
  const participantCount = Number(req.body.participantCount) || 0;
  if (!packageType || participantCount < 1) {
    return reject(req, res, "Lengkapi jenis paket dan jumlah peserta.");
  }
  const order = db.createOrder({
    ...extras.contact,
    serviceType: "tour",
    details: {
      ...extras.details,
      packageType,
      participantCount,
      notes: String(req.body.notes || "").trim(),
    },
  });
  return finish(req, res, order, "Pesanan wisata berhasil. E-voucher sudah dibuat.");
});

function canView(req, order) {
  if (!order) {
    return false;
  }
  if (req.session.user?.role === "admin") {
    return true;
  }
  if (req.session.user?.role === "customer" && order.userId === req.session.user.id) {
    return true;
  }
  return req.session.lastOrderId === order.id;
}

function canManage(req, order) {
  if (!order) {
    return false;
  }
  if (req.session.user?.role === "customer" && order.userId === req.session.user.id) {
    return true;
  }
  return req.session.lastOrderId === order.id;
}

router.get("/voucher/:id", (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!canView(req, order)) {
    req.session.flash = { type: "error", message: "E-voucher tidak ditemukan." };
    return res.redirect("/");
  }
  const editable = canManage(req, order) && orderEditable(order);
  res.render("voucher", {
    title: `E-tiket #${order.id}`,
    order,
    editable,
    editExpired: !orderEditable(order),
  });
});

router.get("/pesanan/:id/ubah", (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!canManage(req, order)) {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
    return res.redirect("/pesanan");
  }
  res.render("customer/edit-order", {
    title: "Ubah jadwal penjemputan",
    order,
    editable: orderEditable(order),
  });
});

router.post("/pesanan/:id/ubah", (req, res) => {
  const order = db.getOrderById(req.params.id);
  const wantsJson = Boolean(
    req.is("application/json") || String(req.headers.accept || "").includes("application/json")
  );
  if (!canManage(req, order)) {
    if (wantsJson) {
      return res.status(404).json({ ok: false, message: "Pesanan tidak ditemukan." });
    }
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
    return res.redirect("/pesanan");
  }
  if (!orderEditable(order)) {
    if (wantsJson) {
      return res.status(403).json({ ok: false, message: "Pesanan Tidak Dapat Diubah" });
    }
    req.session.flash = { type: "error", message: "Pesanan Tidak Dapat Diubah" };
    return res.redirect(`/voucher/${order.id}`);
  }
  const postedVehicle = String(req.body.vehicleName || "").trim();
  if (postedVehicle && postedVehicle !== String(order.details?.vehicleName || "")) {
    if (wantsJson) {
      return res.status(400).json({ ok: false, message: "Armada tidak dapat diubah." });
    }
    req.session.flash = { type: "error", message: "Armada tidak dapat diubah." };
    return res.redirect(`/pesanan/${order.id}/ubah`);
  }
  const pickupDate = String(req.body.pickupDate || "").trim();
  const pickupTime = String(req.body.pickupTime || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !/^\d{2}:\d{2}$/.test(pickupTime)) {
    if (wantsJson) {
      return res.status(400).json({ ok: false, message: "Isi tanggal dan jam penjemputan yang benar." });
    }
    req.session.flash = { type: "error", message: "Isi tanggal dan jam penjemputan yang benar." };
    return res.redirect(`/pesanan/${order.id}/ubah`);
  }
  const updated = db.updateOrderSchedule(order.id, { pickupDate, pickupTime });
  if (!updated || updated.error) {
    if (wantsJson) {
      return res.status(403).json({ ok: false, message: "Pesanan Tidak Dapat Diubah" });
    }
    req.session.flash = { type: "error", message: "Pesanan Tidak Dapat Diubah" };
    return res.redirect(`/voucher/${order.id}`);
  }
  if (wantsJson) {
    return res.json({ ok: true, order: updated.order });
  }
  req.session.flash = { type: "success", message: "Jadwal penjemputan berhasil diubah." };
  return res.redirect(`/voucher/${order.id}`);
});

router.get("/checkout", requireBookingLogin, (req, res) => {
  const service = ["rental", "airport", "tour"].includes(req.query.service)
    ? req.query.service
    : "rental";
  res.render("checkout", {
    title: "Checkout",
    service,
    vehicles: db.getVehicles().filter((vehicle) => vehicle.status === "available"),
    prefill: {
      vehicleName: String(req.query.vehicle || ""),
      pickupDate: String(req.query.startDate || todayISO()),
      durationDays: req.query.endDate
        ? rentalDays(req.query.startDate, req.query.endDate)
        : Number(req.query.days) || 1,
    },
  });
});

module.exports = router;
