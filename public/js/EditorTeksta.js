let EditorTeksta = function (divRef) {
    if (!divRef || !(divRef instanceof HTMLDivElement)) {
        throw new Error("Pogresan tip elementa!");
    }
    if (!divRef.isContentEditable) {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    const div = divRef;

    let jeSlovoIliCifra = function (ch) {
        return !!ch && /[\p{L}\p{N}]/u.test(ch);
    };

    let izvuciRijeci = function (text) {
        if (!text) {
            return [];
        }
        const pattern = /\p{L}+(?:['-]\p{L}+)*/gu;
        const matches = text.match(pattern);
        return matches || [];
    };

    let brojiRijeciZaTag = function (tag) {
        let total = 0;
        const selector = tag === "b" ? "b, strong" : "i, em";
        const elements = div.querySelectorAll(selector);
        const sameTypeAncestors = tag === "b" ? ["B", "STRONG"] : ["I", "EM"];

        elements.forEach(el => {
            if (el.parentElement && sameTypeAncestors.includes(el.parentElement.tagName)) {
                return;
            }

            let boundary = el;
            while (
                boundary.parentElement &&
                boundary.parentElement !== div &&
                ["B", "STRONG", "I", "EM"].includes(boundary.parentElement.tagName)
            ) {
                boundary = boundary.parentElement;
            }

            let prevChar = null;
            let nextChar = null;

            const prev = boundary.previousSibling;
            if (prev && prev.nodeType === Node.TEXT_NODE) {
                const t = prev.textContent;
                if (t && t.length > 0) {
                    prevChar = t[t.length - 1];
                }
            }

            const next = boundary.nextSibling;
            if (next && next.nodeType === Node.TEXT_NODE) {
                const t = next.textContent;
                if (t && t.length > 0) {
                    nextChar = t[0];
                }
            }

            let rawText = el.textContent || "";
            if (!rawText.trim()) {
                return;
            }

            let words = izvuciRijeci(rawText);
            if (words.length === 0) {
                return;
            }

            const trimmedStart = rawText.replace(/^\s+/, "");
            const trimmedEnd = rawText.replace(/\s+$/, "");
            const firstInnerChar = trimmedStart[0] || null;
            const lastInnerChar = trimmedEnd[trimmedEnd.length - 1] || null;

            if (jeSlovoIliCifra(prevChar) && jeSlovoIliCifra(firstInnerChar) && words.length > 0) {
                words.shift();
            }

            if (jeSlovoIliCifra(nextChar) && jeSlovoIliCifra(lastInnerChar) && words.length > 0) {
                words.pop();
            }

            total += words.length;
        });

        return total;
    };

    let brojiSveRijeci = function () {
        const text = div.textContent;
        if (!text || !text.trim()) {
            return 0;
        }
        const rijeci = izvuciRijeci(text);
        return rijeci.length;
    };

    let jeUloga = function (linija, sljedecaLinija) {
        if (!linija) {
            return false;
        }
        const ime = linija.trim();
        if (!/^[A-Z ]+$/.test(ime)) {
            return false;
        }
        if (!/[A-Z]/.test(ime)) {
            return false;
        }
        return true;
    };

    let dajBrojRijeci = function () {
        const B = brojiRijeciZaTag("b");
        const I = brojiRijeciZaTag("i");
        const U = brojiSveRijeci();
        return {
            boldiranih: B,
            italic: I,
            ukupno: U
        };
    };

    let imaLiZagrade = function (line) {
        const t = line.trim();
        return t.startsWith("(") && t.endsWith(")");
    };

    let sveVelikim = function (line) {
        return /^[A-Z ]+$/.test(line.trim());
    };

    let daLiJeSceneHeading = function (line) {
        const head = document.getElementById("scenehead");
        const sceneTitle = head ? head.textContent.trim() : "";
        if (!sceneTitle) {
            return false;
        }
        return line.trim() === sceneTitle;
    };

    let dajSveUloge = function () {
        const lines = div.innerText
            .split("\n")
            .map(l => l.trim());

        const uloge = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) {
                continue;
            }

            const next = lines[i + 1] || "";

            if (!jeUloga(line, next)) {
                continue;
            }

            let imaGovora = false;

            for (let j = i + 1; j < lines.length; j++) {
                let l2 = lines[j].trim();
                let next2 = lines[j + 1] || "";

                if (l2.length === 0) {
                    break;
                }

                if (jeUloga(l2, next2)) {
                    break;
                }

                if (imaLiZagrade(l2)) {
                    continue;
                }

                if (sveVelikim(l2) && !jeUloga(l2, next2)) {
                    break;
                }

                imaGovora = true;
                break;
            }

            if (imaGovora) {
                uloge.push(line.trim().toUpperCase());
            }
        }

        return uloge;
    };

    let dajUloge = function () {
        const sve = dajSveUloge();
        const vidjene = new Set();
        const rezultat = [];

        for (const uloga of sve) {
            if (!vidjene.has(uloga)) {
                vidjene.add(uloga);
                rezultat.push(uloga);
            }
        }

        return rezultat;
    };

    let daLiJeSlicno = function (check, target) {
        if (Math.abs(check.length - target.length) > 1 || check === target) {
            return false;
        }
        let dozvoljeno = 1;
        if (target.length > 5 && check.length > 5) {
            dozvoljeno = 2;
        }
        let duzinaKraceg = Math.min(check.length, target.length);
        let countDiff = 0;
        if (check.length !== target.length) {
            countDiff++;
        }
        for (let i = 0; i < duzinaKraceg; i++) {
            if (check[i] !== target[i]) {
                countDiff++;
            }
            if (countDiff > dozvoljeno) {
                return false;
            }
        }
        return true;
    };

    let dajBrojPonavljanja = function (sveUloge, target) {
        let brojPonavljanja = 0;
        for (let i = 0; i < sveUloge.length; i++) {
            if (sveUloge[i] === target) {
                brojPonavljanja++;
            }
        }
        return brojPonavljanja;
    };

    let pogresnaUloga = function () {
        let pogresni = [];
        let sveUloge = dajSveUloge();

        for (let i = 0; i < sveUloge.length; i++) {
            for (let j = 0; j < sveUloge.length; j++) {
                let x = dajBrojPonavljanja(sveUloge, sveUloge[j]);
                let y = dajBrojPonavljanja(sveUloge, sveUloge[i]);
                if (
                    daLiJeSlicno(sveUloge[i], sveUloge[j]) &&
                    (x >= (y + 3) && x >= 4) &&
                    !pogresni.includes(sveUloge[i])
                ) {
                    pogresni.push(sveUloge[i]);
                    break;
                }
            }
        }

        return pogresni;
    };

    let formatirajTekst = function (komanda) {
        const valid = ["bold", "italic", "underline"];
        if (!valid.includes(komanda)) {
            return false;
        }

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            return false;
        }
        if (sel.isCollapsed) {
            return false;
        }

        const range = sel.getRangeAt(0);
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }

        if (!div.contains(container)) {
            return false;
        }

        if (typeof div.focus === "function") {
            div.focus();
        }

        const result = document.execCommand(komanda, false, null);
        return !!result;
    };

    let scenarijUloge = function (uloga) {
        if (!uloga) {
            return [];
        }
        const target = uloga.trim().toUpperCase();

        const text = div.innerHTML
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n+/g, "\n")
            .trim();

        const lines = text.split("\n").map(l => l.trim());

        let jeScena = function (line) {
            if (!line) {
                return false;
            }
            const t = line.trim();
            if (!/^[A-Z .-]+$/.test(t)) {
                return false;
            }
            if (!/^(INT|EXT)\./.test(t)) {
                return false;
            }
            return true;
        };

        const je_Uloga = function (i) {
            const line = lines[i] || "";
            const next = lines[i + 1] || "";
            return jeUloga(line, next);
        };

        let currentScene = "";
        let positionInScene = 0;
        let dialogSegment = 0;
        let lastWasAction = true;
        const replicas = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (!line) {
                continue;
            }

            if (jeScena(line)) {
                currentScene = line.trim();
                positionInScene = 0;
                dialogSegment = 0;
                lastWasAction = true;
                continue;
            }

            if (je_Uloga(i)) {
                const roleName = lines[i].trim().toUpperCase();

                if (lastWasAction) {
                    dialogSegment++;
                }

                const block = [];
                let j = i + 1;

                for (; j < lines.length; j++) {
                    let l2 = lines[j].trim();
                    if (l2.length === 0) {
                        break;
                    }
                    if (jeScena(l2)) {
                        break;
                    }
                    if (je_Uloga(j)) {
                        break;
                    }
                    if (imaLiZagrade(l2)) {
                        continue;
                    }
                    if (sveVelikim(l2) && !je_Uloga(j)) {
                        break;
                    }
                    block.push(lines[j]);
                }

                if (block.length > 0) {
                    positionInScene++;
                    replicas.push({
                        scene: currentScene,
                        dialogSegment: dialogSegment,
                        positionInScene: positionInScene,
                        role: roleName,
                        lines: block
                    });
                }

                i = j - 1;
                lastWasAction = false;
                continue;
            }

            if (!imaLiZagrade(line)) {
                lastWasAction = true;
            }
        }

        const out = [];

        for (let k = 0; k < replicas.length; k++) {
            const r = replicas[k];
            if (r.role !== target) {
                continue;
            }

            let prev = null;
            for (let p = k - 1; p >= 0; p--) {
                const cand = replicas[p];
                if (cand.scene !== r.scene) {
                    break;
                }
                if (cand.dialogSegment !== r.dialogSegment) {
                    break;
                }
                prev = {
                    uloga: cand.role,
                    linije: cand.lines.slice()
                };
                break;
            }

            let next = null;
            for (let n = k + 1; n < replicas.length; n++) {
                const cand = replicas[n];
                if (cand.scene !== r.scene) {
                    break;
                }
                if (cand.dialogSegment !== r.dialogSegment) {
                    break;
                }
                next = {
                    uloga: cand.role,
                    linije: cand.lines.slice()
                };
                break;
            }

            out.push({
                scena: r.scene || "",
                pozicijaUTekstu: r.positionInScene,
                prethodni: prev,
                trenutni: {
                    uloga: r.role,
                    linije: r.lines.slice()
                },
                sljedeci: next
            });
        }

        return out;
    };

    let grupisiUloge = function () {
        const text = div.innerHTML
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n+/g, "\n")
            .trim();

        if (!text) {
            return [];
        }

        const lines = text.split("\n").map(l => l.trim());

        let jeScena = function (line) {
            if (!line) {
                return false;
            }
            const t = line.trim();
            if (!/^[A-Z .-]+$/.test(t)) {
                return false;
            }
            if (!/^(INT|EXT)\./.test(t)) {
                return false;
            }
            return true;
        };

        const groups = [];
        const groupIndex = {};
        let currentScene = "";
        let dialogSegment = 0;
        let lastSeparator = true;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (!line) {
                continue;
            }

            const next = lines[i + 1] || "";

            if (jeScena(line)) {
                currentScene = line.trim();
                dialogSegment = 0;
                lastSeparator = true;
                continue;
            }

            if (jeUloga(line, next)) {
                const roleName = line.trim().toUpperCase();

                let imaGovora = false;
                let j = i + 1;

                for (; j < lines.length; j++) {
                    let l2 = lines[j].trim();
                    let next2 = lines[j + 1] || "";

                    if (l2.length === 0) {
                        break;
                    }
                    if (jeScena(l2)) {
                        break;
                    }
                    if (jeUloga(l2, next2)) {
                        break;
                    }
                    if (imaLiZagrade(l2)) {
                        continue;
                    }
                    if (sveVelikim(l2) && !jeUloga(l2, next2)) {
                        break;
                    }

                    imaGovora = true;
                    break;
                }

                if (!imaGovora) {
                    i = j - 1;
                    lastSeparator = true;
                    continue;
                }

                if (lastSeparator) {
                    dialogSegment++;
                }

                if (dialogSegment > 0) {
                    const key = currentScene + "#" + dialogSegment;
                    if (!groupIndex.hasOwnProperty(key)) {
                        groupIndex[key] = groups.length;
                        groups.push({
                            scena: currentScene,
                            segment: dialogSegment,
                            uloge: []
                        });
                    }
                    const g = groups[groupIndex[key]];
                    if (!g.uloge.includes(roleName)) {
                        g.uloge.push(roleName);
                    }
                }

                lastSeparator = false;
                i = j - 1;
                continue;
            }
        }

        return groups;
    };

    let brojLinijaTeksta = function (uloga) {
        if (!uloga) {
            return 0;
        }
        const target = uloga.trim().toUpperCase();

        const text = div.innerHTML
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n+/g, "\n")
            .trim();

        const lines = text.split("\n");
        let total = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            if (!jeUloga(line, lines[i + 1] || "")) {
                continue;
            }

            const roleName = line.trim().toUpperCase();
            const jeTrazeniLik = (roleName === target);

            let j = i + 1;
            for (; j < lines.length; j++) {
                let l2 = lines[j].trim();

                if (l2.length === 0) {
                    break;
                }
                if (daLiJeSceneHeading(l2)) {
                    break;
                }
                if (jeUloga(lines[j], lines[j + 1] || "")) {
                    break;
                }
                if (imaLiZagrade(l2)) {
                    continue;
                }
                if (sveVelikim(l2) && !jeUloga(lines[j], lines[j + 1] || "")) {
                    break;
                }
                if (jeTrazeniLik) {
                    total++;
                }
            }

            i = j - 1;
        }

        return total;
    };

    return {
        dajBrojRijeci: dajBrojRijeci,
        dajUloge: dajUloge,
        pogresnaUloga: pogresnaUloga,
        brojLinijaTeksta: brojLinijaTeksta,
        formatirajTekst: formatirajTekst,
        scenarijUloge: scenarijUloge,
        grupisiUloge: grupisiUloge
    };
};
