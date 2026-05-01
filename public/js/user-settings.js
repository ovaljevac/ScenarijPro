window.addEventListener("DOMContentLoaded", function () {
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const email = document.getElementById("email");
  const items = document.getElementById("items");
  const password = document.getElementById("password");
  const twoFactor = document.getElementById("2fa");
  const frequency = document.getElementById("frequency");
  const saveBtn = document.getElementById("saveSettingsBtn");
  const statusEl = document.getElementById("settingsStatus");

  function setStatus(message, type) {
    statusEl.textContent = message || "";
    statusEl.dataset.type = type || "";
  }

  function setContactPreference(value) {
    const selected = document.querySelector(`input[name="contact"][value="${value || "email"}"]`);
    if (selected) selected.checked = true;
  }

  function getContactPreference() {
    return document.querySelector('input[name="contact"]:checked')?.value || "email";
  }

  function loadUser() {
    PoziviAjaxFetch.getMe((status, data) => {
      if (status !== 200 || !data?.user) {
        setStatus("Prijavite se da uredite postavke.", "error");
        saveBtn.disabled = true;
        return;
      }
      const user = data.user;
      firstName.value = user.firstName || "";
      lastName.value = user.lastName || "";
      email.value = user.email || "";
      items.value = user.itemsPerPage || 25;
      twoFactor.checked = !!user.twoFactorEnabled;
      setContactPreference(user.contactPreference);
      frequency.value = user.notificationFrequency || "daily";
      saveBtn.disabled = false;
    });
  }

  saveBtn?.addEventListener("click", () => {
    setStatus("Spremanje...", "");
    PoziviAjaxFetch.updateMe(
      {
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        itemsPerPage: items.value,
        newPassword: password.value,
        twoFactorEnabled: twoFactor.checked,
        contactPreference: getContactPreference(),
        notificationFrequency: frequency.value,
      },
      (status, data) => {
        if (status === 200) {
          password.value = "";
          localStorage.setItem("scenarijProUser", JSON.stringify(data.user || null));
          setStatus(data?.message || "Postavke su spremljene.", "success");
          return;
        }
        setStatus(data?.message || "Postavke nisu spremljene.", "error");
      }
    );
  });

  loadUser();
});
