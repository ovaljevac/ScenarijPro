const ScenarijModal = (function () {
  function close(backdrop) {
    backdrop.remove();
  }

  function prompt(options) {
    const config = {
      title: "Unos",
      description: "",
      label: "Vrijednost",
      placeholder: "",
      defaultValue: "",
      confirmText: "Potvrdi",
      cancelText: "Odustani",
      transform: value => value,
      validate: value => value ? "" : "Polje je obavezno.",
      ...options,
    };

    return new Promise(resolve => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div class="modal-head">
            <h2 id="modalTitle" class="modal-title"></h2>
            <p class="modal-description"></p>
          </div>
          <form class="modal-form">
            <div class="modal-body">
              <label class="modal-label" for="modalInput"></label>
              <input id="modalInput" class="modal-input" type="text">
              <div class="modal-error" aria-live="polite"></div>
            </div>
            <div class="modal-actions">
              <button class="modal-btn modal-cancel" type="button"></button>
              <button class="modal-btn modal-confirm" type="submit"></button>
            </div>
          </form>
        </div>
      `;

      const title = backdrop.querySelector(".modal-title");
      const description = backdrop.querySelector(".modal-description");
      const label = backdrop.querySelector(".modal-label");
      const input = backdrop.querySelector(".modal-input");
      const error = backdrop.querySelector(".modal-error");
      const form = backdrop.querySelector(".modal-form");
      const cancel = backdrop.querySelector(".modal-cancel");
      const confirm = backdrop.querySelector(".modal-confirm");

      title.textContent = config.title;
      description.textContent = config.description;
      description.hidden = !config.description;
      label.textContent = config.label;
      input.placeholder = config.placeholder;
      input.value = config.defaultValue;
      cancel.textContent = config.cancelText;
      confirm.textContent = config.confirmText;

      function finish(value) {
        close(backdrop);
        resolve(value);
      }

      form.addEventListener("submit", event => {
        event.preventDefault();
        const value = config.transform(input.value);
        const message = config.validate(value);
        if (message) {
          error.textContent = message;
          input.focus();
          return;
        }
        finish(value);
      });

      cancel.addEventListener("click", () => finish(null));
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) finish(null);
      });
      backdrop.addEventListener("keydown", event => {
        if (event.key === "Escape") finish(null);
      });

      document.body.appendChild(backdrop);
      input.focus();
      input.select();
    });
  }

  return { prompt };
})();
