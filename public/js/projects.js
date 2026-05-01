window.addEventListener("DOMContentLoaded", function () {
  const grid = document.getElementById("projectsGrid");
  const statusEl = document.getElementById("projectsStatus");
  const searchInput = document.getElementById("projectSearch");
  const createBtn = document.getElementById("createProjectBtn");
  const createCard = document.getElementById("createProjectCard");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const navUserName = document.getElementById("navUserName");
  const navUserRole = document.getElementById("navUserRole");

  let projects = [];

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("scenarijProUser") || "null");
    } catch {
      return null;
    }
  }

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.dataset.type = type || "";
    statusEl.hidden = !message;
  }

  function createAddCard() {
    const button = document.createElement("button");
    button.className = "card add-card";
    button.type = "button";
    button.innerHTML = `
      <div class="add-inner">
        <i class="fa-regular fa-pen-to-square add-icon"></i>
        <div>Kreiraj novi scenarij</div>
      </div>
    `;
    button.addEventListener("click", createProject);
    return button;
  }

  function projectCard(project, index) {
    const link = document.createElement("a");
    link.className = `card project-link${index === 0 ? " active-card" : ""}`;
    link.href = `writing.html?scenarioId=${encodeURIComponent(project.id)}`;

    const title = project.title || "Neimenovani scenarij";
    link.innerHTML = `
      <div class="card-head">
        <h3 class="card-title"></h3>
        <span class="badge">${project.status || "U izradi"}</span>
      </div>
      <p class="subtitle">${project.type || "Scenarij"}</p>
      <ul class="meta">
        <li><strong>ID:</strong> ${project.id}</li>
        <li><strong>Broj stranica:</strong> ${project.pageCount || 1}</li>
        <li><strong>Broj linija:</strong> ${project.lineCount || 0}</li>
        <li><strong>Vrijeme posljednje izmjene:</strong> ${project.updatedLabel || "Nema izmjena"}</li>
      </ul>
    `;
    link.querySelector(".card-title").textContent = title;
    return link;
  }

  function filteredProjects() {
    const term = (searchInput?.value || "").trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(project => String(project.title || "").toLowerCase().includes(term));
  }

  function renderProjects() {
    if (!grid) return;
    const visibleProjects = filteredProjects();
    grid.innerHTML = "";

    if (visibleProjects.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-projects";
      empty.textContent = projects.length === 0
        ? "Nema projekata. Kreiraj prvi scenarij."
        : "Nema projekata za unesenu pretragu.";
      grid.appendChild(empty);
    } else {
      visibleProjects.forEach((project, index) => {
        grid.appendChild(projectCard(project, index));
      });
    }

    grid.appendChild(createAddCard());
  }

  function loadProjects() {
    if (typeof PoziviAjaxFetch === "undefined" || !PoziviAjaxFetch.getScenarios) {
      setStatus("API klijent nije ucitan.", "error");
      return;
    }

    setStatus("Ucitavanje projekata...", "loading");
    PoziviAjaxFetch.getScenarios((status, data) => {
      if (status === 200 && Array.isArray(data?.projects)) {
        projects = data.projects;
        setStatus("", "");
        renderProjects();
        return;
      }

      projects = [];
      setStatus(data?.message || "Nije moguce ucitati projekte. Pokreni server na http://localhost:3000.", "error");
      renderProjects();
    });
  }

  function renderUser(user) {
    function setVisible(element, visible) {
      if (!element) return;
      element.hidden = !visible;
      element.classList.toggle("is-hidden", !visible);
    }

    if (user) {
      navUserName.textContent = `${user.firstName} ${user.lastName}`;
      navUserRole.textContent = user.email;
      setVisible(loginBtn, false);
      setVisible(registerBtn, false);
      setVisible(logoutBtn, true);
    } else {
      navUserName.textContent = "Gost";
      navUserRole.textContent = "Niste prijavljeni";
      setVisible(loginBtn, true);
      setVisible(registerBtn, true);
      setVisible(logoutBtn, false);
    }
  }

  function loadUser() {
    const cachedUser = getStoredUser();
    if (PoziviAjaxFetch.getToken() && cachedUser) {
      renderUser(cachedUser);
    }

    if (typeof PoziviAjaxFetch === "undefined" || !PoziviAjaxFetch.getMe) {
      renderUser(null);
      return;
    }
    PoziviAjaxFetch.getMe((status, data) => {
      const user = status === 200 ? data?.user : null;
      if (user) {
        localStorage.setItem("scenarijProUser", JSON.stringify(user));
        renderUser(user);
        return;
      }
      PoziviAjaxFetch.setToken(null);
      localStorage.removeItem("scenarijProUser");
      renderUser(null);
    });
  }

  async function createProject() {
    if (!PoziviAjaxFetch.getToken()) {
      window.location.href = "login.html?mode=register";
      return;
    }

    const cleanTitle = await ScenarijModal.prompt({
      title: "Novi scenarij",
      description: "Unesi naziv projekta. Nakon kreiranja odmah otvaramo editor.",
      label: "Naziv scenarija",
      placeholder: "npr. The Last Starship",
      defaultValue: "Novi scenarij",
      confirmText: "Kreiraj",
      transform: value => value.trim(),
      validate: value => value ? "" : "Naziv projekta ne smije biti prazan.",
    });
    if (cleanTitle === null) return;

    if (!cleanTitle) {
      setStatus("Naziv projekta ne smije biti prazan.", "error");
      return;
    }

    setStatus("Kreiranje projekta...", "loading");
    if (typeof PoziviAjaxFetch === "undefined" || !PoziviAjaxFetch.postScenario) {
      setStatus("API klijent nije ucitan.", "error");
      return;
    }
    PoziviAjaxFetch.postScenario(cleanTitle, (status, data) => {
      if (status === 200 && data?.id) {
        window.location.href = `writing.html?scenarioId=${encodeURIComponent(data.id)}`;
        return;
      }
      setStatus(data?.message || "Nije moguce kreirati projekat.", "error");
    });
  }

  searchInput?.addEventListener("input", renderProjects);
  createBtn?.addEventListener("click", createProject);
  createCard?.addEventListener("click", createProject);
  logoutBtn?.addEventListener("click", () => {
    PoziviAjaxFetch.logout(() => {
      PoziviAjaxFetch.setToken(null);
      localStorage.removeItem("scenarijProUser");
      renderUser(null);
      loadProjects();
    });
  });

  loadUser();
  loadProjects();
});
