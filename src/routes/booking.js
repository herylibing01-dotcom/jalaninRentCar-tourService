const express = require("express");
const db = require("../db");
const { priceBreakdown, driverPackageQuote, ZONE_AREA_LABELS, DRIVER_TERMS } = require("../finance");
const { isValidEmail, normalizeWhatsApp, canonicalZone } = require("../validation");
const { combinedUpload } = require("../middleware/upload");
const { requireBookingLogin } = require("../middleware/auth");

const router = express.Router();

const SERVICE_TYPES = {
  Rental: "rental",
  "Airport Transfer": "airport",
  Tour: "tour",
  rental: "rental",
  airport: "airport",
  tour: "tour",
};

function wantsJson(req) {
  return Boolean(
    req.is("application/json") ||
      String(req.headers.accept || "").includes("application/json")
  );
}

function reject(req, res, message) {
  if (wantsJson(req)) {
    return res.status(400).json({ ok: false, message });
  }
  req.session.flash = { type: "error", message };
  const service = SERVICE_TYPES[req.body?.serviceType] || "rental";
  return res.redirect(`/checkout?service=${service}`);
}

router.post("/api/book-service", requireBookingLogin, combinedUpload, (req, res) => {
  const body = req.body || {};
  const customerName = String(body.name || body.customerName || "").trim();
  const email = String(body.email || body.customerEmail || "").trim();
  const phone = normalizeWhatsApp(body.whatsapp || body.phone || body.customerPhone);
  const serviceLabelInput = String(body.serviceType || "").trim();
  const serviceType = SERVICE_TYPES[serviceLabelInput];
  let flightNumber = String(body.flightNumber || "").trim();
  const specialRequest = String(body.specialRequest || body.customRequest || "").trim();
  const paymentMethod = String(body.paymentMethod || "").trim();
  const zone = canonicalZone(body.zone);
  const pickupLocation = String(body.pickupLocation || "").trim();
  const dropoffLocation = String(body.dropoffLocation || "").trim();
  const pickupDate = String(body.pickupDate || "").trim();
  const pickupTime = String(body.pickupTime || "").trim();

  if (req.uploadError) {
    return reject(req, res, req.uploadError);
  }
  if (!customerName) {
    return reject(req, res, "Nama pemesan wajib diisi.");
  }
  if (!isValidEmail(email)) {
    return reject(req, res, "Email tidak valid.");
  }
  if (!phone) {
    return reject(req, res, req.t("error.phone"));
  }
  if (!serviceType) {
    return reject(req, res, "Tipe layanan harus Rental, Airport Transfer, atau Tour.");
  }
  const pickupIsAirport = /bandara|airport/i.test(pickupLocation);
  if (serviceType !== "airport" || !pickupIsAirport) {
    flightNumber = "";
  }
  const activePayments = db.getPaymentMethods().filter((item) => item.active);
  if (!activePayments.some((item) => item.name === paymentMethod)) {
    return reject(req, res, "Pilih metode pembayaran yang tersedia.");
  }
  if (!zone) {
    return reject(req, res, "Pilih zona wilayah pemakaian.");
  }
  if (!pickupLocation || !dropoffLocation) {
    return reject(req, res, "Isi lokasi penjemputan dan lokasi pengantaran.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !/^\d{2}:\d{2}$/.test(pickupTime)) {
    return reject(req, res, "Isi tanggal dan jam penjemputan.");
  }

  const rentalType = String(body.rentalType || "").trim();
  const durationDays = Number(body.durationDays) || 0;
  const vehicleName = String(body.vehicleName || "").trim();
  const packageType = String(body.packageType || "").trim();
  const participantCount = Number(body.participantCount) || 0;

  if (serviceType === "rental" && (!rentalType || !pickupDate || durationDays < 1 || !vehicleName)) {
    return reject(req, res, "Lengkapi tipe sewa, tanggal ambil, durasi, dan armada.");
  }
  if (serviceType === "tour" && (!packageType || participantCount < 1)) {
    return reject(req, res, "Lengkapi jenis paket wisata dan jumlah peserta.");
  }
  const lepasKunci = /lepas/i.test(rentalType);
  const lateAccepted = body.latePolicyAccepted === "on" || body.latePolicyAccepted === "yes" || body.latePolicyAccepted === true;
  if (serviceType === "rental" && lepasKunci && !lateAccepted) {
    return reject(req, res, "Persetujuan denda keterlambatan wajib dicentang.");
  }
  const simNumber = String(body.simNumber || "").trim();
  const idDocumentType = String(body.idDocumentType || "").trim();
  const idDocumentFile = req.files && req.files["idDocumentImage"] ? req.files["idDocumentImage"][0] : null;
  const referenceFile = req.files && req.files["referenceImage"] ? req.files["referenceImage"][0] : null;
  if (serviceType === "rental" && lepasKunci) {
    if (!simNumber) {
      return reject(req, res, "Nomor SIM wajib diisi untuk lepas kunci.");
    }
    if (!idDocumentType) {
      return reject(req, res, "Pilih jenis dokumen identitas (SIM, KTP/NIK, atau Paspor).");
    }
    if (!idDocumentFile) {
      return reject(req, res, "Dokumen identitas wajib diunggah untuk lepas kunci.");
    }
  }

  const withDriver = serviceType === "rental" && /sopir/i.test(rentalType);
  const driverPackage = String(body.driverPackage || "").trim();
  const rawAddons = body.driverAddons;
  const pricing = db.getPricingSettings();
  const driverAddons = (Array.isArray(rawAddons) ? rawAddons : rawAddons ? [rawAddons] : []).filter((key) =>
    pricing.addons.some((item) => item.key === key)
  );
  if (withDriver && driverPackage !== "reguler" && driverPackage !== "all-in") {
    return reject(req, res, "Pilih paket sopir Reguler atau All-In.");
  }

  const zoneService = serviceType === "airport" ? "airport" : lepasKunci ? "antar_jemput" : "rental";
  const zoneRow = db.getZoneTariffs().find((item) => item.service === zoneService && item.zone === zone);
  const prices = priceBreakdown({
    serviceType,
    vehicleName,
    durationDays,
    packageType,
    zone,
    zoneService,
    zoneTariffs: db.getZoneTariffs(),
    vehicles: db.getVehicles(),
    pricing,
  });
  const driverQuote = withDriver
    ? driverPackageQuote({
        baseAmount: prices.baseAmount,
        durationDays,
        zone,
        packageType: driverPackage,
        addons: driverAddons,
        pricing,
      })
    : null;
  if (driverQuote) {
    prices.zoneFee = 0;
    prices.deliveryFee = 0;
    prices.totalPrice = driverQuote.totalPrice;
  }

  const sessionUser = req.session.user;
  const booking = db.saveServiceBooking({
    userId: sessionUser?.role === "customer" ? sessionUser.id : null,
    customerName,
    customerEmail: email,
    customerPhone: phone,
    serviceType,
    serviceName: serviceLabelInput,
    paymentMethod,
    totalPrice: prices.totalPrice,
    details: {
      zone,
      zoneLabel: ZONE_AREA_LABELS[zone] || (zoneRow ? zoneRow.label : zone),
      driverPackage: driverQuote ? driverQuote.packageType : "",
      driverFee: driverQuote ? driverQuote.driverFee : 0,
      areaMultiplier: driverQuote ? driverQuote.areaMultiplier : 1,
      driverAddons: driverQuote ? driverQuote.components : [],
      allInAmount: driverQuote ? driverQuote.allInAmount : 0,
      serviceTerms: driverQuote ? driverQuote.serviceTerms : "",
      serviceTermsReguler: withDriver ? DRIVER_TERMS.reguler : "",
      serviceTermsAllIn: withDriver ? DRIVER_TERMS["all-in"] : "",
      zoneService,
      deliveryFee: prices.deliveryFee,
      specialRequest,
      referenceImage: referenceFile ? `/uploads/${referenceFile.filename}` : "",
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      flightNumber,
      paymentMethod,
      baseAmount: prices.baseAmount,
      zoneFee: prices.zoneFee,
      totalPrice: prices.totalPrice,
      rentalType,
      durationDays: durationDays || undefined,
      vehicleName,
      packageType,
      participantCount: participantCount || undefined,
      serviceKind: String(body.serviceKind || "").trim(),
      landingAt: String(body.landingAt || "").trim(),
      hotelLocation: String(body.hotelLocation || "").trim(),
      notes: String(body.notes || "").trim(),
      city: String(body.city || "Bali").trim(),
      simNumber: lepasKunci ? simNumber : "",
      idDocumentType: lepasKunci ? idDocumentType : "",
      idDocumentImage: lepasKunci && idDocumentFile ? `/uploads/${idDocumentFile.filename}` : "",
    },
  });

  const transaction = db.createTransaction(booking);
  req.session.lastOrderId = booking.id;

  if (wantsJson(req)) {
    return res.status(201).json({ ok: true, booking, transaction });
  }

  req.session.flash = {
    type: "success",
    message: "Pemesanan berhasil. Pembayaran tercatat di kas dengan status Success.",
  };
  return res.redirect(`/voucher/${booking.id}`);
});

module.exports = router;
