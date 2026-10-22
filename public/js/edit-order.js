(function () {
  document.querySelectorAll("[data-deadline]").forEach((node) => {
    const deadline = new Date(node.dataset.deadline).getTime();
    const lock = node.querySelector("[data-lock]") || document.querySelector("[data-lock]");

    function guard() {
      if (Number.isNaN(deadline) || Date.now() <= deadline) return;
      node.querySelectorAll("input, button, a[data-edit-link]").forEach((field) => {
        if (field.tagName === "A") {
          field.remove();
          return;
        }
        if (field.type !== "hidden") field.disabled = true;
      });
      if (lock) lock.classList.remove("hidden");
    }

    guard();
    window.setInterval(guard, 1000);
  });
})();
