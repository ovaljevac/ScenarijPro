
const PoziviAjaxFetch = (function () {
  async function request(method, url, body, callback) {
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      if (body !== undefined && body !== null) opts.body = JSON.stringify(body);

      const res = await fetch(url, opts);
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
    postScenario: function (title, callback) {
      return request("POST", "/api/scenarios", { title }, callback);
    },

    lockLine: function (scenarioId, lineId, userId, callback) {
      return request(
        "POST",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/lines/${encodeURIComponent(lineId)}/lock`,
        { userId },
        callback
      );
    },

    updateLine: function (scenarioId, lineId, userId, newText, callback) {
      return request(
        "PUT",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/lines/${encodeURIComponent(lineId)}`,
        { userId, newText },
        callback
      );
    },

    lockCharacter: function (scenarioId, characterName, userId, callback) {
      return request(
        "POST",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/characters/lock`,
        { userId, characterName },
        callback
      );
    },

    updateCharacter: function (scenarioId, userId, oldName, newName, callback) {
      return request(
        "POST",
        `/api/scenarios/${encodeURIComponent(scenarioId)}/characters/update`,
        { userId, oldName, newName },
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
