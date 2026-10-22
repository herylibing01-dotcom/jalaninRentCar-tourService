function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizeWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!/^\d{7,15}$/.test(digits)) {
    return "";
  }
  return digits;
}

function canonicalZone(zone) {
  const value = String(zone || "");
  if (value === "zona_1" || value === "Zona 1 (Dekat)") return "zona_1";
  if (value === "zona_2" || value === "Zona 2 (Sedang)") return "zona_2";
  if (value === "zona_3" || value === "Zona 3 (Jauh)") return "zona_3";
  if (value === "luar_kota_bali" || value === "Luar Kota Bali") return "luar_kota_bali";
  if (value === "dalam_kota" || value === "Dalam Kota") return "dalam_kota";
  return "";
}

function validateCheckout(body) {
  const errors = [];
  const email = String(body.customerEmail || body.email || "").trim();
  const phone = normalizeWhatsApp(body.customerPhone || body.whatsapp || body.phone);
  const zone = canonicalZone(body.zone);
  const accepted = body.termsAccepted === "on" || body.termsAccepted === "yes" || body.termsAccepted === true;

  if (!String(body.customerName || "").trim()) {
    errors.push("Nama pemesan wajib diisi.");
  }
  if (!isValidEmail(email)) {
    errors.push("Email tidak valid.");
  }
  if (!phone) {
    errors.push("Nomor WhatsApp harus 7–15 digit dan boleh memakai kode negara mana pun.");
  }
  if (!zone) {
    errors.push("Pilih zona wilayah pemakaian.");
  }
  if (!accepted) {
    errors.push("Syarat dan ketentuan wajib dicentang.");
  }

  return {
    ok: errors.length === 0,
    errors,
    email,
    phone,
    zone,
    specialRequest: String(body.specialRequest || "").trim(),
  };
}

module.exports = {
  isValidEmail,
  normalizeWhatsApp,
  canonicalZone,
  validateCheckout,
};
