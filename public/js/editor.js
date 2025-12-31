window.addEventListener("DOMContentLoaded", function () {
    const editorDiv = document.getElementById("divEditor");
    if (!editorDiv) {
        console.error("divEditor nije pronađen!");
        return;
    }

    const editor = EditorTeksta(editorDiv);

    const outputUloge = document.getElementById("outputUloge");
    const outputScenarij = document.getElementById("outputScenarij");
    const outputGrupe = document.getElementById("outputGrupe");
    const outputPogresne = document.getElementById("outputPogresneUloge");
    const outputLinije = document.getElementById("outputLinije");

    function osvjeziStatistiku() {
        const stats = editor.dajBrojRijeci();

        const liElems = document.querySelectorAll("#poruke .statistics li");
        if (liElems.length >= 3) {
            liElems[0].textContent = "Ukupan broj riječi: " + stats.ukupno;
            liElems[1].textContent = "Broj boldiranih riječi: " + stats.boldiranih;
            liElems[2].textContent = "Broj italic riječi: " + stats.italic;
        }
    }

    function prikaziUloge() {
        const uloge = editor.dajUloge();
        if (!outputUloge) {
            return;
        }
        if (!uloge || uloge.length === 0) {
            outputUloge.textContent = "Uloge: nema pronađenih uloga.";
        } else {
            outputUloge.textContent = "Uloge: " + uloge.join(", ");
        }
    }

    function prikaziScenarijUloge() {
        if (!outputScenarij) {
            return;
        }
        const ime = window.prompt("Unesi naziv uloge (VELIKIM slovima):", "");
        if (!ime) {
            return;
        }
        const scenariji = editor.scenarijUloge(ime);
        if (!scenariji || scenariji.length === 0) {
            outputScenarij.textContent = "Nema scenarija za ulogu: " + ime.toUpperCase();
            return;
        }

        let html = "<strong>Scenarij za ulogu " + ime.toUpperCase() + ":</strong><br>";
        scenariji.forEach((s, index) => {
            html +=
                "<div style='margin-top:6px;'>" +
                "Pojavljivanje #" + (index + 1) +
                " | Scena: " + (s.scena || "(bez scene)") +
                " | Pozicija u tekstu: " + s.pozicijaUTekstu +
                "<br>";
            if (s.prethodni) {
                html += "Prethodni: " + s.prethodni.uloga + " – " + s.prethodni.linije.join(" ") + "<br>";
            } else {
                html += "Prethodni: (nema)<br>";
            }
            html += "Trenutni: " + s.trenutni.uloga + " – " + s.trenutni.linije.join(" ") + "<br>";
            if (s.sljedeci) {
                html += "Sljedeći: " + s.sljedeci.uloga + " – " + s.sljedeci.linije.join(" ") + "<br>";
            } else {
                html += "Sljedeći: (nema)<br>";
            }
            html += "</div>";
        });

        outputScenarij.innerHTML = html;
    }

    function prikaziGrupe() {
        if (!outputGrupe) {
            return;
        }
        const grupe = editor.grupisiUloge();
        if (!grupe || grupe.length === 0) {
            outputGrupe.textContent = "Nema grupisanih uloga.";
            return;
        }

        let html = "<strong>Grupe uloga po scenama i segmentima:</strong><br>";
        grupe.forEach(g => {
            html +=
                "<div style='margin-top:6px;'>" +
                "Scena: " + (g.scena || "(bez scene)") +
                " | Segment: " + g.segment +
                "<br>Uloge: " + g.uloge.join(", ") +
                "</div>";
        });

        outputGrupe.innerHTML = html;
    }


    function prikaziPogresneUloge() {
    if (!outputPogresne) {
        return;
    }

    const pogresne = editor.pogresnaUloga();

    if (!pogresne || pogresne.length === 0) {
        outputPogresne.textContent = "Nema pogrešnih uloga.";
        return;
    }

    outputPogresne.innerHTML =
        "<strong>Pogrešne uloge:</strong> " + pogresne.join(", ");
}

function prikaziBrojLinija() {
    if (!outputLinije) {
        return;
    }

    const ime = window.prompt("Unesi naziv uloge (VELIKIM slovima):", "");
    if (!ime) {
        return;
    }

    const broj = editor.brojLinijaTeksta(ime);

    if (broj === 0) {
        outputLinije.textContent =
            "Uloga " + ime.toUpperCase() + " nema nijednu liniju teksta.";
    } else {
        outputLinije.textContent =
            "Uloga " + ime.toUpperCase() +
            " ima ukupno " + broj + " linija teksta.";
    }
}


    osvjeziStatistiku();

    const btnBold = document.getElementById("btnBold");
    if (btnBold) {
        btnBold.addEventListener("click", function () {
            editor.formatirajTekst("bold");
        });
    }

    const btnItalic = document.getElementById("btnItalic");
    if (btnItalic) {
        btnItalic.addEventListener("click", function () {
            editor.formatirajTekst("italic");
        });
    }

    const btnUnderline = document.getElementById("btnUnderline");
    if (btnUnderline) {
        btnUnderline.addEventListener("click", function () {
            editor.formatirajTekst("underline");
        });
    }

    const btnWords = document.getElementById("btnWords");
    if (btnWords) {
        btnWords.addEventListener("click", function () {
            osvjeziStatistiku();
        });
    }

    const btnDajUloge = document.getElementById("btnDajUloge");
    if (btnDajUloge) {
        btnDajUloge.addEventListener("click", function () {
            prikaziUloge();
        });
    }

    const btnScenarijUloge = document.getElementById("btnScenarijUloge");
    if (btnScenarijUloge) {
        btnScenarijUloge.addEventListener("click", function () {
            prikaziScenarijUloge();
        });
    }

    const btnGrupisiUloge = document.getElementById("btnGrupisiUloge");
    if (btnGrupisiUloge) {
        btnGrupisiUloge.addEventListener("click", function () {
            prikaziGrupe();
        });
    }

    const btnPogresneUloge = document.getElementById("btnPogresneUloge");
    if (btnPogresneUloge) {
        btnPogresneUloge.addEventListener("click", function () {
        prikaziPogresneUloge();
    });
}

const btnLinijeUloge = document.getElementById("btnLinijeUloge");
if (btnLinijeUloge) {
    btnLinijeUloge.addEventListener("click", function () {
        prikaziBrojLinija();
    });
}

    

    (function initSpirala3Collab() {
        if (typeof PoziviAjaxFetch === "undefined") return; 
        const panel = document.getElementById("wt-collab-panel");
        const editorDiv = document.getElementById("divEditor");
        if (!panel || !editorDiv) return;

        const elUserId = document.getElementById("wtUserId");
        const elScenarioId = document.getElementById("wtScenarioId");
        const elTitle = document.getElementById("wtScenarioTitle");
        const elOld = document.getElementById("wtOldName");
        const elNew = document.getElementById("wtNewName");
        const btnCreate = document.getElementById("wtCreateScenario");
        const btnLoad = document.getElementById("wtLoadScenario");
        const btnRename = document.getElementById("wtRenameCharacter");
        const elStatus = document.getElementById("wtStatus");

        let currentScenarioId = null;
        let lastSince = 0;
        let pollTimer = null;
        let lockedLineEl = null;

        function setStatus(msg) {
            if (!elStatus) return;
            elStatus.textContent = msg || "";
        }

        function getUserId() {
            const v = parseInt(elUserId?.value || "1", 10);
            return Number.isFinite(v) && v > 0 ? v : 1;
        }

        function getScenarioId() {
            const v = parseInt(elScenarioId?.value || "1", 10);
            return Number.isFinite(v) && v > 0 ? v : 1;
        }

        function clearLocksUI() {
            const lines = editorDiv.querySelectorAll(".wt-line");
            lines.forEach(l => l.classList.remove("wt-locked", "wt-conflict"));
            lockedLineEl = null;
        }

        function renderScenario(scenario) {
            editorDiv.setAttribute("contenteditable", "false");
            editorDiv.innerHTML = "";

            const titleEl = document.createElement("div");
            titleEl.style.fontWeight = "600";
            titleEl.style.marginBottom = "8px";
            titleEl.textContent = `${scenario.id}. ${scenario.title}`;
            editorDiv.appendChild(titleEl);

            const content = Array.isArray(scenario.content) ? scenario.content : [];
            for (const line of content) {
                const lineEl = document.createElement("div");
                lineEl.className = "wt-line";
                lineEl.setAttribute("contenteditable", "true");
                lineEl.dataset.lineId = String(line.lineId);
                lineEl.textContent = line.text ?? "";
                editorDiv.appendChild(lineEl);
            }

       
            const spacer = document.createElement("div");
            spacer.style.height = "8px";
            editorDiv.appendChild(spacer);

            const lineEls = editorDiv.querySelectorAll(".wt-line");
            lineEls.forEach(lineEl => {
                lineEl.addEventListener("focus", () => {
                    const lineId = parseInt(lineEl.dataset.lineId, 10);
                    if (!currentScenarioId || !lineId) return;

                    PoziviAjaxFetch.lockLine(currentScenarioId, lineId, getUserId(), (status, data) => {
                        if (status === 200) {
                            if (lockedLineEl && lockedLineEl !== lineEl) {
                                lockedLineEl.classList.remove("wt-locked");
                            }
                            lockedLineEl = lineEl;
                            lineEl.classList.remove("wt-conflict");
                            lineEl.classList.add("wt-locked");
                            setStatus(data?.message || "Locked.");
                        } else if (status === 409) {
                            lineEl.classList.add("wt-conflict");
                            setStatus(data?.message || "Konflikt.");
                            lineEl.blur();
                        } else {
                            setStatus(data?.message || "Greska pri lock.");
                        }
                    });
                });

                lineEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        doUpdateLine(lineEl, true);
                    }
                });

                lineEl.addEventListener("blur", () => {
                    doUpdateLine(lineEl, false);
                });
            });
        }

        function doUpdateLine(lineEl, focusNext) {
            const lineId = parseInt(lineEl.dataset.lineId, 10);
            if (!currentScenarioId || !lineId) return;

            if (!lineEl.classList.contains("wt-locked")) return;

            const text = lineEl.textContent ?? "";

            PoziviAjaxFetch.updateLine(currentScenarioId, lineId, getUserId(), [text], (status, data) => {
                if (status === 200) {
                    setStatus(data?.message || "Updated.");
                    lastSince = Math.max(lastSince, Math.floor(Date.now() / 1000) - 1);
                    loadScenario(currentScenarioId, () => {
                        if (focusNext) {
                            const next = editorDiv.querySelector(`.wt-line[data-line-id="${lineId + 1}"]`);
                            if (next) next.focus();
                        }
                    });
                } else {
                    setStatus(data?.message || "Greska pri update.");
                }
            });
        }

        function startPolling() {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = setInterval(() => {
                if (!currentScenarioId) return;

                if (lockedLineEl && document.activeElement === lockedLineEl) return;

                PoziviAjaxFetch.getDeltas(currentScenarioId, lastSince, (status, data) => {
                    if (status !== 200) return;
                    const deltas = data?.deltas || [];
                    if (!Array.isArray(deltas) || deltas.length === 0) return;

                    const maxTs = deltas.reduce((m, d) => Math.max(m, Number(d.timestamp) || 0), lastSince);
                    lastSince = maxTs;

                    loadScenario(currentScenarioId);
                });
            }, 3000);
        }

        function loadScenario(scenarioId, done) {
            PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
                if (status === 200) {
                    currentScenarioId = scenarioId;
                    elScenarioId.value = String(scenarioId);
                    clearLocksUI();
                    renderScenario(data);
                    setStatus("Scenario ucitan.");
                    startPolling();
                    if (typeof done === "function") done();
                } else {
                    setStatus(data?.message || "Scenario nije pronadjen.");
                    if (typeof done === "function") done();
                }
            });
        }

        function createScenario() {
            const title = (elTitle?.value || "").trim();
            PoziviAjaxFetch.postScenario(title, (status, data) => {
                if (status === 200 && data?.id) {
                    elScenarioId.value = String(data.id);
                    currentScenarioId = data.id;
                    lastSince = 0;
                    renderScenario(data);
                    setStatus("Scenario kreiran.");
                    startPolling();
                } else {
                    setStatus(data?.message || "Greska pri kreiranju scenarija.");
                }
            });
        }

        function renameCharacter() {
            if (!currentScenarioId) {
                setStatus("Prvo ucitaj scenario.");
                return;
            }
            const oldName = (elOld?.value || "").trim();
            const newName = (elNew?.value || "").trim();
            if (!oldName || !newName) {
                setStatus("Unesi oldName i newName.");
                return;
            }
            const userId = getUserId();

            PoziviAjaxFetch.lockCharacter(currentScenarioId, oldName, userId, (status, data) => {
                if (status !== 200) {
                    setStatus(data?.message || "Greska pri lock character.");
                    return;
                }
                PoziviAjaxFetch.updateCharacter(currentScenarioId, userId, oldName, newName, (st2, d2) => {
                    if (st2 === 200) {
                        setStatus(d2?.message || "Rename ok.");
                        lastSince = Math.max(lastSince, Math.floor(Date.now() / 1000) - 1);
                        loadScenario(currentScenarioId);
                    } else {
                        setStatus(d2?.message || "Greska pri rename.");
                    }
                });
            });
        }

        btnCreate?.addEventListener("click", () => createScenario());
        btnLoad?.addEventListener("click", () => loadScenario(getScenarioId()));
        btnRename?.addEventListener("click", () => renameCharacter());

        const initialId = getScenarioId();
        PoziviAjaxFetch.getScenario(initialId, (status, data) => {
            if (status === 200) {
                currentScenarioId = initialId;
                renderScenario(data);
                setStatus("Scenario ucitan.");
                startPolling();
            } else {
                if (elTitle && !elTitle.value) elTitle.value = document.title || "Neimenovani scenarij";
                createScenario();
            }
        });
    })();


});
