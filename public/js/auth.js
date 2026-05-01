window.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const statusEl = document.getElementById("authStatus");

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.dataset.type = type || "";
  }

  function setTab(name) {
    tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === name));
    loginForm.classList.toggle("hidden", name !== "login");
    registerForm.classList.toggle("hidden", name !== "register");
    setStatus("", "");
  }

  function storeSession(data) {
    if (data?.token) {
      PoziviAjaxFetch.setToken(data.token);
      localStorage.setItem("scenarijProUser", JSON.stringify(data.user || null));
      window.location.href = "projects.html";
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => setTab(tab.dataset.authTab));
  });

  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode === "register") setTab("register");

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setStatus("Prijava...", "");
    PoziviAjaxFetch.login(
      document.getElementById("loginEmail").value,
      document.getElementById("loginPassword").value,
      (status, data) => {
        if (status === 200) {
          storeSession(data);
          return;
        }
        setStatus(data?.message || "Prijava nije uspjela.", "error");
      }
    );
  });

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setStatus("Registracija...", "");
    PoziviAjaxFetch.register(
      {
        firstName: document.getElementById("registerFirstName").value,
        lastName: document.getElementById("registerLastName").value,
        email: document.getElementById("registerEmail").value,
        password: document.getElementById("registerPassword").value,
      },
      (status, data) => {
        if (status === 200) {
          storeSession(data);
          return;
        }
        setStatus(data?.message || "Registracija nije uspjela.", "error");
      }
    );
  });
});
