const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { quote, driverOvertime, lateReturnFee } = require("./finance");

const APP_NAME = "Jalanin Rent Car & Tour Service";

// Support Railway volume mount for persistent storage
// Netlify Functions use /tmp (temporary - data will be lost)
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "data")
  : process.env.NETLIFY
    ? path.join("/tmp", "data")
    : path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function load() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

async function init() {
  if (!fs.existsSync(DB_PATH)) {

  const adminPassword = await bcrypt.hash("admin123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);

  save(await defaultData(adminPassword, customerPassword));
  }

  const data = load();
  data.appName = APP_NAME;
  save(migrate(data));
}

async function defaultData(adminPassword, customerPassword) {
  return {
    appName: APP_NAME,
    users: [
      {
        id: 1,
        name: "Admin Rental",
        email: "admin@rental.test",
        password: adminPassword,
        role: "admin",
      },
      {
        id: 2,
        name: "Budi Pelanggan",
        email: "customer@rental.test",
        password: customerPassword,
        role: "customer",
      },
    ],
    vehicles: [
      {
        id: 1,
        name: "Toyota Avanza",
        brand: "Toyota",
        type: "MPV",
        transmission: "Manual",
        seats: 7,
        city: "Jakarta",
        pricePerDay: 350000,
        image:
          "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80",
        status: "available",
      },
      {
        id: 2,
        name: "Honda Brio",
        brand: "Honda",
        type: "Hatchback",
        transmission: "Automatic",
        seats: 5,
        city: "Jakarta",
        pricePerDay: 250000,
        image:
          "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
        status: "available",
      },
      {
        id: 3,
        name: "Toyota Innova Reborn",
        brand: "Toyota",
        type: "MPV",
        transmission: "Automatic",
        seats: 7,
        city: "Bandung",
        pricePerDay: 550000,
        image:
          "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80",
        status: "available",
      },
      {
        id: 4,
        name: "Mitsubishi Pajero Sport",
        brand: "Mitsubishi",
        type: "SUV",
        transmission: "Automatic",
        seats: 7,
        city: "Surabaya",
        pricePerDay: 900000,
        image:
          "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80",
        status: "available",
      },
      {
        id: 5,
        name: "Honda Civic",
        brand: "Honda",
        type: "Sedan",
        transmission: "Automatic",
        seats: 5,
        city: "Jakarta",
        pricePerDay: 600000,
        image:
          "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80",
        status: "available",
      },
      {
        id: 6,
        name: "Suzuki Ertiga",
        brand: "Suzuki",
        type: "MPV",
        transmission: "Manual",
        seats: 7,
        city: "Bali",
        pricePerDay: 375000,
        image:
          "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
        status: "available",
      },
    ],
    employees: [
      {
        id: 1,
        name: "Sari Wulandari",
        position: "Admin Operasional",
        phone: "0812-1111-2222",
        baseSalary: 5500000,
        jobRole: "staff",
      },
      {
        id: 2,
        name: "Andi Pratama",
        position: "Mekanik",
        phone: "0813-3333-4444",
        baseSalary: 4800000,
        jobRole: "staff",
      },
      {
        id: 3,
        name: "Dewi Lestari",
        position: "Customer Service",
        phone: "0812-5555-6666",
        baseSalary: 4500000,
        jobRole: "staff",
      },
      {
        id: 4,
        name: "Rizky Maulana",
        position: "Sopir",
        phone: "0812-7777-8888",
        baseSalary: 4200000,
        jobRole: "driver",
      },
      {
        id: 5,
        name: "Hendra Gunawan",
        position: "Sopir Bandara",
        phone: "0813-9999-0000",
        baseSalary: 4300000,
        jobRole: "driver",
      },
    ],
    payrolls: [],
    bookings: [],
    orders: [],
    transactions: [],
    expenses: [],
    company_settings: {
      email: "herylibing01@gmail.com",
      phone: "082266490281",
      address: "Jl. Tukad Pakerisan, Dauh Puri Klod, Kec. Denpasar Bar., Kota Denpasar, Bali 80225",
    },
    bank_accounts: [],
    payment_methods: defaultPaymentMethods(),
    zone_tariffs: defaultZoneTariffs(),
    reviews: [],
    testimonials: [],
    site_traffic: [],
    pricing_settings: defaultPricing(),
  };
}

function defaultPricing() {
  return {
    airportBase: 350000,
    defaultDailyRate: 350000,
    driverDailyFee: 150000,
    overtimeRate: 0.1,
    lateFeeRate: 0.1,
    areaMultiplier: { zona_1: 1, zona_2: 1.5, zona_3: 2 },
    addons: [
      { key: "uang_makan", label: "Uang Makan Driver", price: 75000 },
      { key: "parkir_tol", label: "Biaya Parkir & Tol", price: 100000 },
      { key: "air_mineral", label: "Air Mineral Tambahan", price: 25000 },
    ],
    tours: [
      { name: "City tour 1 hari", price: 750000, text: "Keliling ikon kota dalam satu hari, cocok untuk tamu dengan waktu singkat." },
      { name: "Paket 2 hari 1 malam", price: 1500000, text: "Dua hari perjalanan dengan jeda menginap, ritme lebih longgar." },
      { name: "Paket 3 hari 2 malam", price: 2200000, text: "Lintas kawasan Bali dengan jadwal yang sudah disusun." },
      { name: "Custom itinerary", price: 1000000, text: "Rute, villa, dan objek wisata mengikuti catatan Anda." },
    ],
  };
}

function normalizePricing(raw) {
  const base = defaultPricing();
  const source = raw || {};
  return {
    airportBase: Number(source.airportBase) || base.airportBase,
    defaultDailyRate: Number(source.defaultDailyRate) || base.defaultDailyRate,
    driverDailyFee: Number(source.driverDailyFee) || base.driverDailyFee,
    overtimeRate: Number(source.overtimeRate) || base.overtimeRate,
    lateFeeRate: Number(source.lateFeeRate) || base.lateFeeRate,
    areaMultiplier: {
      zona_1: Number(source.areaMultiplier?.zona_1) || base.areaMultiplier.zona_1,
      zona_2: Number(source.areaMultiplier?.zona_2) || base.areaMultiplier.zona_2,
      zona_3: Number(source.areaMultiplier?.zona_3) || base.areaMultiplier.zona_3,
    },
    addons: base.addons.map((item) => {
      const found = (source.addons || []).find((addon) => addon.key === item.key);
      return found ? { ...item, price: Number(found.price) || 0 } : item;
    }),
    tours: base.tours.map((item) => {
      const found = (source.tours || []).find((tour) => tour.name === item.name);
      return found ? { ...item, price: Number(found.price) || 0, text: found.text || item.text } : item;
    }),
  };
}

function getPricingSettings() {
  return normalizePricing(load().pricing_settings);
}

function defaultPaymentMethods() {
  return [
    { id: 1, type: "qris", name: "QRIS", active: true, barcodeUrl: "", note: "Pindai kode QRIS saat pembayaran." },
    { id: 2, type: "ewallet", name: "OVO", active: true, barcodeUrl: "", note: "" },
    { id: 3, type: "ewallet", name: "DANA", active: true, barcodeUrl: "", note: "" },
    { id: 4, type: "ewallet", name: "GoPay", active: true, barcodeUrl: "", note: "" },
    { id: 5, type: "ewallet", name: "ShopeePay", active: true, barcodeUrl: "", note: "" },
    { id: 6, type: "transfer_bank", name: "Transfer Bank", active: true, barcodeUrl: "", note: "" },
    { id: 7, type: "kartu_kredit", name: "Kartu Kredit", active: true, barcodeUrl: "", note: "Visa, Mastercard, dan JCB." },
  ];
}

function defaultZoneTariffs() {
  const prices = {
    airport: { zona_1: 200000, zona_2: 350000, zona_3: 500000 },
    rental: { zona_1: 50000, zona_2: 150000, zona_3: 250000 },
    antar_jemput: { zona_1: 75000, zona_2: 150000, zona_3: 250000 },
  };
  const labels = {
    zona_1: "Zona 1 (Dekat)",
    zona_2: "Zona 2 (Sedang)",
    zona_3: "Zona 3 (Jauh)",
  };
  const rows = [];
  let id = 1;
  Object.entries(prices).forEach(([service, zones]) => {
    Object.entries(zones).forEach(([zone, price]) => {
      rows.push({ id: id++, service, zone, label: labels[zone], price, active: true });
    });
  });
  return rows;
}

function inferJobRole(position) {
  const text = String(position || "").toLowerCase();
  if (text.includes("sopir") || text.includes("driver")) {
    return "driver";
  }
  return "staff";
}

function migrate(data) {
  data.appName = APP_NAME;
  data.orders = Array.isArray(data.orders) ? data.orders : [];
  data.bookings = Array.isArray(data.bookings) ? data.bookings : [];
  data.transactions = Array.isArray(data.transactions) ? data.transactions : [];
  data.expenses = Array.isArray(data.expenses) ? data.expenses : [];
  data.payrolls = Array.isArray(data.payrolls) ? data.payrolls : [];
  data.company_settings = {
    email: String(data.company_settings?.email || "herylibing01@gmail.com").trim(),
    phone: String(data.company_settings?.phone || "082266490281").trim(),
    address: String(
      data.company_settings?.address ||
        "Jl. Tukad Pakerisan, Dauh Puri Klod, Kec. Denpasar Bar., Kota Denpasar, Bali 80225"
    ).trim(),
  };
  data.bank_accounts = Array.isArray(data.bank_accounts) ? data.bank_accounts : [];
  if (!Array.isArray(data.payment_methods) || data.payment_methods.length === 0) {
    data.payment_methods = defaultPaymentMethods();
  }
  if (!Array.isArray(data.zone_tariffs) || data.zone_tariffs.length === 0) {
    data.zone_tariffs = defaultZoneTariffs();
  }
  data.reviews = Array.isArray(data.reviews) ? data.reviews : [];
  data.testimonials = Array.isArray(data.testimonials) ? data.testimonials : [];
  data.site_traffic = Array.isArray(data.site_traffic) ? data.site_traffic : [];
  data.pricing_settings = normalizePricing(data.pricing_settings);
  data.employees = (data.employees || []).map((employee) => ({
    ...employee,
    jobRole: employee.jobRole || inferJobRole(employee.position),
  }));

  const hasDriver = data.employees.some((employee) => employee.jobRole === "driver");
  if (!hasDriver) {
    const firstId = nextId(data.employees);
    data.employees.push(
      {
        id: firstId,
        name: "Rizky Maulana",
        position: "Sopir",
        phone: "0812-7777-8888",
        baseSalary: 4200000,
        jobRole: "driver",
      },
      {
        id: firstId + 1,
        name: "Hendra Gunawan",
        position: "Sopir Bandara",
        phone: "0813-9999-0000",
        baseSalary: 4300000,
        jobRole: "driver",
      }
    );
  }

  data.bookings.forEach((booking) => {
    const exists = data.orders.some(
      (order) => order.sourceBookingId === booking.id
    );
    if (exists) {
      return;
    }
    data.orders.push({
      id: nextId(data.orders),
      serviceType: "rental",
      status: booking.status === "confirmed" ? "baru" : "baru",
      customerName: booking.customerName,
      customerEmail: "",
      customerPhone: "",
      userId: booking.userId || null,
      assignedEmployeeId: null,
      assignedEmployeeName: null,
      details: {
        rentalType: "Lepas kunci",
        pickupDate: booking.startDate,
        durationDays: booking.days,
        vehicleName: booking.vehicleName,
        city: booking.city,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
      },
      sourceBookingId: booking.id,
      createdAt: booking.createdAt || new Date().toISOString(),
    });
  });

  return data;
}

function findUserByEmail(email) {
  return load().users.find(
    (user) => user.email.toLowerCase() === String(email).toLowerCase()
  );
}

function createUser({ name, email, password, role, phone }) {
  const data = load();
  const user = {
    id: nextId(data.users),
    name,
    email,
    password,
    role,
    phone: phone || "",
  };
  data.users.push(user);
  save(data);
  return user;
}

function getVehicles() {
  return load().vehicles;
}

function getVehicleById(id) {
  return load().vehicles.find((vehicle) => vehicle.id === Number(id));
}

function createVehicle(payload) {
  const data = load();
  const vehicle = { id: nextId(data.vehicles), ...payload };
  data.vehicles.push(vehicle);
  save(data);
  return vehicle;
}

function updateVehicle(id, payload) {
  const data = load();
  const index = data.vehicles.findIndex((vehicle) => vehicle.id === Number(id));
  if (index === -1) {
    return null;
  }
  data.vehicles[index] = { ...data.vehicles[index], ...payload, id: Number(id) };
  save(data);
  return data.vehicles[index];
}

function deleteVehicle(id) {
  const data = load();
  data.vehicles = data.vehicles.filter((vehicle) => vehicle.id !== Number(id));
  save(data);
}

function getEmployees() {
  return load().employees;
}

function getEmployeeById(id) {
  return load().employees.find((employee) => employee.id === Number(id));
}

function createEmployee(payload) {
  const data = load();
  const employee = { id: nextId(data.employees), ...payload };
  data.employees.push(employee);
  save(data);
  return employee;
}

function updateEmployee(id, payload) {
  const data = load();
  const index = data.employees.findIndex(
    (employee) => employee.id === Number(id)
  );
  if (index === -1) {
    return null;
  }
  data.employees[index] = {
    ...data.employees[index],
    ...payload,
    id: Number(id),
  };
  save(data);
  return data.employees[index];
}

function deleteEmployee(id) {
  const data = load();
  data.employees = data.employees.filter(
    (employee) => employee.id !== Number(id)
  );
  save(data);
}

function getPayrolls() {
  return load().payrolls.sort((a, b) => b.id - a.id);
}

function createPayroll(payload) {
  const data = load();
  const payroll = { id: nextId(data.payrolls), ...payload };
  data.payrolls.push(payroll);
  save(data);
  return payroll;
}

function getBookings() {
  return load().bookings.sort((a, b) => b.id - a.id);
}

function getBookingsByUser(userId) {
  return load()
    .bookings.filter((booking) => booking.userId === Number(userId))
    .sort((a, b) => b.id - a.id);
}

function createBooking(payload) {
  const data = load();
  const booking = { id: nextId(data.bookings), ...payload };
  data.bookings.push(booking);
  save(data);
  return booking;
}

function getOrders() {
  return load().orders.sort((a, b) => b.id - a.id);
}

function getOrdersByUser(userId) {
  return load()
    .orders.filter((order) => order.userId === Number(userId))
    .sort((a, b) => b.id - a.id);
}

function getOrderById(id) {
  return load().orders.find((order) => order.id === Number(id));
}

function createOrder(payload) {
  const data = load();
  const order = {
    id: nextId(data.orders),
    status: "baru",
    assignedEmployeeId: null,
    assignedEmployeeName: null,
    createdAt: new Date().toISOString(),
    ...payload,
  };
  data.orders.push(order);
  save(data);
  return order;
}

function assignOrder(id, employee) {
  const data = load();
  const index = data.orders.findIndex((order) => order.id === Number(id));
  if (index === -1) {
    return null;
  }
  const current = data.orders[index];
  data.orders[index] = {
    ...current,
    assignedEmployeeId: employee.id,
    assignedEmployeeName: employee.name,
    status: current.status === "selesai" || current.status === "dikonfirmasi" ? current.status : "ditugaskan",
  };
  save(data);
  return data.orders[index];
}

function confirmOrder(id) {
  const data = load();
  const index = (data.orders || []).findIndex((order) => order.id === Number(id));
  if (index === -1) {
    return null;
  }
  const order = data.orders[index];
  if (order.status === "selesai") {
    return { order, locked: true };
  }
  if (order.status === "dikonfirmasi") {
    return { order, already: true };
  }
  data.orders[index] = {
    ...order,
    status: "dikonfirmasi",
    confirmedAt: new Date().toISOString(),
  };
  save(data);
  return { order: data.orders[index] };
}

function customerHasCompletedOrder(user) {
  if (!user) return false;
  const email = String(user.email || "").toLowerCase();
  return (load().orders || []).some((order) => {
    if (order.status !== "selesai") return false;
    if (user.id && order.userId === user.id) return true;
    return email && String(order.customerEmail || "").toLowerCase() === email;
  });
}

function completeOrder(id, extras = {}) {
  const data = load();
  data.transactions = data.transactions || [];
  data.expenses = data.expenses || [];
  data.payrolls = data.payrolls || [];
  const index = data.orders.findIndex((order) => order.id === Number(id));
  if (index === -1) {
    return null;
  }

  const order = data.orders[index];
  if (order.status === "selesai") {
    return { order, alreadyDone: true, amount: 0, commission: 0 };
  }
  if (order.status === "cancel") {
    return { order, cancelled: true, amount: 0, commission: 0 };
  }
  if (order.serviceType !== "rental" && order.serviceType !== "tour") {
    data.orders[index] = {
      ...order,
      status: "selesai",
      completedAt: new Date().toISOString(),
    };
    save(data);
    return { order: data.orders[index], skipped: true, amount: 0, commission: 0 };
  }

  const employee = data.employees.find(
    (item) => item.id === order.assignedEmployeeId
  );
  const vehicle = (data.vehicles || []).find(
    (item) => item.name === order.details?.vehicleName
  );
  const pricing = getPricingSettings();
  const dailyRate = vehicle ? vehicle.pricePerDay : pricing.defaultDailyRate;
  const rentalType = String(order.details?.rentalType || "");
  const hoursUsed = Number(extras.hoursUsed);
  const lateHours = Number(extras.lateHours);
  const overtime = /sopir/i.test(rentalType)
    ? driverOvertime(hoursUsed, dailyRate, pricing.overtimeRate)
    : { amount: 0, extraHours: 0, hourly: 0 };
  const lateFee = /lepas/i.test(rentalType) ? lateReturnFee(lateHours, dailyRate, pricing.lateFeeRate) : 0;
  order.details = {
    ...(order.details || {}),
    hoursUsed: Number.isFinite(hoursUsed) ? hoursUsed : order.details?.hoursUsed,
    overtimeAmount: overtime.amount,
    overtimeHours: overtime.extraHours,
    lateHours: Number.isFinite(lateHours) ? lateHours : order.details?.lateHours,
    lateFee,
  };
  const priced = quote(order, data.vehicles, employee);
  const today = new Date().toISOString().slice(0, 10);

  if (!data.transactions.some((item) => item.orderId === order.id)) {
    data.transactions.push({
      id: nextId(data.transactions),
      orderId: order.id,
      serviceType: order.serviceType,
      amount: priced.amount,
      status: "lunas",
      date: today,
      description: `Pembayaran ${order.serviceType === "rental" ? "rental" : "paket wisata"} #${order.id} — ${order.customerName}`,
    });
  }

  if (overtime.amount > 0 && !data.transactions.some((item) => item.orderId === order.id && item.kind === "overtime")) {
    data.transactions.push({
      id: nextId(data.transactions),
      orderId: order.id,
      serviceType: order.serviceType,
      amount: overtime.amount,
      status: "Success",
      kind: "overtime",
      date: today,
      description: `Overtime sopir ${overtime.extraHours} jam #${order.id}`,
    });
  }
  if (lateFee > 0 && !data.transactions.some((item) => item.orderId === order.id && item.kind === "late_fee")) {
    data.transactions.push({
      id: nextId(data.transactions),
      orderId: order.id,
      serviceType: order.serviceType,
      amount: lateFee,
      status: "Success",
      kind: "late_fee",
      date: today,
      description: `Denda keterlambatan lepas kunci #${order.id}`,
    });
  }

  if (priced.commission > 0 && employee) {
    const period = today.slice(0, 7);
    const existing = data.payrolls.find(
      (item) =>
        item.employeeId === employee.id &&
        item.period === period &&
        item.source !== "komisi_sopir"
    );
    if (existing) {
      existing.bonus = Number(existing.bonus) + priced.commission;
      existing.netSalary =
        Number(existing.baseSalary) + existing.bonus - Number(existing.deduction || 0);
    } else if (
      !data.payrolls.some(
        (item) => item.orderId === order.id && item.source === "komisi_sopir"
      )
    ) {
      data.payrolls.push({
        id: nextId(data.payrolls),
        employeeId: employee.id,
        employeeName: employee.name,
        position: employee.position,
        period,
        baseSalary: 0,
        bonus: priced.commission,
        deduction: 0,
        netSalary: priced.commission,
        source: "komisi_sopir",
        orderId: order.id,
        createdAt: new Date().toISOString(),
      });
    }

    if (!data.expenses.some((item) => item.orderId === order.id && item.category === "komisi_sopir")) {
      data.expenses.push({
        id: nextId(data.expenses),
        category: "komisi_sopir",
        amount: priced.commission,
        status: "calon",
        date: today,
        orderId: order.id,
        employeeId: employee.id,
        employeeName: employee.name,
        description: `Komisi sopir 10% pesanan #${order.id} (${employee.name})`,
      });
    }
  }

  data.orders[index] = {
    ...order,
    status: "selesai",
    paidAmount: priced.amount,
    completedAt: new Date().toISOString(),
  };
  save(data);
  return {
    order: data.orders[index],
    alreadyDone: false,
    amount: priced.amount,
    commission: priced.commission,
  };
}

const EXPENSE_CATEGORIES = ["gaji", "komisi_sopir", "maintenance", "operasional"];

function createExpense(payload) {
  const data = load();
  data.expenses = data.expenses || [];
  const expense = {
    id: nextId(data.expenses),
    category: EXPENSE_CATEGORIES.includes(payload.category)
      ? payload.category
      : "operasional",
    amount: Number(payload.amount) || 0,
    status: payload.status === "terbayar" ? "terbayar" : "calon",
    date: payload.date || new Date().toISOString().slice(0, 10),
    orderId: payload.orderId || null,
    employeeId: payload.employeeId || null,
    employeeName: payload.employeeName || "",
    description: payload.description || "",
  };
  data.expenses.push(expense);
  save(data);
  return expense;
}

function getTransactions() {
  return (load().transactions || []).slice().sort((a, b) => b.id - a.id);
}

function getExpenses() {
  return (load().expenses || []).slice().sort((a, b) => b.id - a.id);
}

function createTransaction(bookingData) {
  const data = load();
  data.transactions = data.transactions || [];
  const bookingId = Number(bookingData.id);
  const existing = data.transactions.find(
    (item) => item.bookingId === bookingId || item.orderId === bookingId
  );
  if (existing) {
    return existing;
  }
  const transaction = {
    id: nextId(data.transactions),
    bookingId,
    orderId: bookingId,
    serviceType: bookingData.serviceType,
    amount: Number(bookingData.totalPrice || bookingData.details?.totalPrice || 0),
    status: "Success",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: bookingData.paymentMethod || "",
    description: `Pembayaran ${bookingData.serviceType || "layanan"} #${bookingId} — ${bookingData.customerName || ""}`.trim(),
  };
  data.transactions.push(transaction);
  save(data);
  return transaction;
}

function calculatePayroll(period) {
  const data = load();
  const month = period || new Date().toISOString().slice(0, 7);
  const lines = (data.employees || []).map((employee) => {
    const commission = (data.expenses || [])
      .filter(
        (item) =>
          item.category === "komisi_sopir" &&
          item.employeeId === employee.id &&
          String(item.date || "").startsWith(month)
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      employeeId: employee.id,
      name: employee.name,
      baseSalary: Number(employee.baseSalary || 0),
      commission,
      total: Number(employee.baseSalary || 0) + commission,
    };
  });
  return {
    period: month,
    lines,
    baseTotal: lines.reduce((sum, line) => sum + line.baseSalary, 0),
    commissionTotal: lines.reduce((sum, line) => sum + line.commission, 0),
    total: lines.reduce((sum, line) => sum + line.total, 0),
  };
}

function getFinancialSummary(filter = {}) {
  const data = load();
  const { startDate, endDate, period } = filter;
  
  // Determine date range
  let filterStartDate, filterEndDate;
  if (period) {
    filterStartDate = period;
    filterEndDate = period;
  } else if (startDate && endDate) {
    filterStartDate = startDate;
    filterEndDate = endDate;
  } else {
    const month = new Date().toISOString().slice(0, 7);
    filterStartDate = month;
    filterEndDate = month;
  }

  // Filter transactions (income) - only from confirmed or completed orders
  const confirmedOrders = (data.bookings || []).filter(
    order => order.status === 'terkonfirmasi' || order.status === 'selesai' || order.status === 'dalam_perjalanan'
  );
  const confirmedOrderIds = confirmedOrders.map(o => o.id);
  
  const paidTransactions = (data.transactions || []).filter((item) =>
    ["Success", "success", "lunas"].includes(item.status) &&
    confirmedOrderIds.includes(item.bookingId || item.orderId)
  );
  
  const incomeByDate = paidTransactions.filter((item) => {
    const date = String(item.date || "").slice(0, period ? 7 : 10);
    if (period) {
      return date.startsWith(filterStartDate);
    }
    return date >= filterStartDate && date <= filterEndDate;
  });
  
  const totalIncome = incomeByDate.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  // Categorize income
  const rentalIncome = incomeByDate
    .filter(item => item.serviceType === 'Rental' || item.serviceType === 'rental')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const tourIncome = incomeByDate
    .filter(item => item.serviceType === 'Tour' || item.serviceType === 'tour')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const airportIncome = incomeByDate
    .filter(item => item.serviceType === 'Airport Transfer' || item.serviceType === 'airport')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Filter expenses
  const expensesByDate = (data.expenses || []).filter((item) => {
    const date = String(item.date || "").slice(0, period ? 7 : 10);
    if (period) {
      return date.startsWith(filterStartDate);
    }
    return date >= filterStartDate && date <= filterEndDate;
  });
  
  const totalExpenses = expensesByDate.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  // Categorize expenses
  const operationalExpenses = expensesByDate
    .filter(item => item.category === 'operasional' || item.category === 'maintenance')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const salaryExpenses = expensesByDate
    .filter(item => item.category === 'gaji')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const commissionExpenses = expensesByDate
    .filter(item => item.category === 'komisi_sopir')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const payroll = calculatePayroll(period || filterStartDate);
  const netProfit = totalIncome - totalExpenses;

  return {
    period: period || filterStartDate,
    totalIncome,
    totalExpenses,
    netProfit,
    incomeBreakdown: {
      rental: rentalIncome,
      tour: tourIncome,
      airport: airportIncome,
    },
    expenseBreakdown: {
      operational: operationalExpenses,
      salary: salaryExpenses,
      commission: commissionExpenses,
    },
    payroll,
  };
}

function getFinanceByCategory(filter = {}) {
  const data = load();
  const { startDate, endDate, period } = filter;
  
  let filterStartDate, filterEndDate;
  if (period) {
    filterStartDate = period;
    filterEndDate = period;
  } else if (startDate && endDate) {
    filterStartDate = startDate;
    filterEndDate = endDate;
  } else {
    const month = new Date().toISOString().slice(0, 7);
    filterStartDate = month;
    filterEndDate = month;
  }

  // Get all transactions and expenses with filtering
  const filteredTransactions = (data.transactions || []).filter((item) => {
    const date = String(item.date || "").slice(0, period ? 7 : 10);
    if (period) {
      return date.startsWith(filterStartDate);
    }
    return date >= filterStartDate && date <= filterEndDate;
  });

  const filteredExpenses = (data.expenses || []).filter((item) => {
    const date = String(item.date || "").slice(0, period ? 7 : 10);
    if (period) {
      return date.startsWith(filterStartDate);
    }
    return date >= filterStartDate && date <= filterEndDate;
  });

  return {
    transactions: filteredTransactions,
    expenses: filteredExpenses,
  };
}

function checkVehicleAvailability(vehicleName, startDate, endDate) {
  const data = load();
  const bookings = data.bookings || [];
  
  const conflictingBookings = bookings.filter(booking => {
    if (booking.details?.vehicleName !== vehicleName) return false;
    if (booking.status === 'cancel') return false;
    
    const bookingStart = booking.details?.pickupDate;
    const bookingEnd = booking.details?.dropoffDate || bookingStart;
    
    if (!bookingStart) return false;
    
    // Check for date overlap
    return (startDate <= bookingEnd && endDate >= bookingStart);
  });
  
  return conflictingBookings.length > 0;
}

function updateVehicleStatus(vehicleName, startDate, endDate, status) {
  const data = load();
  const vehicles = data.vehicles || [];
  const vehicleIndex = vehicles.findIndex(v => v.name === vehicleName);
  
  if (vehicleIndex !== -1) {
    // Note: In a real system, you'd have a bookings array on the vehicle
    // For now, we'll just keep the vehicle status as is since availability
    // is checked dynamically via checkVehicleAvailability
    save(data);
  }
  
  return true;
}

function financeSummary() {
  return getFinancialSummary();
}

function updateOrderSchedule(id, { pickupDate, pickupTime }) {
  const data = load();
  const index = (data.orders || []).findIndex((order) => order.id === Number(id));
  if (index === -1) {
    return null;
  }
  const order = data.orders[index];
  const created = new Date(order.createdAt || 0).getTime();
  if (!order.createdAt || Number.isNaN(created) || Date.now() - created > 60 * 60 * 1000) {
    return { error: "Pesanan Tidak Dapat Diubah" };
  }
  order.details = {
    ...(order.details || {}),
    pickupDate,
    pickupTime,
  };
  const bookingIndex = (data.bookings || []).findIndex((item) => item.id === order.id);
  if (bookingIndex !== -1) {
    data.bookings[bookingIndex].details = {
      ...(data.bookings[bookingIndex].details || {}),
      pickupDate,
      pickupTime,
    };
  }
  save(data);
  return { order };
}

function generateDriverToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

function generateStaffToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

function calculateEndDate(pickupDate, durationDays) {
  const pickup = new Date(pickupDate);
  const endDate = new Date(pickup);
  endDate.setDate(endDate.getDate() + (durationDays || 1));
  return endDate.toISOString().split('T')[0];
}

function isBookingExpired(booking) {
  if (!booking.details?.pickupDate || !booking.details?.durationDays) {
    return false;
  }
  const endDate = calculateEndDate(booking.details.pickupDate, booking.details.durationDays);
  const today = new Date().toISOString().split('T')[0];
  return today > endDate;
}

function saveServiceBooking(payload) {
  const data = load();
  data.bookings = data.bookings || [];
  data.orders = data.orders || [];
  const id = Math.max(nextId(data.bookings), nextId(data.orders));
  
  const withDriver = payload.details?.rentalType && /sopir/i.test(payload.details.rentalType);
  const driverToken = withDriver ? generateDriverToken() : null;
  
  const lepasKunci = payload.details?.rentalType && /lepas/i.test(payload.details.rentalType);
  const staffToken = lepasKunci ? generateStaffToken() : null;
  
  const record = {
    id,
    appName: APP_NAME,
    status: "tunggu_pembayaran",
    assignedEmployeeId: null,
    assignedEmployeeName: null,
    driverToken: driverToken,
    staffToken: staffToken,
    createdAt: new Date().toISOString(),
    ...payload,
  };
  data.bookings.push(record);
  data.orders.push(record);
  save(data);
  return record;
}

function updateOrderStatus(orderId, newStatus) {
  const data = load();
  const bookingIndex = data.bookings.findIndex(b => b.id === Number(orderId));
  const orderIndex = data.orders.findIndex(o => o.id === Number(orderId));
  
  if (bookingIndex !== -1) {
    data.bookings[bookingIndex].status = newStatus;
  }
  if (orderIndex !== -1) {
    data.orders[orderIndex].status = newStatus;
  }
  
  save(data);
  return true;
}

function cashBook(filter = {}) {
  const data = load();
  const { startDate, endDate, period } = filter;
  
  let filterStartDate, filterEndDate;
  const hasFilter = startDate || endDate || period;
  
  if (period) {
    filterStartDate = period;
    filterEndDate = period;
  } else if (startDate && endDate) {
    filterStartDate = startDate;
    filterEndDate = endDate;
  }
  
  // Get order IDs that are not cancelled
  const activeOrderIds = (data.bookings || [])
    .filter(order => order.status !== 'cancel')
    .map(order => order.id);
  
  const rows = [
    ...(data.transactions || [])
      .filter(item => !item.orderId || activeOrderIds.includes(item.orderId))
      .map((item) => ({
        date: item.date,
        direction: "masuk",
        category: item.serviceType,
        description: item.description,
        amount: item.amount,
        status: item.status,
        orderId: item.orderId,
      })),
    ...(data.expenses || []).map((item) => ({
      date: item.date,
      direction: "keluar",
      category: item.category,
      description: item.description,
      amount: item.amount,
      status: item.status,
      orderId: item.orderId,
    })),
  ];
  
  const filteredRows = hasFilter
    ? rows.filter(row => {
        const rowDate = row.date;
        if (period) {
          return rowDate.startsWith(filterStartDate);
        }
        return rowDate >= filterStartDate && rowDate <= filterEndDate;
      })
    : rows;
    
  return filteredRows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.orderId || 0) - (a.orderId || 0));
}

function getCompanySettings() {
  const data = load();
  const settings = data.company_settings || {};
  return {
    email: String(settings.email || "herylibing01@gmail.com").trim(),
    phone: String(settings.phone || "082266490281").trim(),
    address: String(
      settings.address ||
        "Jl. Tukad Pakerisan, Dauh Puri Klod, Kec. Denpasar Bar., Kota Denpasar, Bali 80225"
    ).trim(),
  };
}

function updateCompanySettings({ email, phone, address }) {
  const data = load();
  const current = data.company_settings || {};
  data.company_settings = {
    email: String(email ?? current.email ?? "").trim(),
    phone: String(phone ?? current.phone ?? "").trim(),
    address: String(address ?? current.address ?? "").trim(),
  };
  save(data);
  return data.company_settings;
}

function getPaymentMethods() {
  return (load().payment_methods || []).slice().sort((a, b) => a.id - b.id);
}

function createPaymentMethod(payload) {
  const data = load();
  data.payment_methods = data.payment_methods || [];
  const method = {
    id: nextId(data.payment_methods),
    type: String(payload.type || "ewallet"),
    name: String(payload.name || "").trim(),
    active: payload.active !== false,
    barcodeUrl: String(payload.barcodeUrl || "").trim(),
    note: String(payload.note || "").trim(),
  };
  data.payment_methods.push(method);
  save(data);
  return method;
}

function updatePaymentMethod(id, payload) {
  const data = load();
  const index = (data.payment_methods || []).findIndex((item) => item.id === Number(id));
  if (index === -1) return null;
  const current = data.payment_methods[index];
  data.payment_methods[index] = {
    ...current,
    type: String(payload.type || current.type),
    name: String(payload.name || current.name).trim(),
    active: Boolean(payload.active),
    barcodeUrl: String(payload.barcodeUrl ?? current.barcodeUrl ?? "").trim(),
    note: String(payload.note ?? current.note ?? "").trim(),
  };
  save(data);
  return data.payment_methods[index];
}

function setPaymentMethodActive(id, active) {
  const data = load();
  const method = (data.payment_methods || []).find((item) => item.id === Number(id));
  if (!method) return null;
  method.active = Boolean(active);
  save(data);
  return method;
}

function getZoneTariffs() {
  return (load().zone_tariffs || []).slice().sort((a, b) => a.id - b.id);
}

function updateZoneTariffs(rows) {
  const data = load();
  data.zone_tariffs = (data.zone_tariffs || []).map((item) => {
    const next = rows.find((row) => Number(row.id) === item.id);
    if (!next) return item;
    return { ...item, price: Math.max(0, Number(next.price) || 0) };
  });
  save(data);
  return data.zone_tariffs;
}

function getTestimonials() {
  return (load().testimonials || []).slice().sort((a, b) => b.id - a.id);
}

function createTestimonial(payload) {
  const data = load();
  data.testimonials = data.testimonials || [];
  const item = {
    id: nextId(data.testimonials),
    nama_tokoh: String(payload.nama_tokoh || "").trim(),
    jabatan: String(payload.jabatan || "").trim(),
    asal_negara: String(payload.asal_negara || "").trim(),
    teks_testimoni: String(payload.teks_testimoni || "").trim(),
    foto_profil: String(payload.foto_profil || "").trim(),
  };
  data.testimonials.push(item);
  save(data);
  return item;
}

function updateTestimonial(id, payload) {
  const data = load();
  const index = (data.testimonials || []).findIndex((item) => item.id === Number(id));
  if (index === -1) return null;
  data.testimonials[index] = {
    ...data.testimonials[index],
    nama_tokoh: String(payload.nama_tokoh || "").trim(),
    jabatan: String(payload.jabatan || "").trim(),
    asal_negara: String(payload.asal_negara || "").trim(),
    teks_testimoni: String(payload.teks_testimoni || "").trim(),
    foto_profil: payload.foto_profil
      ? String(payload.foto_profil).trim()
      : data.testimonials[index].foto_profil,
    id: Number(id),
  };
  save(data);
  return data.testimonials[index];
}

function deleteTestimonial(id) {
  const data = load();
  const before = (data.testimonials || []).length;
  data.testimonials = (data.testimonials || []).filter((item) => item.id !== Number(id));
  save(data);
  return data.testimonials.length < before;
}

function publicReviewCards() {
  const data = load();
  return (data.reviews || []).map((review) => {
    const name = String(review.nama_customer || "").toLowerCase();
    const order = (data.orders || []).find((item) => {
      if (item.status !== "selesai") return false;
      return String(item.customerName || "").toLowerCase() === name;
    });
    return {
      nama_customer: review.nama_customer,
      rating: Math.max(1, Math.min(5, Number(review.rating) || 0)),
      feedback: review.feedback,
      travelDate: order?.details?.pickupDate || String(review.createdAt || "").slice(0, 10),
    };
  });
}

function getReviews() {
  return (load().reviews || []).slice().sort((a, b) => b.id - a.id);
}

function createReview(payload) {
  const data = load();
  data.reviews = data.reviews || [];
  const review = {
    id: nextId(data.reviews),
    category: payload.category,
    vehicleName: String(payload.vehicleName || "").trim(),
    nama_customer: String(payload.nama_customer || "").trim(),
    rating: Number(payload.rating),
    feedback: String(payload.feedback || "").trim(),
    createdAt: new Date().toISOString(),
  };
  data.reviews.push(review);
  save(data);
  return review;
}

function ratingSummary() {
  const reviews = load().reviews || [];
  const average = (list) => {
    if (!list.length) return null;
    const total = list.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return Math.round((total / list.length) * 10) / 10;
  };
  const vehicles = {};
  reviews
    .filter((item) => item.category === "kendaraan" && item.vehicleName)
    .forEach((item) => {
      vehicles[item.vehicleName] = vehicles[item.vehicleName] || [];
      vehicles[item.vehicleName].push(item);
    });
  const vehicleRatings = {};
  Object.entries(vehicles).forEach(([name, list]) => {
    vehicleRatings[name] = { average: average(list), count: list.length };
  });
  const siteList = reviews.filter((item) => item.category === "situs_web");
  const driverList = reviews.filter((item) => item.category === "layanan_sopir");
  const globalAverage = average(reviews);
  const countLabel =
    reviews.length >= 1000
      ? `${reviews.length.toLocaleString("id-ID")}+`
      : reviews.length.toLocaleString("id-ID");
  const globalText =
    globalAverage == null
      ? "Belum ada ulasan customer"
      : `★ ${globalAverage.toFixed(1)} / 5.0 dari ${countLabel} Ulasan Pengguna`;
  return {
    site: { average: average(siteList), count: siteList.length },
    driver: { average: average(driverList), count: driverList.length },
    vehicles: vehicleRatings,
    global: { average: globalAverage, count: reviews.length, text: globalText },
  };
}

function updatePricing(body) {
  const data = load();
  const current = normalizePricing(data.pricing_settings);
  const numberOf = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  current.airportBase = numberOf(body.airportBase, current.airportBase);
  current.defaultDailyRate = numberOf(body.defaultDailyRate, current.defaultDailyRate);
  current.driverDailyFee = numberOf(body.driverDailyFee, current.driverDailyFee);
  current.overtimeRate = numberOf(body.overtimePercent, current.overtimeRate * 100) / 100;
  current.lateFeeRate = numberOf(body.latePercent, current.lateFeeRate * 100) / 100;
  current.areaMultiplier = {
    zona_1: numberOf(body.mult1, current.areaMultiplier.zona_1),
    zona_2: numberOf(body.mult2, current.areaMultiplier.zona_2),
    zona_3: numberOf(body.mult3, current.areaMultiplier.zona_3),
  };
  current.addons = current.addons.map((item) => ({
    ...item,
    price: numberOf(body[`addon_${item.key}`], item.price),
  }));
  current.tours = current.tours.map((item, index) => ({
    ...item,
    price: numberOf(body[`tour_${index}`], item.price),
  }));
  data.pricing_settings = current;
  data.vehicles = (data.vehicles || []).map((vehicle) => ({
    ...vehicle,
    pricePerDay: numberOf(body[`vehicle_${vehicle.id}`], vehicle.pricePerDay),
  }));
  const zoneIds = [].concat(body.zoneId || []);
  const zonePrices = [].concat(body.zonePrice || []);
  data.zone_tariffs = (data.zone_tariffs || []).map((item) => {
    const index = zoneIds.findIndex((id) => Number(id) === item.id);
    if (index === -1) return item;
    return { ...item, price: numberOf(zonePrices[index], item.price) };
  });
  save(data);
  return getPricingSettings();
}

function getBankAccounts() {
  return (load().bank_accounts || []).slice().sort((a, b) => a.id - b.id);
}

function createBankAccount(payload) {
  const data = load();
  data.bank_accounts = data.bank_accounts || [];
  const account = {
    id: nextId(data.bank_accounts),
    nama_bank: String(payload.nama_bank || "").trim(),
    nomor_rekening: String(payload.nomor_rekening || "").replace(/\s/g, ""),
    atas_nama: String(payload.atas_nama || "").trim(),
  };
  data.bank_accounts.push(account);
  save(data);
  return account;
}

function updateBankAccount(id, payload) {
  const data = load();
  const index = (data.bank_accounts || []).findIndex((item) => item.id === Number(id));
  if (index === -1) {
    return null;
  }
  data.bank_accounts[index] = {
    ...data.bank_accounts[index],
    nama_bank: String(payload.nama_bank || "").trim(),
    nomor_rekening: String(payload.nomor_rekening || "").replace(/\s/g, ""),
    atas_nama: String(payload.atas_nama || "").trim(),
  };
  save(data);
  return data.bank_accounts[index];
}

function deleteBankAccount(id) {
  const data = load();
  const before = (data.bank_accounts || []).length;
  data.bank_accounts = (data.bank_accounts || []).filter((item) => item.id !== Number(id));
  save(data);
  return data.bank_accounts.length < before;
}

function recordVisit(entry) {
  const data = load();
  data.site_traffic = Array.isArray(data.site_traffic) ? data.site_traffic : [];
  data.site_traffic.push({
    id: nextId(data.site_traffic),
    ip_address: String(entry.ip_address || ""),
    session_id: String(entry.session_id || ""),
    user_agent: String(entry.user_agent || ""),
    page_visited: String(entry.page_visited || "/"),
    timestamp: entry.timestamp || new Date().toISOString(),
  });
  if (data.site_traffic.length > 2000) {
    data.site_traffic = data.site_traffic.slice(-2000);
  }
  save(data);
}

function trafficSummary() {
  const data = load();
  const rows = data.site_traffic || [];
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = dayStart - 6 * 24 * 60 * 60 * 1000;
  const uniqueCount = (list) =>
    new Set(list.map((row) => row.session_id || row.ip_address).filter(Boolean)).size;
  const todayRows = rows.filter((row) => new Date(row.timestamp).getTime() >= dayStart);
  const weekRows = rows.filter((row) => new Date(row.timestamp).getTime() >= weekStart);
  const pageCounts = {};
  rows.forEach((row) => {
    const page = row.page_visited || "/";
    pageCounts[page] = (pageCounts[page] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .map(([page, views]) => ({ page, views }))
    .sort((left, right) => right.views - left.views);
  const uniqueVisitors = uniqueCount(rows);
  const successCount = (data.transactions || []).filter((item) => {
    const status = String(item.status || "").toLowerCase();
    const kind = item.kind || "payment";
    return (status === "success" || status === "lunas") && kind !== "overtime" && kind !== "late_fee";
  }).length;
  const conversion = uniqueVisitors ? Math.round((successCount / uniqueVisitors) * 1000) / 10 : 0;
  return {
    totalVisits: rows.length,
    uniqueVisitors,
    uniqueToday: uniqueCount(todayRows),
    uniqueWeek: uniqueCount(weekRows),
    topPages,
    successCount,
    conversion,
    recent: rows.slice(-15).reverse(),
  };
}

function stats() {
  const data = load();
  const orders = data.orders || [];
  return {
    vehicleCount: data.vehicles.length,
    availableCount: data.vehicles.filter((vehicle) => vehicle.status === "available")
      .length,
    employeeCount: data.employees.length,
    payrollCount: data.payrolls.length,
    bookingCount: data.bookings.length,
    orderCount: orders.length,
    newOrderCount: orders.filter((order) => order.status === "baru").length,
  };
}

module.exports = {
  init,
  defaultData,
  findUserByEmail,
  createUser,
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getPayrolls,
  createPayroll,
  getBookings,
  getBookingsByUser,
  createBooking,
  getOrders,
  getOrdersByUser,
  getOrderById,
  createOrder,
  assignOrder,
  completeOrder,
  createExpense,
  getTransactions,
  getExpenses,
  financeSummary,
  createTransaction,
  calculatePayroll,
  getFinancialSummary,
  getFinanceByCategory,
  saveServiceBooking,
  updateOrderSchedule,
  APP_NAME,
  cashBook,
  EXPENSE_CATEGORIES,
  stats,
  getCompanySettings,
  updateCompanySettings,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  setPaymentMethodActive,
  getZoneTariffs,
  generateDriverToken,
  generateStaffToken,
  calculateEndDate,
  isBookingExpired,
  updateOrderStatus,
  updateZoneTariffs,
  getReviews,
  createReview,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  publicReviewCards,
  ratingSummary,
  getPricingSettings,
  updatePricing,
  confirmOrder,
  customerHasCompletedOrder,
  recordVisit,
  trafficSummary,
  checkVehicleAvailability,
  updateVehicleStatus,
};
