window.addEventListener("DOMContentLoaded", function () {
    const editorDiv = document.getElementById("divEditor");
    if (!editorDiv) {
        console.error("divEditor nije pronadjen!");
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
            liElems[0].textContent = "Ukupan broj rijeci: " + stats.ukupno;
            liElems[1].textContent = "Broj boldiranih rijeci: " + stats.boldiranih;
            liElems[2].textContent = "Broj italic rijeci: " + stats.italic;
        }
    }

    function prikaziUloge() {
        const uloge = editor.dajUloge();
        if (!outputUloge) {
            return;
        }
        if (!uloge || uloge.length === 0) {
            outputUloge.textContent = "Uloge: nema pronadjenih uloga.";
        } else {
            outputUloge.textContent = "Uloge: " + uloge.join(", ");
        }
    }

    function clearOutput(element) {
        while (element.firstChild) element.removeChild(element.firstChild);
    }

    function appendStrongLine(element, text) {
        const strong = document.createElement("strong");
        strong.textContent = text;
        element.appendChild(strong);
        element.appendChild(document.createElement("br"));
    }

    function appendTextLine(element, text) {
        element.appendChild(document.createTextNode(text));
        element.appendChild(document.createElement("br"));
    }

    async function prikaziScenarijUloge() {
        if (!outputScenarij) {
            return;
        }
        const ime = await ScenarijModal.prompt({
            title: "Kontekst uloge",
            description: "Unesi ime lika za koji zelis vidjeti prethodne i sljedece replike.",
            label: "Ime uloge",
            placeholder: "npr. KIRA",
            confirmText: "Prikazi kontekst",
            transform: value => value.trim().toUpperCase(),
            validate: value => value ? "" : "Unesi ime uloge.",
        });
        if (!ime) {
            return;
        }
        const scenariji = editor.scenarijUloge(ime);
        if (!scenariji || scenariji.length === 0) {
            outputScenarij.textContent = "Nema scenarija za ulogu: " + ime.toUpperCase();
            return;
        }

        clearOutput(outputScenarij);
        appendStrongLine(outputScenarij, "Scenarij za ulogu " + ime.toUpperCase() + ":");
        scenariji.forEach((s, index) => {
            const block = document.createElement("div");
            block.style.marginTop = "6px";
            appendTextLine(
                block,
                "Pojavljivanje #" + (index + 1) +
                    " | Scena: " + (s.scena || "(bez scene)") +
                    " | Pozicija u tekstu: " + s.pozicijaUTekstu
            );
            if (s.prethodni) {
                appendTextLine(block, "Prethodni: " + s.prethodni.uloga + " - " + s.prethodni.linije.join(" "));
            } else {
                appendTextLine(block, "Prethodni: (nema)");
            }
            appendTextLine(block, "Trenutni: " + s.trenutni.uloga + " - " + s.trenutni.linije.join(" "));
            if (s.sljedeci) {
                appendTextLine(block, "Sljedeci: " + s.sljedeci.uloga + " - " + s.sljedeci.linije.join(" "));
            } else {
                appendTextLine(block, "Sljedeci: (nema)");
            }
            outputScenarij.appendChild(block);
        });
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

        clearOutput(outputGrupe);
        appendStrongLine(outputGrupe, "Grupe uloga po scenama i segmentima:");
        grupe.forEach(g => {
            const block = document.createElement("div");
            block.style.marginTop = "6px";
            appendTextLine(block, "Scena: " + (g.scena || "(bez scene)") + " | Segment: " + g.segment);
            block.appendChild(document.createTextNode("Uloge: " + g.uloge.join(", ")));
            outputGrupe.appendChild(block);
        });
    }


    function prikaziPogresneUloge() {
    if (!outputPogresne) {
        return;
    }

    const pogresne = editor.pogresnaUloga();

    if (!pogresne || pogresne.length === 0) {
        outputPogresne.textContent = "Nema pogresnih uloga.";
        return;
    }

    clearOutput(outputPogresne);
    const strong = document.createElement("strong");
    strong.textContent = "Pogresne uloge: ";
    outputPogresne.appendChild(strong);
    outputPogresne.appendChild(document.createTextNode(pogresne.join(", ")));
}

async function prikaziBrojLinija() {
    if (!outputLinije) {
        return;
    }

    const ime = await ScenarijModal.prompt({
        title: "Linije uloge",
        description: "Unesi ime lika za brojanje njegovih replika u scenariju.",
        label: "Ime uloge",
        placeholder: "npr. NAVIGATOR",
        confirmText: "Prebroj linije",
        transform: value => value.trim().toUpperCase(),
        validate: value => value ? "" : "Unesi ime uloge.",
    });
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
        const elAssignEmail = document.getElementById("wtAssignEmail");
        const btnCreate = document.getElementById("wtCreateScenario");
        const btnLoad = document.getElementById("wtLoadScenario");
        const btnRename = document.getElementById("wtRenameCharacter");
        const btnAssign = document.getElementById("wtAssignScenario");
        const btnSave = document.querySelector(".save-btn");
        const btnDeleteScenario = document.getElementById("deleteScenarioBtn");
        const elStatus = document.getElementById("wtStatus");

        let currentScenarioId = null;
        let lastSince = 0;
        let pollTimer = null;
        let lockedLineEl = null;
        let activeLineEl = null;
        const savingLineIds = new Set();
        const urlScenarioId = new URLSearchParams(window.location.search).get("scenarioId");

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

        function getInitialScenarioId() {
            const fromUrl = parseInt(urlScenarioId || "", 10);
            if (Number.isFinite(fromUrl) && fromUrl > 0) {
                if (elScenarioId) elScenarioId.value = String(fromUrl);
                return fromUrl;
            }
            return getScenarioId();
        }

        function setScenarioInUrl(scenarioId) {
            if (!scenarioId || window.location.protocol === "file:") return;
            const url = new URL(window.location.href);
            url.searchParams.set("scenarioId", String(scenarioId));
            window.history.replaceState({}, "", url);
        }

        function setPageTitle(scenario) {
            const title = scenario?.title || "Neimenovani scenarij";
            document.title = `${title} - Pisanje`;
            const heading = document.querySelector(".header-title h2");
            if (heading) heading.textContent = title;
        }

        function clearLocksUI() {
            const lines = editorDiv.querySelectorAll(".wt-line");
            lines.forEach(l => l.classList.remove("wt-locked", "wt-conflict"));
            lockedLineEl = null;
        }

        function renderScenario(scenario) {
            editorDiv.setAttribute("contenteditable", "false");
            editorDiv.innerHTML = "";
            setPageTitle(scenario);
            if (btnDeleteScenario) btnDeleteScenario.hidden = !scenario?.canDelete;

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
                    activeLineEl = lineEl;
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

        function getActiveLine() {
            if (document.activeElement?.classList?.contains("wt-line")) {
                activeLineEl = document.activeElement;
            }
            if (activeLineEl && editorDiv.contains(activeLineEl)) {
                return activeLineEl;
            }
            return editorDiv.querySelector(".wt-line");
        }

        function moveCaretToEnd(element) {
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        function applyLineType(type) {
            const lineEl = getActiveLine();
            if (!lineEl) {
                setStatus("Prvo odaberi liniju.");
                return;
            }

            lineEl.classList.remove("line-scene", "line-action", "line-character", "line-dialogue");
            lineEl.classList.add(`line-${type}`);

            const current = (lineEl.textContent || "").trim();
            if (type === "scene") {
                lineEl.textContent = current ? current.toUpperCase() : "INT. LOKACIJA - DAN";
            } else if (type === "character") {
                lineEl.textContent = current ? current.toUpperCase() : "LIK";
            }

            lineEl.focus();
            moveCaretToEnd(lineEl);
            setStatus("Tip linije postavljen. Enter sprema i ide dalje.");
        }

        function doUpdateLine(lineEl, focusNext) {
            const lineId = parseInt(lineEl.dataset.lineId, 10);
            if (!currentScenarioId || !lineId) return;

            if (!lineEl.classList.contains("wt-locked")) return;
            if (savingLineIds.has(lineId)) return;

            const text = lineEl.textContent ?? "";
            const lineEls = Array.from(editorDiv.querySelectorAll(".wt-line"));
            const currentIndex = lineEls.indexOf(lineEl);
            const nextLineEl = currentIndex >= 0 ? lineEls[currentIndex + 1] : null;
            const nextLineId = nextLineEl ? parseInt(nextLineEl.dataset.lineId, 10) : null;
            const shouldCreateNextLine = focusNext && !nextLineId;
            const newText = shouldCreateNextLine ? [text, ""] : [text];

            savingLineIds.add(lineId);
            PoziviAjaxFetch.updateLine(currentScenarioId, lineId, getUserId(), newText, (status, data) => {
                savingLineIds.delete(lineId);
                if (status === 200) {
                    setStatus(data?.message || "Updated.");
                    lastSince = Math.max(lastSince, Math.floor(Date.now() / 1000) - 1);
                    loadScenario(currentScenarioId, () => {
                        if (focusNext) {
                            const targetId = nextLineId || data?.insertedLineIds?.[0];
                            const next = targetId
                                ? editorDiv.querySelector(`.wt-line[data-line-id="${targetId}"]`)
                                : null;
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
                    setScenarioInUrl(scenarioId);
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
                    setScenarioInUrl(data.id);
                    lastSince = 0;
                    renderScenario(data);
                    setStatus("Scenario kreiran.");
                    startPolling();
                } else {
                    setStatus(data?.message || "Greska pri kreiranju scenarija.");
                }
            });
        }

        function collectEditorLines() {
            const lineEls = Array.from(editorDiv.querySelectorAll(".wt-line"));
            if (lineEls.length > 0) {
                return lineEls.map(lineEl => lineEl.textContent ?? "");
            }

            const text = editorDiv.innerText || editorDiv.textContent || "";
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            return lines.length > 0 ? lines : [""];
        }

        function saveWholeScenario() {
            if (!currentScenarioId) {
                setStatus("Prvo ucitaj ili kreiraj scenario.");
                return;
            }
            if (typeof PoziviAjaxFetch.saveScenarioContent !== "function") {
                setStatus("Spremanje scenarija nije dostupno.");
                return;
            }

            const title = (elTitle?.value || "").trim() || document.querySelector(".header-title h2")?.textContent || "";
            const content = collectEditorLines();
            setStatus("Spremanje u bazu...");

            PoziviAjaxFetch.saveScenarioContent(currentScenarioId, content, title, (status, data) => {
                if (status === 200) {
                    lastSince = Math.max(lastSince, Math.floor(Date.now() / 1000) - 1);
                    renderScenario(data);
                    setStatus(data?.message || "Scenario spremljen.");
                    return;
                }
                setStatus(data?.message || "Greska pri spremanju scenarija.");
            });
        }

        async function deleteCurrentScenario() {
            if (!currentScenarioId) {
                setStatus("Prvo ucitaj scenario.");
                return;
            }

            const title = document.querySelector(".header-title h2")?.textContent || "Neimenovani scenarij";
            const confirmed = await ScenarijModal.confirm({
                title: "Obrisati scenarij?",
                description: `Scenario "${title}" i sve njegove promjene ce biti trajno obrisani.`,
                confirmText: "Obrisi",
                cancelText: "Odustani",
                danger: true,
            });
            if (!confirmed) return;

            setStatus("Brisanje scenarija...");
            PoziviAjaxFetch.deleteScenario(currentScenarioId, (status, data) => {
                if (status === 200) {
                    setStatus(data?.message || "Scenario je obrisan.");
                    window.location.href = "projects.html";
                    return;
                }
                setStatus(data?.message || "Scenario nije obrisan.");
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

        function assignScenario() {
            if (!currentScenarioId) {
                setStatus("Prvo ucitaj scenario.");
                return;
            }
            const email = (elAssignEmail?.value || "").trim();
            if (!email) {
                setStatus("Unesi email korisnika.");
                return;
            }
            if (typeof PoziviAjaxFetch.assignScenario !== "function") {
                setStatus("Dodjela scenarija nije dostupna.");
                return;
            }
            PoziviAjaxFetch.assignScenario(currentScenarioId, email, (status, data) => {
                if (status === 200) {
                    setStatus(data?.message || "Scenario dodijeljen.");
                    elAssignEmail.value = "";
                    return;
                }
                setStatus(data?.message || "Scenario nije dodijeljen.");
            });
        }

        btnCreate?.addEventListener("click", () => createScenario());
        btnLoad?.addEventListener("click", () => loadScenario(getScenarioId()));
        btnRename?.addEventListener("click", () => renameCharacter());
        btnAssign?.addEventListener("click", () => assignScenario());
        btnSave?.addEventListener("click", () => saveWholeScenario());
        btnDeleteScenario?.addEventListener("click", () => deleteCurrentScenario());
        document.querySelectorAll("[data-line-type]").forEach(btn => {
            btn.addEventListener("click", () => applyLineType(btn.dataset.lineType));
        });

        const initialId = getInitialScenarioId();
        PoziviAjaxFetch.getScenario(initialId, (status, data) => {
            if (status === 200) {
                currentScenarioId = initialId;
                if (elScenarioId) elScenarioId.value = String(initialId);
                setScenarioInUrl(initialId);
                renderScenario(data);
                setStatus("Scenario ucitan.");
                startPolling();
            } else {
                if (urlScenarioId) {
                    setStatus(data?.message || "Scenario nije pronadjen.");
                    return;
                }
                if (elTitle && !elTitle.value) elTitle.value = document.title || "Neimenovani scenarij";
                createScenario();
            }
        });
    })();


});
