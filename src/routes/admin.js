const fs = require("fs");
const path = require("path");
const express = require("express");
const db = require("../db");
const { requireRole } = require("../middleware/auth");
const { isValidEmail, normalizeWhatsApp, canonicalZone } = require("../validation");
const { sendBookingConfirmed } = require("../mail");
const { optionalImage } = require("../middleware/upload");

const router = express.Router();

router.use(requireRole("admin"));

router.get("/", (req, res) => {
  const data = db.stats();
  res.render("admin/dashboard", {
    title: "Dashboard Internal",
    stats: data,
    vehicles: db.getVehicles(),
    employees: db.getEmployees(),
    payrolls: db.getPayrolls().slice(0, 5),
    orders: db.getOrders().slice(0, 6),
  });
});

router.get("/pesanan", (req, res) => {
  res.render("admin/orders", {
    title: "Pesanan Masuk",
    orders: db.getOrders(),
    employees: db.getEmployees(),
  });
});

router.get("/direct-booking", (req, res) => {
  res.render("admin/direct-booking", {
    title: "Direct Booking",
    vehicles: db.getVehicles(),
    employees: db.getEmployees(),
    zoneTariffs: db.getZoneTariffs(),
    today: new Date().toISOString().slice(0, 10),
  });
});

router.get("/penugasan-aktif", (req, res) => {
  const orders = db.getOrders();
  res.render("admin/assignments", {
    title: "Penugasan Aktif",
    orders,
  });
});

router.get("/drivers", (req, res) => {
  const employees = db.getEmployees();
  const orders = db.getOrders();
  const activeDriverIds = orders
    .filter(o => ['siap_jalan', 'sedang_dalam_perjalanan'].includes(o.status) && o.assignedEmployeeId)
    .map(o => o.assignedEmployeeId);
  
  const driverCommissions = {};
  const activeOrderCounts = {};
  
  orders.forEach(order => {
    if (order.assignedEmployeeId) {
      if (!activeOrderCounts[order.assignedEmployeeId]) {
        activeOrderCounts[order.assignedEmployeeId] = 0;
      }
      if (['siap_jalan', 'sedang_dalam_perjalanan'].includes(order.status)) {
        activeOrderCounts[order.assignedEmployeeId]++;
      }
    }
  });
  
  res.render("admin/drivers", {
    title: "Manajemen Driver",
    drivers: employees,
    activeDriverIds,
    driverCommissions,
    activeOrderCounts,
  });
});

router.get("/staff", (req, res) => {
  const employees = db.getEmployees();
  const orders = db.getOrders();
  const staffList = employees.filter(e => e.jobRole === 'staff' || e.position === 'Staf Lapangan');
  const activeStaffIds = orders
    .filter(o => ['siap_jalan', 'sedang_dalam_perjalanan'].includes(o.status) && o.assignedEmployeeId)
    .map(o => o.assignedEmployeeId);
  
  const staffTaskCounts = {};
  const activeOrderCounts = {};
  
  orders.forEach(order => {
    if (order.assignedEmployeeId) {
      if (!staffTaskCounts[order.assignedEmployeeId]) {
        staffTaskCounts[order.assignedEmployeeId] = 0;
      }
      if (!activeOrderCounts[order.assignedEmployeeId]) {
        activeOrderCounts[order.assignedEmployeeId] = 0;
      }
      if (order.status === 'selesai') {
        staffTaskCounts[order.assignedEmployeeId]++;
      }
      if (['siap_jalan', 'sedang_dalam_perjalanan'].includes(order.status)) {
        activeOrderCounts[order.assignedEmployeeId]++;
      }
    }
  });
  
  res.render("admin/staff", {
    title: "Manajemen Staf",
    staffList,
    activeStaffIds,
    staffTaskCounts,
    activeOrderCounts,
  });
});

router.post("/pesanan/:id/tugaskan", (req, res) => {
  const { employeeId } = req.body;
  const success = db.assignOrder(req.params.id, employeeId);
  if (success) {
    req.session.flash = { type: "success", message: "Driver/Staf berhasil ditugaskan." };
  } else {
    req.session.flash = { type: "error", message: "Gagal menugaskan driver/staf." };
  }
  res.redirect("/admin/pesanan");
});

router.post("/direct-booking", (req, res) => {
  const body = req.body || {};
  const customerName = String(body.customerName || "").trim();
  const customerPhone = normalizeWhatsApp(body.customerPhone);
  const customerEmail = String(body.customerEmail || "").trim();
  const rentalType = String(body.rentalType || "").trim();
  const durationDays = Number(body.durationDays) || 0;
  const vehicleName = String(body.vehicleName || "").trim();
  const pickupDate = String(body.pickupDate || "").trim();
  const pickupTime = String(body.pickupTime || "").trim();
  const dropoffDate = String(body.dropoffDate || "").trim();
  const dropoffTime = String(body.dropoffTime || "").trim();
  const pickupLocation = String(body.pickupLocation || "").trim();
  const dropoffLocation = String(body.dropoffLocation || "").trim();
  const zone = canonicalZone(body.zone);
  const employeeId = Number(body.employeeId);
  const paymentMethod = String(body.paymentMethod || "").trim();
  const paymentStatus = String(body.paymentStatus || "").trim();
  const specialRequest = String(body.specialRequest || "").trim();

  if (!customerName) {
    req.session.flash = { type: "error", message: "Nama pelanggan wajib diisi." };
    return res.redirect("/admin/direct-booking");
  }
  if (!customerPhone) {
    req.session.flash = { type: "error", message: "Nomor WhatsApp wajib diisi." };
    return res.redirect("/admin/direct-booking");
  }
  if (!rentalType) {
    req.session.flash = { type: "error", message: "Jenis layanan wajib dipilih." };
    return res.redirect("/admin/direct-booking");
  }
  if (!vehicleName) {
    req.session.flash = { type: "error", message: "Armada wajib dipilih." };
    return res.redirect("/admin/direct-booking");
  }
  if (!pickupDate || !pickupTime) {
    req.session.flash = { type: "error", message: "Tanggal dan jam mulai wajib diisi." };
    return res.redirect("/admin/direct-booking");
  }
  if (!dropoffDate || !dropoffTime) {
    req.session.flash = { type: "error", message: "Tanggal dan jam selesai wajib diisi." };
    return res.redirect("/admin/direct-booking");
  }
  if (!pickupLocation || !dropoffLocation) {
    req.session.flash = { type: "error", message: "Lokasi penjemputan dan pengantaran wajib diisi." };
    return res.redirect("/admin/direct-booking");
  }
  if (!zone) {
    req.session.flash = { type: "error", message: "Zona wilayah wajib dipilih." };
    return res.redirect("/admin/direct-booking");
  }
  if (!employeeId) {
    req.session.flash = { type: "error", message: "Driver/Staf lapangan wajib dipilih." };
    return res.redirect("/admin/direct-booking");
  }
  if (!paymentMethod) {
    req.session.flash = { type: "error", message: "Metode pembayaran wajib dipilih." };
    return res.redirect("/admin/direct-booking");
  }
  if (!paymentStatus) {
    req.session.flash = { type: "error", message: "Status pembayaran wajib dipilih." };
    return res.redirect("/admin/direct-booking");
  }

  // Check for overbooking
  const isOverbooked = db.checkVehicleAvailability(vehicleName, pickupDate, dropoffDate);
  if (isOverbooked) {
    req.session.flash = { type: "error", message: "Armada ini sudah dibooking pada tanggal tersebut. Silakan pilih armada lain atau tanggal lain." };
    return res.redirect("/admin/direct-booking");
  }

  // Get vehicle and employee info
  const vehicle = db.getVehicles().find(v => v.name === vehicleName);
  const employee = db.getEmployeeById(employeeId);
  const zoneRow = db.getZoneTariffs().find(item => item.service === 'rental' && item.zone === zone);
  const zoneLabel = zoneRow ? zoneRow.label : zone;
  const dailyRate = vehicle ? vehicle.pricePerDay : 350000;
  const baseAmount = dailyRate * durationDays;
  const zoneFee = zoneRow ? zoneRow.price : 0;
  const totalPrice = baseAmount + zoneFee;

  // Create booking
  const booking = db.saveServiceBooking({
    userId: null,
    customerName,
    customerEmail,
    customerPhone,
    serviceType: "rental",
    serviceName: "Rental",
    paymentMethod,
    totalPrice,
    status: paymentStatus === 'terkonfirmasi' ? 'terkonfirmasi' : 'tunggu_pembayaran',
    assignedEmployeeId: employeeId,
    assignedEmployeeName: employee ? employee.name : "",
    details: {
      zone,
      zoneLabel,
      rentalType,
      durationDays,
      vehicleName,
      pickupDate,
      pickupTime,
      dropoffDate: dropoffDate || pickupDate,
      dropoffTime: dropoffTime || pickupTime,
      pickupLocation,
      dropoffLocation,
      baseAmount,
      zoneFee,
      totalPrice,
      specialRequest,
      paymentMethod,
      serviceKind: "Rental",
    },
  });

  // Create transaction if payment is confirmed
  if (paymentStatus === 'terkonfirmasi') {
    db.createTransaction(booking);
  }

  // Update vehicle status to booked
  db.updateVehicleStatus(vehicleName, pickupDate, dropoffDate, 'booked');

  req.session.flash = {
    type: "success",
    message: `Direct booking berhasil dibuat untuk ${customerName}. Booking ID: #${booking.id}`,
  };
  res.redirect(`/voucher/${booking.id}`);
});

router.post("/pesanan/:id/selesai", (req, res) => {
  const result = db.completeOrder(req.params.id, {
    hoursUsed: req.body.hoursUsed,
    lateHours: req.body.lateHours,
  });
  if (!result) {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
    return res.redirect("/admin/pesanan");
  }
  if (result.alreadyDone) {
    req.session.flash = { type: "error", message: "Pesanan ini sudah selesai." };
    return res.redirect("/admin/pesanan");
  }
  if (result.skipped) {
    req.session.flash = {
      type: "success",
      message: "Status diubah menjadi selesai. Kas masuk otomatis hanya untuk rental dan paket wisata.",
    };
    return res.redirect("/admin/keuangan");
  }
  const commissionText = result.commission
    ? ` Komisi sopir ${result.commission.toLocaleString("id-ID")} dicatat sebagai calon pengeluaran.`
    : "";
  const overtimeText = result.order.details?.overtimeAmount
    ? ` Overtime Rp ${Number(result.order.details.overtimeAmount).toLocaleString("id-ID")}.`
    : "";
  const lateText = result.order.details?.lateFee
    ? ` Denda keterlambatan Rp ${Number(result.order.details.lateFee).toLocaleString("id-ID")}.`
    : "";
  req.session.flash = {
    type: "success",
    message: `Pesanan #${result.order.id} selesai. Kas masuk ${result.amount.toLocaleString("id-ID")}.${commissionText}${overtimeText}${lateText}`,
  };
  res.redirect("/admin/keuangan");
});

router.post("/pesanan/:id/konfirmasi-pembayaran", (req, res) => {
  const success = db.updateOrderStatus(req.params.id, "terkonfirmasi");
  if (success) {
    req.session.flash = { type: "success", message: "Pembayaran dikonfirmasi. Status pesanan diperbarui." };
  } else {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
  }
  res.redirect("/admin/pesanan");
});

router.post("/pesanan/:id/siap-jalan", (req, res) => {
  const success = db.updateOrderStatus(req.params.id, "siap_jalan");
  if (success) {
    req.session.flash = { type: "success", message: "Pesanan ditandai siap jalan. Driver/Staf sudah dikonfirmasi." };
  } else {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
  }
  res.redirect("/admin/pesanan");
});

router.post("/pesanan/:id/mulai-perjalanan", (req, res) => {
  const success = db.updateOrderStatus(req.params.id, "sedang_dalam_perjalanan");
  if (success) {
    req.session.flash = { type: "success", message: "Pesanan ditandai sedang dalam perjalanan." };
  } else {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
  }
  res.redirect("/admin/pesanan");
});

router.post("/pesanan/:id/reschedule", (req, res) => {
  const success = db.updateOrderStatus(req.params.id, "reschedule");
  if (success) {
    req.session.flash = { type: "success", message: "Pesanan ditandai sebagai reschedule." };
  } else {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
  }
  res.redirect("/admin/pesanan");
});

router.post("/pesanan/:id/cancel", (req, res) => {
  const success = db.updateOrderStatus(req.params.id, "cancel");
  if (success) {
    req.session.flash = { type: "success", message: "Pesanan dibatalkan." };
  } else {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
  }
  res.redirect("/admin/pesanan");
});

router.post("/pesanan/:id/reschedule", (req, res) => {
  const success = db.updateOrderStatus(req.params.id, "reschedule");
  if (success) {
    req.session.flash = { type: "success", message: "Pesanan ditandai reschedule." };
  } else {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
  }
  res.redirect("/admin/pesanan");
});

router.post("/pesanan/:id/cancel", (req, res) => {
  const success = db.updateOrderStatus(req.params.id, "cancel");
  if (success) {
    req.session.flash = { type: "success", message: "Pesanan dibatalkan." };
  } else {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
  }
  res.redirect("/admin/pesanan");
});

router.get("/statistik", (req, res) => {
  res.render("admin/traffic", {
    title: "Statistik Website",
    traffic: db.trafficSummary(),
  });
});

router.get("/keuangan", (req, res) => {
  const filterType = req.query.filterType || 'month';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const year = req.query.year;
  
  let filter = {};
  if (filterType === 'month') {
    const month = new Date().toISOString().slice(0, 7);
    filter = { period: month };
  } else if (filterType === 'dateRange' && startDate && endDate) {
    filter = { startDate, endDate };
  } else if (filterType === 'year' && year) {
    filter = { period: `${year}-01` };
  } else {
    const month = new Date().toISOString().slice(0, 7);
    filter = { period: month };
  }
  
  const summary = db.getFinancialSummary(filter);
  const rows = db.cashBook(filter);
  
  res.render("admin/finance", {
    title: "Keuangan",
    summary,
    rows,
    today: new Date().toISOString().slice(0, 10),
    filterType,
    startDate,
    endDate,
    year,
  });
});

router.post("/keuangan/pengeluaran", (req, res) => {
  const amount = Number(req.body.amount) || 0;
  const description = String(req.body.description || "").trim();
  if (amount <= 0 || !description) {
    req.session.flash = { type: "error", message: "Isi nominal dan keterangan pengeluaran." };
    return res.redirect("/admin/keuangan");
  }
  db.createExpense({
    category: req.body.category,
    amount,
    status: req.body.status,
    date: req.body.date,
    description,
  });
  req.session.flash = { type: "success", message: "Pengeluaran dicatat di buku kas." };
  res.redirect("/admin/keuangan");
});

router.post("/pesanan/:id/tugaskan", (req, res) => {
  const employee = db.getEmployeeById(req.body.employeeId);
  if (!employee) {
    req.session.flash = { type: "error", message: "Pilih karyawan atau sopir." };
    return res.redirect("/admin/pesanan");
  }
  const order = db.assignOrder(req.params.id, employee);
  if (!order) {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
    return res.redirect("/admin/pesanan");
  }
  req.session.flash = {
    type: "success",
    message: `${employee.name} ditugaskan untuk pesanan #${order.id}.`,
  };
  res.redirect("/admin/pesanan");
});

router.get("/armada", (req, res) => {
  const editId = Number(req.query.edit);
  res.render("admin/fleet", {
    title: "Kelola Armada",
    vehicles: db.getVehicles(),
    editing: editId ? db.getVehicleById(editId) : null,
  });
});

router.post("/armada", optionalImage("vehicleImage"), (req, res) => {
  if (req.uploadError) {
    req.session.flash = { type: "error", message: req.uploadError };
    return res.redirect("/admin/armada");
  }
  const existing = req.body.id ? db.getVehicleById(req.body.id) : null;
  const payload = readVehicle(req.body);
  if (!req.file && existing && !String(req.body.image || "").trim()) {
    payload.image = existing.image;
  }
  if (req.file) payload.image = `/uploads/${req.file.filename}`;
  if (existing && payload.image && payload.image !== existing.image) {
    removeUpload(existing.image);
  }
  if (req.body.id) {
    db.updateVehicle(req.body.id, payload);
    req.session.flash = { type: "success", message: "Data armada diperbarui." };
  } else {
    db.createVehicle(payload);
    req.session.flash = { type: "success", message: "Mobil baru ditambahkan." };
  }
  res.redirect("/admin/armada");
});

router.post("/armada/:id/hapus", (req, res) => {
  db.deleteVehicle(req.params.id);
  req.session.flash = { type: "success", message: "Mobil dihapus dari armada." };
  res.redirect("/admin/armada");
});

router.get("/testimoni", (req, res) => {
  const editId = Number(req.query.edit);
  const items = db.getTestimonials();
  res.render("admin/testimonials", {
    title: "Kelola Testimoni",
    items,
    editing: editId ? items.find((item) => item.id === editId) : null,
  });
});

router.post("/testimoni", optionalImage("foto_profil"), (req, res) => {
  if (req.uploadError) {
    req.session.flash = { type: "error", message: req.uploadError };
    return res.redirect("/admin/testimoni");
  }
  const existing = req.body.id ? db.getTestimonials().find((item) => item.id === Number(req.body.id)) : null;
  const payload = {
    nama_tokoh: req.body.nama_tokoh,
    jabatan: req.body.jabatan,
    asal_negara: req.body.asal_negara,
    teks_testimoni: req.body.teks_testimoni,
    foto_profil: req.file ? `/uploads/${req.file.filename}` : existing ? existing.foto_profil : "",
  };
  if (!String(payload.nama_tokoh || "").trim() || !String(payload.teks_testimoni || "").trim()) {
    req.session.flash = { type: "error", message: "Nama tokoh dan teks testimoni wajib diisi." };
    return res.redirect("/admin/testimoni");
  }
  if (req.file && existing) removeUpload(existing.foto_profil);
  if (req.body.id) {
    db.updateTestimonial(req.body.id, payload);
    req.session.flash = { type: "success", message: "Testimoni diperbarui." };
  } else {
    db.createTestimonial(payload);
    req.session.flash = { type: "success", message: "Testimoni ditambahkan." };
  }
  res.redirect("/admin/testimoni");
});

router.post("/testimoni/:id/hapus", (req, res) => {
  const current = db.getTestimonials().find((item) => item.id === Number(req.params.id));
  db.deleteTestimonial(req.params.id);
  if (current) removeUpload(current.foto_profil);
  req.session.flash = { type: "success", message: "Testimoni dihapus." };
  res.redirect("/admin/testimoni");
});

router.get("/karyawan", (req, res) => {
  const editId = Number(req.query.edit);
  res.render("admin/employees", {
    title: "Data Karyawan",
    employees: db.getEmployees(),
    editing: editId ? db.getEmployeeById(editId) : null,
  });
});

router.post("/karyawan", (req, res) => {
  const payload = {
    name: String(req.body.name || "").trim(),
    position: String(req.body.position || "").trim(),
    phone: String(req.body.phone || "").trim(),
    baseSalary: Number(req.body.baseSalary) || 0,
    jobRole: req.body.jobRole === "driver" ? "driver" : "staff",
  };
  if (req.body.id) {
    db.updateEmployee(req.body.id, payload);
    req.session.flash = { type: "success", message: "Data karyawan diperbarui." };
  } else {
    db.createEmployee(payload);
    req.session.flash = { type: "success", message: "Karyawan baru ditambahkan." };
  }
  res.redirect("/admin/karyawan");
});

router.post("/karyawan/:id/hapus", (req, res) => {
  db.deleteEmployee(req.params.id);
  req.session.flash = { type: "success", message: "Karyawan dihapus." };
  res.redirect("/admin/karyawan");
});

router.get("/gaji", (req, res) => {
  res.render("admin/payroll", {
    title: "Perhitungan Gaji",
    employees: db.getEmployees(),
    payrolls: db.getPayrolls(),
  });
});

router.post("/gaji", (req, res) => {
  const employee = db.getEmployeeById(req.body.employeeId);
  if (!employee) {
    req.session.flash = { type: "error", message: "Karyawan tidak ditemukan." };
    return res.redirect("/admin/gaji");
  }

  const bonus = Number(req.body.bonus) || 0;
  const deduction = Number(req.body.deduction) || 0;
  const netSalary = employee.baseSalary + bonus - deduction;

  const period = String(req.body.period || "");
  db.createPayroll({
    employeeId: employee.id,
    employeeName: employee.name,
    position: employee.position,
    period,
    baseSalary: employee.baseSalary,
    bonus,
    deduction,
    netSalary,
    createdAt: new Date().toISOString(),
  });
  db.createExpense({
    category: "gaji",
    amount: netSalary,
    status: "calon",
    employeeId: employee.id,
    employeeName: employee.name,
    description: `Gaji ${employee.name} periode ${period}`,
    date: period ? `${period}-01` : undefined,
  });

  req.session.flash = {
    type: "success",
    message: `Gaji ${employee.name} berhasil dihitung dan disimpan.`,
  };
  res.redirect("/admin/gaji");
});

router.get("/pembayaran", (req, res) => {
  const editingId = Number(req.query.id || 0);
  const methods = db.getPaymentMethods();
  res.render("admin/payments", {
    title: "Metode Pembayaran",
    methods,
    editing: methods.find((item) => item.id === editingId) || null,
  });
});

router.post("/pembayaran", (req, res) => {
  const payload = {
    type: String(req.body.type || ""),
    name: String(req.body.name || "").trim(),
    barcodeUrl: String(req.body.barcodeUrl || "").trim(),
    note: String(req.body.note || "").trim(),
    active: req.body.active === "on",
  };
  const allowed = ["qris", "ewallet", "transfer_bank", "kartu_kredit"];
  if (!allowed.includes(payload.type) || !payload.name) {
    req.session.flash = { type: "error", message: "Lengkapi jenis dan nama metode pembayaran." };
    return res.redirect("/admin/pembayaran");
  }
  if (req.body.id) {
    db.updatePaymentMethod(req.body.id, payload);
    req.session.flash = { type: "success", message: "Metode pembayaran diperbarui." };
  } else {
    db.createPaymentMethod(payload);
    req.session.flash = { type: "success", message: "Metode pembayaran ditambahkan." };
  }
  res.redirect("/admin/pembayaran");
});

router.post("/pembayaran/:id/status", (req, res) => {
  const method = db.getPaymentMethods().find((item) => item.id === Number(req.params.id));
  if (!method) {
    req.session.flash = { type: "error", message: "Metode tidak ditemukan." };
    return res.redirect("/admin/pembayaran");
  }
  db.setPaymentMethodActive(method.id, !method.active);
  req.session.flash = {
    type: "success",
    message: method.active ? "Metode dinonaktifkan." : "Metode diaktifkan.",
  };
  res.redirect("/admin/pembayaran");
});

router.get("/tarif", (req, res) => {
  res.render("admin/pricing", {
    title: "Manajemen Tarif & Harga",
    pricing: db.getPricingSettings(),
    vehicles: db.getVehicles(),
    tariffs: db.getZoneTariffs(),
  });
});

router.post("/tarif", (req, res) => {
  db.updatePricing(req.body);
  req.session.flash = { type: "success", message: "Tarif dan harga tersimpan. Katalog customer memakai nominal baru." };
  res.redirect("/admin/tarif");
});

router.post("/pesanan/:id/konfirmasi", async (req, res) => {
  const result = db.confirmOrder(req.params.id);
  if (!result) {
    req.session.flash = { type: "error", message: "Pesanan tidak ditemukan." };
    return res.redirect("/admin/pesanan");
  }
  if (result.locked) {
    req.session.flash = { type: "error", message: "Pesanan selesai tidak diubah menjadi dikonfirmasi." };
    return res.redirect("/admin/pesanan");
  }
  if (result.already) {
    req.session.flash = { type: "error", message: "Pesanan ini sudah dikonfirmasi." };
    return res.redirect("/admin/pesanan");
  }
  let mailNote = "Email konfirmasi terkirim.";
  try {
    const mail = await sendBookingConfirmed(result.order);
    if (!mail.sent) {
      mailNote = "Status Dikonfirmasi tersimpan. Email belum terkirim karena SMTP belum diisi di file .env.";
    }
  } catch (error) {
    mailNote = "Status Dikonfirmasi tersimpan, tetapi pengiriman email gagal.";
  }
  req.session.flash = {
    type: "success",
    message: `Pesanan #${result.order.id} dikonfirmasi. ${mailNote}`,
  };
  res.redirect("/admin/pesanan");
});

router.get("/zona", (req, res) => {
  res.render("admin/zones", {
    title: "Zona & Tarif",
    tariffs: db.getZoneTariffs(),
  });
});

router.post("/zona", (req, res) => {
  const ids = [].concat(req.body.id || []);
  const prices = [].concat(req.body.price || []);
  db.updateZoneTariffs(ids.map((id, index) => ({ id, price: prices[index] })));
  req.session.flash = { type: "success", message: "Tarif zona berhasil disimpan." };
  res.redirect("/admin/zona");
});

function readBank(body) {
  return {
    nama_bank: String(body.nama_bank || "").trim(),
    nomor_rekening: String(body.nomor_rekening || "").replace(/\s/g, ""),
    atas_nama: String(body.atas_nama || "").trim(),
  };
}

function bankError(account) {
  if (!account.nama_bank || !account.atas_nama) {
    return "Nama bank dan atas nama wajib diisi.";
  }
  if (!/^\d{6,20}$/.test(account.nomor_rekening)) {
    return "Nomor rekening harus 6–20 digit.";
  }
  return "";
}

router.get("/pengaturan", (req, res) => {
  const editingId = Number(req.query.rekening || 0);
  res.render("admin/settings", {
    title: "Pengaturan Perusahaan",
    settings: db.getCompanySettings(),
    accounts: db.getBankAccounts(),
    editing: db.getBankAccounts().find((item) => item.id === editingId) || null,
  });
});

router.post("/pengaturan", (req, res) => {
  const email = String(req.body.email || "").trim();
  const phone = String(req.body.phone || "").trim();
  if (!isValidEmail(email)) {
    req.session.flash = { type: "error", message: "Email perusahaan tidak valid." };
    return res.redirect("/admin/pengaturan");
  }
  if (phone.replace(/\D/g, "").length < 8) {
    req.session.flash = { type: "error", message: "Nomor telepon perusahaan terlalu pendek." };
    return res.redirect("/admin/pengaturan");
  }
  const address = String(req.body.address || "").trim();
  if (address.length < 8) {
    req.session.flash = { type: "error", message: "Lokasi perusahaan wajib diisi." };
    return res.redirect("/admin/pengaturan");
  }
  db.updateCompanySettings({ email, phone, address });
  req.session.flash = { type: "success", message: "Kontak perusahaan berhasil diperbarui." };
  res.redirect("/admin/pengaturan");
});

router.post("/pengaturan/rekening", (req, res) => {
  const account = readBank(req.body);
  const error = bankError(account);
  if (error) {
    req.session.flash = { type: "error", message: error };
    return res.redirect("/admin/pengaturan");
  }
  if (req.body.id) {
    const updated = db.updateBankAccount(req.body.id, account);
    req.session.flash = {
      type: updated ? "success" : "error",
      message: updated ? "Rekening berhasil diubah." : "Rekening tidak ditemukan.",
    };
  } else {
    db.createBankAccount(account);
    req.session.flash = { type: "success", message: "Rekening bank berhasil ditambahkan." };
  }
  res.redirect("/admin/pengaturan");
});

router.post("/pengaturan/rekening/:id/hapus", (req, res) => {
  const removed = db.deleteBankAccount(req.params.id);
  req.session.flash = {
    type: removed ? "success" : "error",
    message: removed ? "Rekening dihapus." : "Rekening tidak ditemukan.",
  };
  res.redirect("/admin/pengaturan");
});

function removeUpload(urlPath) {
  if (!urlPath || !String(urlPath).startsWith("/uploads/")) return;
  const file = path.join(__dirname, "..", "..", "public", urlPath);
  fs.unlink(file, () => {});
}

function readVehicle(body) {
  return {
    name: String(body.name || "").trim(),
    brand: String(body.brand || "").trim(),
    type: String(body.type || "MPV"),
    transmission: String(body.transmission || "Manual"),
    seats: Number(body.seats) || 5,
    city: String(body.city || "Jakarta").trim(),
    pricePerDay: Number(body.pricePerDay) || 0,
    image:
      String(body.image || "").trim() ||
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
    status: body.status === "rented" ? "rented" : "available",
  };
}

module.exports = router;
