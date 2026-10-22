const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/task/driver-:bookingId-:token", (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const token = req.params.token;

  const booking = db.getBookings().find(b => b.id === bookingId && b.driverToken === token);

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
            <p class="text-gray-600 mb-6">Link driver ini tidak ditemukan atau sudah tidak berlaku. Silakan hubungi admin untuk informasi lebih lanjut.</p>
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
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Masa Tugas Sewa Selesai</h1>
            <p class="text-gray-600 mb-6">Masa tugas sewa untuk booking ini telah selesai. Link ini sudah tidak dapat diakses lagi.</p>
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

  res.render("driver-task", {
    booking,
    vehicle,
    endDate,
    t: (key) => key,
  });
});

router.post("/task/driver-:bookingId-:token/verify", (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const token = req.params.token;
  const { driverName, bookingCode } = req.body;

  const booking = db.getBookings().find(b => b.id === bookingId && b.driverToken === token);

  if (!booking) {
    return res.json({ ok: false, message: "Link tidak valid" });
  }

  if (db.isBookingExpired(booking)) {
    return res.json({ ok: false, message: "Masa sewa telah selesai" });
  }

  if (!driverName || !bookingCode) {
    return res.json({ ok: false, message: "Nama driver dan kode booking wajib diisi" });
  }

  if (String(booking.id) !== bookingCode) {
    return res.json({ ok: false, message: "Kode booking tidak sesuai" });
  }

  res.json({ ok: true, bookingId: booking.id });
});

module.exports = router;
