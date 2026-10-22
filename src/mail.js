const nodemailer = require("nodemailer");
const { serviceLabel } = require("./helpers");

function transport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || "",
    },
  });
}

function bookingDate(order) {
  return order.details?.pickupDate || order.details?.landingAt || "-";
}

async function sendBookingConfirmed(order) {
  const mailer = transport();
  if (!mailer) {
    return { sent: false, reason: "smtp-missing" };
  }
  const service = serviceLabel(order.serviceType);
  const when = bookingDate(order);
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.customerEmail,
    subject: `Konfirmasi pesanan #${order.id} · Jalanin Rent Car & Tour Service`,
    text: [
      `Halo ${order.customerName},`,
      "",
      "Pesanan Anda telah dikonfirmasi oleh tim Jalanin Rent Car & Tour Service.",
      `ID Booking: #${order.id}`,
      `Layanan: ${service}`,
      `Tanggal: ${when}`,
      "",
      "Simpan email ini sebagai referensi perjalanan Anda.",
      "Jl. Tukad Pakerisan, Dauh Puri Klod, Kec. Denpasar Bar., Kota Denpasar, Bali 80225",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <p>Halo ${order.customerName},</p>
        <p>Pesanan Anda telah <strong>dikonfirmasi</strong> oleh tim Jalanin Rent Car &amp; Tour Service.</p>
        <table style="border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0">ID Booking</td><td><strong>#${order.id}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0">Layanan</td><td>${service}</td></tr>
          <tr><td style="padding:4px 12px 4px 0">Tanggal</td><td>${when}</td></tr>
        </table>
        <p>Simpan email ini sebagai referensi perjalanan Anda.</p>
      </div>
    `,
  });
  return { sent: true };
}

module.exports = { sendBookingConfirmed };
