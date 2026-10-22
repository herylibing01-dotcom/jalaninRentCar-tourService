(function () {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function phoneOk(value) {
    const digits = value.replace(/\D/g, "");
    return /^\d{7,15}$/.test(digits);
  }

  function money(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function show(form, name, message) {
    const node = form.querySelector(`[data-error="${name}"]`);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("hidden", !message);
  }

  function estimate(form) {
    const zone = form.zone ? form.zone.value : "";
    const option = form.zone && form.zone.selectedOptions[0];
    const rentalType = form.rentalType ? form.rentalType.value : "";
    const lepas = /lepas/i.test(rentalType);
    let zoneKey = "rental";
    if (form.dataset.service === "airport") zoneKey = "airport";
    else if (form.dataset.service === "rental" && lepas) zoneKey = "antar";
    const zoneFee = zone && option ? Number(option.dataset[zoneKey] || 0) : 0;
    let base = Number(form.dataset.base || 0);
    if (form.dataset.service === "rental") {
      const option = form.vehicleName && form.vehicleName.selectedOptions[0];
      const daily = Number(option && option.dataset.price) || 350000;
      const days = Number(form.durationDays && form.durationDays.value) || 1;
      base = daily * days;
    }
    if (form.dataset.service === "tour") {
      const option = form.packageType && form.packageType.selectedOptions[0];
      base = Number(option && option.dataset.price) || 750000;
    }
    if (form.dataset.service === "airport") {
      base = Number(form.dataset.airportBase) || 350000;
    }
    const withDriver = form.rentalType && /sopir/i.test(form.rentalType.value);
    const driverBox = form.querySelector("[data-driver]");
    let driverExtra = 0;
    if (withDriver && driverBox && zone) {
      const days = Number(form.durationDays && form.durationDays.value) || 1;
      const driverFee = Number(driverBox.dataset.driverFee || 0) * days;
      const multiplier = Number(driverBox.dataset[`mult${zone.replace("zona", "Zona")}`] || driverBox.getAttribute(`data-mult-${zone}`) || 1);
      const selected = form.querySelector("[data-driver-package]:checked");
      let allIn = 0;
      if (selected && selected.value === "all-in") {
        form.querySelectorAll("[data-addon]:checked").forEach((box) => {
          allIn += Math.round(Number(box.dataset.price || 0) * multiplier * days);
        });
      }
      driverExtra = driverFee + allIn - zoneFee;
    }
    const total = base + (zone ? zoneFee : 0) + driverExtra;
    const label = form.querySelector("[data-total]");
    if (label) {
      label.textContent = zone ? money(total) : "Pilih zona untuk melihat total";
    }
  }

  function review(form) {
    syncAirportPickup(form);
    const email = (form.customerEmail.value || "").trim();
    const phone = form.customerPhone.value || "";
    const fileInput = form.querySelector("[name='referenceImage']:not([disabled])");
    const file = fileInput && fileInput.files[0];
    const emailValid = emailPattern.test(email);
    const phoneValid = phoneOk(phone);
    let fileValid = true;
    let fileMessage = "";
    if (file) {
      const typeOk = file.type === "image/jpeg" || file.type === "image/png";
      const sizeOk = file.size <= 2 * 1024 * 1024;
      fileValid = typeOk && sizeOk;
      if (!typeOk) fileMessage = "File harus JPG atau PNG.";
      if (!sizeOk) fileMessage = "Ukuran file maksimal 2MB.";
    }
    show(form, "email", email && !emailValid ? "Masukkan email yang benar." : "");
    const phoneError = document.documentElement.dataset.phoneError || "Nomor WhatsApp harus 7–15 digit dan boleh memakai kode negara mana pun.";
    show(form, "phone", phone && !phoneValid ? phoneError : "");
    show(form, "file", fileMessage);
    show(form, "flight-file", fileMessage);
    const lepas = form.rentalType && /lepas/i.test(form.rentalType.value);
    const simNumber = form.querySelector("[data-sim-number]");
    const idDocumentType = form.querySelector("[data-id-document-type]");
    const idDocumentImage = form.querySelector("[data-id-document-image]");
    let simValid = true;
    let idTypeValid = true;
    let idImageValid = true;
    if (lepas) {
      if (simNumber) {
        simValid = Boolean(simNumber.value.trim());
        show(form, "sim-number", simValid ? "" : "Nomor SIM wajib diisi.");
      }
      if (idDocumentType) {
        idTypeValid = Boolean(idDocumentType.value);
        show(form, "id-document-type", idTypeValid ? "" : "Pilih jenis dokumen identitas.");
      }
      if (idDocumentImage) {
        const idFile = idDocumentImage.files[0];
        idImageValid = Boolean(idFile);
        if (idFile) {
          const typeOk = idFile.type === "image/jpeg" || idFile.type === "image/png";
          const sizeOk = idFile.size <= 2 * 1024 * 1024;
          idImageValid = typeOk && sizeOk;
          if (!typeOk) show(form, "id-document-image", "File harus JPG atau PNG.");
          else if (!sizeOk) show(form, "id-document-image", "Ukuran file maksimal 2MB.");
          else show(form, "id-document-image", "");
        } else {
          show(form, "id-document-image", "Dokumen identitas wajib diunggah.");
        }
      }
    }
    const ready =
      form.customerName.value.trim() &&
      emailValid &&
      phoneValid &&
      form.zone.value &&
      form.termsAccepted.checked &&
      (!form.querySelector("[data-late-check]") || !form.querySelector("[data-late-check]").required || form.querySelector("[data-late-check]").checked) &&
      fileValid &&
      (!lepas || (simValid && idTypeValid && idImageValid)) &&
      form.checkValidity();
    form.querySelector("[data-submit]").disabled = !ready;
    const payment = form.paymentMethod && form.paymentMethod.selectedOptions[0];
    const payType = payment ? payment.dataset.type : "";
    const banks = form.querySelector("[data-banks]");
    const qris = form.querySelector("[data-qris]");
    const wallet = form.querySelector("[data-ewallet]");
    if (banks) banks.classList.toggle("hidden", payType !== "transfer_bank");
    if (qris) {
      qris.classList.toggle("hidden", payType !== "qris");
      const image = qris.querySelector("[data-qris-image]");
      const note = qris.querySelector("[data-qris-note]");
      if (image) {
        image.src = payment && payment.dataset.barcode ? payment.dataset.barcode : "";
        image.classList.toggle("hidden", !image.src);
      }
      if (note) note.textContent = (payment && payment.dataset.note) || "Siapkan aplikasi pembayaran untuk memindai QRIS.";
    }
    if (wallet) {
      wallet.classList.toggle("hidden", payType !== "ewallet" && payType !== "kartu_kredit");
      const note = wallet.querySelector("[data-ewallet-note]");
      if (note) note.textContent = (payment && payment.dataset.note) || form.paymentMethod.value;
    }
    const lepas = form.rentalType && /lepas/i.test(form.rentalType.value);
    const withDriver = form.rentalType && /sopir/i.test(form.rentalType.value);
    const late = form.querySelector("[data-late]");
    const lateCheck = form.querySelector("[data-late-check]");
    const driverNote = form.querySelector("[data-driver]");
    const allIn = form.querySelector("[data-allin]");
    const packagePick = form.querySelector("[data-driver-package]:checked");
    const lepasKunci = form.querySelector("[data-lepas-kunci]");
    const simNumber = form.querySelector("[data-sim-number]");
    const idDocumentType = form.querySelector("[data-id-document-type]");
    const idDocumentImage = form.querySelector("[data-id-document-image]");
    if (late) late.classList.toggle("hidden", !lepas);
    if (lateCheck) lateCheck.required = Boolean(lepas);
    if (driverNote) driverNote.classList.toggle("hidden", !withDriver);
    form.querySelectorAll("[data-driver-package]").forEach((input) => {
      input.required = Boolean(withDriver);
    });
    if (allIn) allIn.classList.toggle("hidden", !(withDriver && packagePick && packagePick.value === "all-in"));
    if (lepasKunci) lepasKunci.classList.toggle("hidden", !lepas);
    if (simNumber) simNumber.required = Boolean(lepas);
    if (idDocumentType) idDocumentType.required = Boolean(lepas);
    if (idDocumentImage) idDocumentImage.required = Boolean(lepas);
    estimate(form);
  }

  function syncAirportPickup(form) {
    const airport = form.dataset.service === "airport";
    const textWrap = form.querySelector("[data-pickup-text]");
    const airportWrap = form.querySelector("[data-pickup-airport]");
    const textInput = textWrap && textWrap.querySelector("input");
    const airportSelect = form.querySelector("[data-pickup-select]");
    const flight = form.querySelector("[data-flight]");
    const flightNumber = form.querySelector("[data-flight-number]");
    const flightFile = form.querySelector("[data-flight-file]");
    const genericWrap = form.querySelector("[data-generic-wrap]");
    const genericFile = form.querySelector("[data-generic-file]");
    const showFlight = airport && airportSelect && /bandara|airport/i.test(airportSelect.value);
    if (textWrap) textWrap.classList.toggle("hidden", airport);
    if (textInput) {
      textInput.disabled = airport;
      textInput.required = !airport;
    }
    if (airportWrap) airportWrap.classList.toggle("hidden", !airport);
    if (airportSelect) {
      airportSelect.disabled = !airport;
      airportSelect.required = airport;
    }
    if (flight) flight.classList.toggle("hidden", !showFlight);
    if (flightNumber) {
      flightNumber.disabled = !showFlight;
      flightNumber.required = false;
    }
    if (flightFile) flightFile.disabled = !showFlight;
    if (genericWrap) genericWrap.classList.toggle("hidden", airport);
    if (genericFile) genericFile.disabled = airport;
  }

  document.querySelectorAll(".js-checkout").forEach((form) => {
    const run = () => review(form);
    form.addEventListener("input", run);
    form.addEventListener("change", run);
    review(form);
  });
})();
