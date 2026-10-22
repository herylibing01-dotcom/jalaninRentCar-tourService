const express = require("express");
const db = require("../db");
const { staffUpload } = require("../middleware/upload");

const router = express.Router();

router.get("/check/staff-:bookingId-:token", (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const token = req.params.token;

  const booking = db.getBookings().find(b => b.id === bookingId && b.staffToken === token);

  if (!booking) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Tidak Valid</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
          <div class="text-center">
            <div class="text-6xl mb-4">❌</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Link Tidak Valid</h1>
            <p class="text-gray-600 mb-6">Link staf ini tidak ditemukan atau sudah tidak berlaku. Silakan hubungi admin untuk informasi lebih lanjut.</p>
            <p class="text-sm text-gray-500">Booking ID: ${bookingId}</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  const isExpired = db.isBookingExpired(booking);

  if (isExpired) {
    return res.status(410).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Masa Sewa Selesai</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
          <div class="text-center">
            <div class="text-6xl mb-4">⏰</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Masa Sewa Selesai</h1>
            <p class="text-gray-600 mb-6">Masa sewa untuk booking ini telah selesai. Link serah terima sudah tidak dapat diakses lagi.</p>
            <div class="bg-blue-50 p-4 rounded-lg mb-4">
              <p class="text-sm text-blue-800"><strong>Booking ID:</strong> #${booking.id}</p>
              <p class="text-sm text-blue-800"><strong>Tanggal Selesai:</strong> ${db.calculateEndDate(booking.details.pickupDate, booking.details.durationDays)}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  const endDate = db.calculateEndDate(booking.details.pickupDate, booking.details.durationDays);
  const vehicles = db.getVehicles();
  const vehicle = vehicles.find(v => v.name === booking.details.vehicleName);

  res.render("staff-check", {
    booking,
    vehicle,
    endDate,
    t: (key) => key,
  });
});

router.post("/check/staff-:bookingId-:token/verify", (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const token = req.params.token;
  const { staffName, bookingCode } = req.body;

  const booking = db.getBookings().find(b => b.id === bookingId && b.staffToken === token);

  if (!booking) {
    return res.json({ ok: false, message: "Link tidak valid" });
  }

  if (db.isBookingExpired(booking)) {
    return res.json({ ok: false, message: "Masa sewa telah selesai" });
  }

  if (!staffName || !bookingCode) {
    return res.json({ ok: false, message: "Nama staf dan kode booking wajib diisi" });
  }

  if (String(booking.id) !== bookingCode) {
    return res.json({ ok: false, message: "Kode booking tidak sesuai" });
  }

  res.json({ ok: true, bookingId: booking.id });
});

router.post("/check/staff-:bookingId-:token/upload", staffUpload, (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const token = req.params.token;

  const booking = db.getBookings().find(b => b.id === bookingId && b.staffToken === token);

  if (!booking) {
    return res.json({ ok: false, message: "Link tidak valid" });
  }

  if (db.isBookingExpired(booking)) {
    return res.json({ ok: false, message: "Masa sewa telah selesai" });
  }

  if (req.uploadError) {
    return res.json({ ok: false, message: req.uploadError });
  }

  const identityPhoto = req.files && req.files["identityPhoto"] ? req.files["identityPhoto"][0] : null;
  const carConditionPhotos = req.files && req.files["carConditionPhotos"] ? req.files["carConditionPhotos"] : [];

  if (!identityPhoto && (!carConditionPhotos || carConditionPhotos.length === 0)) {
    return res.json({ ok: false, message: "Setidaknya satu foto harus diunggah" });
  }

  const staffData = {
    staffName: req.body.staffName || "",
    identityPhoto: identityPhoto ? `/uploads/${identityPhoto.filename}` : booking.details.staffIdentityPhoto || "",
    carConditionPhotos: carConditionPhotos.length > 0 
      ? carConditionPhotos.map(f => `/uploads/${f.filename}`)
      : (booking.details.staffCarConditionPhotos || []),
    uploadedAt: new Date().toISOString(),
  };

  const data = db.load();
  const bookingIndex = data.bookings.findIndex(b => b.id === bookingId);
  if (bookingIndex !== -1) {
    data.bookings[bookingIndex].details = {
      ...data.bookings[bookingIndex].details,
      ...staffData,
    };
    db.save(data);
  }

  res.json({ 
    ok: true, 
    message: "Foto berhasil diunggah",
    identityPhoto: staffData.identityPhoto,
    carConditionPhotos: staffData.carConditionPhotos,
  });
});

module.exports = router;
