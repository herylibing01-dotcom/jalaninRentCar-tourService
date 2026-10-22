function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function rentalDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

const EDIT_WINDOW_MS = 60 * 60 * 1000;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function orderEditable(order, now = Date.now()) {
  if (!order || !order.createdAt) {
    return false;
  }
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) {
    return false;
  }
  return now - created <= EDIT_WINDOW_MS;
}

function plusDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function serviceLabel(type) {
  const labels = {
    rental: "Rental Mobil",
    airport: "Airport Service & Transfer",
    tour: "Paket Wisata",
  };
  return labels[type] || type;
}

function expenseCategoryLabel(category) {
  const labels = {
    gaji: "Gaji",
    komisi_sopir: "Komisi sopir",
    maintenance: "Maintenance",
    operasional: "Operasional",
    rental: "Rental Mobil",
    tour: "Paket Wisata",
    airport: "Airport Service",
  };
  return labels[category] || category;
}

function sectionFor(path) {
  const routes = [
    ["/admin/tarif", "Manajemen Tarif & Harga"],
    ["/admin/statistik", "Statistik Website"],
    ["/admin/pengaturan", "Pengaturan"],
    ["/admin/pembayaran", "Pembayaran"],
    ["/admin/zona", "Zona & Tarif"],
    ["/admin/pesanan", "Pesanan Masuk"],
    ["/admin/direct-booking", "Direct Booking"],
    ["/admin/testimoni", "Kelola Testimoni"],
    ["/admin/armada", "Kelola Armada"],
    ["/admin/karyawan", "Data Karyawan"],
    ["/admin/gaji", "Perhitungan Gaji"],
    ["/admin/keuangan", "Keuangan"],
    ["/admin", "Ringkasan"],
    ["/katalog", "Armada"],
    ["/checkout", "Checkout"],
    ["/pesanan", "Pesanan"],
    ["/voucher", "E-voucher"],
    ["/ulasan", "Ulasan"],
    ["/login", "Masuk"],
    ["/daftar", "Daftar"],
    ["/", "Beranda"],
  ];
  const hit = routes.find(([href]) => path === href || (href !== "/" && path.startsWith(href)));
  return hit ? { href: hit[0], label: hit[1] } : { href: "/", label: "Beranda" };
}

function whatsAppConfirmLink(order) {
  let digits = String(order.customerPhone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  const when = order.details?.pickupDate || order.details?.landingAt || "-";
  const text = [
    `Halo ${order.customerName}, pesanan Anda di Jalanin Rent Car & Tour Service telah dikonfirmasi.`,
    "",
    `ID Booking: #${order.id}`,
    `Layanan: ${serviceLabel(order.serviceType)}`,
    `Tanggal: ${when}`,
    "",
    "Terima kasih telah mempercayakan perjalanan Anda kepada kami.",
  ].join("\n");
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`;
}

function orderStatusLabel(status) {
  const labels = {
    baru: "Pesanan baru",
    ditugaskan: "Ditugaskan",
    selesai: "Selesai",
    dikonfirmasi: "Dikonfirmasi",
    'tunggu_pembayaran': "Tunggu Pembayaran",
    'terkonfirmasi': "Terkonfirmasi",
    'siap_jalan': "Siap Jalan",
    'sedang_dalam_perjalanan': "Sedang Dalam Perjalanan",
    'dalam_perjalanan': "Dalam Perjalanan",
    'reschedule': "Reschedule",
    'cancel': "Dibatalkan",
  };
  return labels[status] || status;
}

function orderStatusColor(status) {
  const colors = {
    baru: "bg-amber-50 text-amber-700",
    ditugaskan: "bg-sky-50 text-sky-700",
    selesai: "bg-emerald-50 text-emerald-700",
    dikonfirmasi: "bg-indigo-50 text-indigo-700",
    'tunggu_pembayaran': "bg-rose-50 text-rose-700",
    'terkonfirmasi': "bg-emerald-50 text-emerald-700",
    'siap_jalan': "bg-teal-50 text-teal-700",
    'sedang_dalam_perjalanan': "bg-blue-50 text-blue-700",
    'dalam_perjalanan': "bg-blue-50 text-blue-700",
    'reschedule': "bg-orange-50 text-orange-700",
    'cancel': "bg-gray-50 text-gray-700",
  };
  return colors[status] || "bg-gray-50 text-gray-700";
}

function driverWhatsAppLink(order, driverName) {
  if (!order || !driverTaskLink(order)) {
    return null;
  }
  const link = driverTaskLink(order);
  const text = `Halo ${driverName}, berikut adalah link penugasan resmi untuk nomor booking #${order.id}. Silakan buka link berikut untuk melihat detail jadwal, rute jemput, dan aturan sopir: ${link}`;
  const phone = order.assignedEmployeePhone || "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`;
}

function staffWhatsAppLink(order, staffName) {
  if (!order || !staffCheckLink(order)) {
    return null;
  }
  const link = staffCheckLink(order);
  const text = `Halo ${staffName}, berikut adalah link serah-terima unit lepas kunci untuk nomor booking #${order.id}. Silakan buka link berikut untuk melakukan validasi fisik kendaraan dan upload dokumen identitas konsumen: ${link}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

function driverTaskLink(booking) {
  if (!booking || !booking.driverToken) {
    return null;
  }
  return `/task/driver-${booking.id}-${booking.driverToken}`;
}

function staffCheckLink(booking) {
  if (!booking || !booking.staffToken) {
    return null;
  }
  return `/check/staff-${booking.id}-${booking.staffToken}`;
}

module.exports = {
  rupiah,
  rentalDays,
  todayISO,
  orderEditable,
  sectionFor,
  EDIT_WINDOW_MS,
  plusDaysISO,
  serviceLabel,
  orderStatusLabel,
  orderStatusColor,
  expenseCategoryLabel,
  whatsAppConfirmLink,
  driverTaskLink,
  staffCheckLink,
  driverWhatsAppLink,
  staffWhatsAppLink,
};
