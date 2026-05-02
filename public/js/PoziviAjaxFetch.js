
const PoziviAjaxFetch = (function () {
  function apiUrl(url) {
    if (window.location.protocol === "file:" && url.startsWith("/")) {
      return `http://localhost:3000${url}`;
    }
    return url;
  }

  async function request(method, url, body, callback) {
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      const token = localStorage.getItem("scenarijProToken");
      if (token) opts.headers.Authorization = `Bearer ${token}`;
      if (body !== undefined && body !== null) opts.body = JSON.stringify(body);

      const res = await fetch(apiUrl(url), opts);
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = { message: "Neispravan JSON odgovor sa servera." };
      }
      callback(res.status, data);
    } catch (err) {
      callback(0, { message: "Greska u komunikaciji sa serverom.", error: String(err) });
    }
  }

  return {
    setToken: function (token) {
      if (token) localStorage.setItem("scenarijProToken", token);
      else localStorage.removeItem("scenarijProToken");
    },

    getToken: function () {
      return localStorage.getItem("scenarijProToken");
    },

    register: function (payload, callback) {
      return request("POST", "/api/auth/register", payload, callback);
    },

    login: function (email, password, callback) {
      return request("POST", "/api/auth/login", { email, password }, callback);
    },

    logout: function (callback) {
      return request("POST", "/api/auth/logout", null, callback);
    },

    getMe: function (callback) {
      return request("GET", "/api/auth/me", null, callback);
    },

    updateMe: function (payload, callback) {
      return request("PUT", "/api/users/me", payload, callback);
    },

    getScenarios: function (callback) {
      return request("GET", "/api/scenarios", null, callback);
    },

    postScenario: function (title, callback) {
      return request("POST", "/api/scenarios", { title }, callback);
    },

    deleteScenario: function (scenarioId, callback) {
      return request("DELETE", `/api/scenarios/${encodeURIComponent(scenarioId)}`, null, callback);
    },

    lockLine: function (scenarioId, lineId, userId, callback) {
      return request(
        "POST",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/lines/${encodeURIComponent(lineId)}/lock`,
        {},
        callback
      );
    },

    updateLine: function (scenarioId, lineId, userId, newText, callback) {
      return request(
        "PUT",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/lines/${encodeURIComponent(lineId)}`,
        { newText },
        callback
      );
    },

    saveScenarioContent: function (scenarioId, content, title, callback) {
      return request(
        "PUT",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/content`,
        { content, title },
        callback
      );
    },

    assignScenario: function (scenarioId, email, callback) {
      return request(
        "POST",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/assign`,
        { email },
        callback
      );
    },

    lockCharacter: function (scenarioId, characterName, userId, callback) {
      return request(
        "POST",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/characters/lock`,
        { characterName },
        callback
      );
    },

    updateCharacter: function (scenarioId, userId, oldName, newName, callback) {
      return request(
        "POST",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/characters/update`,
        { oldName, newName },
        callback
      );
    },

    getDeltas: function (scenarioId, since, callback) {
      return request(
        "GET",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/deltas?since=${encodeURIComponent(since)}`,
        null,
        callback
      );
    },

    getScenario: function (scenarioId, callback) {
      return request("GET", `/api/scenarios/${encodeURIComponent(scenarioId)}`, null, callback);
    }
  };
})();
