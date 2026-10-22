const COMMISSION_RATE = 0.1;
const ZONE_FEE = {
  dalam_kota: 0,
  luar_kota_bali: 250000,
};
const AIRPORT_BASE = 350000;

const TOUR_PRICES = {
  "City tour 1 hari": 750000,
  "Paket 2 hari 1 malam": 1500000,
  "Paket 3 hari 2 malam": 2200000,
  "Custom itinerary": 1000000,
};

function orderAmount(order, vehicles) {
  const details = order.details || {};
  if (Number(details.totalPrice) > 0) {
    return Number(details.totalPrice);
  }
  if (order.serviceType === "rental") {
    const vehicle = (vehicles || []).find(
      (item) => item.name === details.vehicleName
    );
    const dailyRate = vehicle ? vehicle.pricePerDay : 350000;
    return dailyRate * (Number(details.durationDays) || 1);
  }
  if (order.serviceType === "tour") {
    return TOUR_PRICES[details.packageType] || 750000;
  }
  return 0;
}

function usesDriver(order, employee) {
  if (!employee) {
    return false;
  }
  const rentalType = String(order.details?.rentalType || "").toLowerCase();
  if (order.serviceType === "rental") {
    return rentalType.includes("sopir");
  }
  return employee.jobRole === "driver";
}

function zoneFee(zone) {
  const value = String(zone || "");
  if (value === "luar_kota_bali" || value === "Luar Kota Bali") {
    return 250000;
  }
  if (value === "dalam_kota" || value === "Dalam Kota") {
    return 0;
  }
  return null;
}

function serviceBase({ serviceType, vehicleName, durationDays, packageType, vehicles, pricing }) {
  const settings = pricing || {};
  if (serviceType === "rental") {
    const vehicle = (vehicles || []).find((item) => item.name === vehicleName);
    const dailyRate = vehicle ? vehicle.pricePerDay : Number(settings.defaultDailyRate) || 350000;
    return dailyRate * (Number(durationDays) || 1);
  }
  if (serviceType === "tour") {
    const tour = (settings.tours || []).find((item) => item.name === packageType);
    if (tour) return Number(tour.price) || 0;
    return TOUR_PRICES[packageType] || 750000;
  }
  if (serviceType === "airport") {
    return Number(settings.airportBase) || AIRPORT_BASE;
  }
  return 0;
}

function lookupZonePrice(tariffs, service, zone) {
  const row = (tariffs || []).find(
    (item) => item.service === service && item.zone === zone && item.active !== false
  );
  return row ? Number(row.price) || 0 : null;
}

const DRIVER_DAILY_FEE = 150000;
const DRIVER_ADDONS = [
  { key: "uang_makan", label: "Uang Makan Driver", price: 75000 },
  { key: "parkir_tol", label: "Biaya Parkir & Tol", price: 100000 },
  { key: "air_mineral", label: "Air Mineral Tambahan", price: 25000 },
];
const AREA_MULTIPLIER = {
  zona_1: 1,
  zona_2: 1.5,
  zona_3: 2,
};
const ZONE_AREA_LABELS = {
  zona_1: "Zona 1 (Dekat)",
  zona_2: "Zona 2 (Ubud/Canggu)",
  zona_3: "Zona 3 (Kintamani/Singaraja)",
};
const DRIVER_TERMS = {
  reguler:
    "Ketentuan Reguler: Harga hanya termasuk mobil & driver 10 jam. BBM, parkir, tol, dan makan driver ditanggung penyewa.",
  "all-in":
    "Ketentuan All-In: Harga termasuk mobil, driver, dan komponen tambahan yang dipilih resmi saat checkout sesuai area zona tujuan.",
};

function driverPackageQuote({ baseAmount, durationDays, zone, packageType, addons, pricing }) {
  const settings = pricing || {};
  const days = Math.max(1, Number(durationDays) || 1);
  const catalog = settings.addons && settings.addons.length ? settings.addons : DRIVER_ADDONS;
  const multipliers = settings.areaMultiplier || AREA_MULTIPLIER;
  const driverFee = (Number(settings.driverDailyFee) || DRIVER_DAILY_FEE) * days;
  const multiplier = Number(multipliers[zone]) || 1;
  const chosen = packageType === "all-in" ? addons || [] : [];
  const components = catalog.filter((item) => chosen.includes(item.key)).map((item) => ({
    key: item.key,
    label: item.label,
    unitPrice: item.price,
    line: Math.round(item.price * multiplier * days),
  }));
  const allInAmount = components.reduce((sum, item) => sum + item.line, 0);
  return {
    baseAmount: Number(baseAmount) || 0,
    driverFee,
    areaMultiplier: multiplier,
    components,
    allInAmount,
    totalPrice: (Number(baseAmount) || 0) + driverFee + allInAmount,
    packageType: packageType === "all-in" ? "all-in" : "reguler",
    serviceTerms: packageType === "all-in" ? DRIVER_TERMS["all-in"] : DRIVER_TERMS.reguler,
  };
}

function priceBreakdown(input) {
  const baseAmount = serviceBase(input);
  const fromTariff = lookupZonePrice(input.zoneTariffs, input.zoneService, input.zone);
  const fee = fromTariff === null ? zoneFee(input.zone) || 0 : fromTariff;
  return {
    baseAmount,
    zoneFee: fee,
    deliveryFee: input.zoneService === "antar_jemput" ? fee : 0,
    totalPrice: baseAmount + fee,
  };
}

function driverOvertime(hoursUsed, dailyRate, rate) {
  const extra = Math.max(0, Number(hoursUsed) - 10);
  const hourly = Math.round(Number(dailyRate || 0) * (Number(rate) || 0.1));
  return { extraHours: extra, hourly, amount: extra * hourly };
}

function lateReturnFee(lateHours, dailyRate, rate) {
  const hours = Number(lateHours) || 0;
  const daily = Number(dailyRate) || 0;
  const feeRate = Number(rate) || 0.1;
  if (hours >= 3) {
    return daily;
  }
  if (hours > 0) {
    return Math.round(hours * daily * feeRate);
  }
  return 0;
}

function quote(order, vehicles, employee) {
  const amount = orderAmount(order, vehicles);
  const withDriver = usesDriver(order, employee);
  const commission = withDriver ? Math.round(amount * COMMISSION_RATE) : 0;
  return { amount, commission, withDriver };
}

module.exports = {
  COMMISSION_RATE,
  ZONE_FEE,
  TOUR_PRICES,
  AIRPORT_BASE,
  quote,
  priceBreakdown,
  driverPackageQuote,
  DRIVER_DAILY_FEE,
  DRIVER_ADDONS,
  AREA_MULTIPLIER,
  ZONE_AREA_LABELS,
  DRIVER_TERMS,
  zoneFee,
  lookupZonePrice,
  driverOvertime,
  lateReturnFee,
};
