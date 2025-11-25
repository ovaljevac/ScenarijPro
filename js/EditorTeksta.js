let EditorTeksta = function (divRef) {
    if (!divRef || !(divRef instanceof HTMLElement)) {
        throw new Error("Pogresan tip elementa!");
    }
    if (!divRef.isContentEditable) {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    const div = divRef;

    let jeSlovoIliCifra = function (ch) {
        return !!ch && /[\p{L}\p{N}]/u.test(ch);
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
            if (t && t.length > 0) prevChar = t[t.length - 1];
        }
        const next = boundary.nextSibling;
        if (next && next.nodeType === Node.TEXT_NODE) {
            const t = next.textContent;
            if (t && t.length > 0) nextChar = t[0];
        }
        let rawText = el.textContent || "";
        if (!rawText.trim()) return;
        let words = rawText
            .trim()
            .split(/\s+/)
            .map(w => w.replace(/[^\p{L}\p{N}\p{M}-]+/gu, ""))
            .filter(w => w.length > 0 && w !== "-");
        if (words.length === 0) return;
        const firstInnerChar = rawText[0];
        const lastInnerChar  = rawText[rawText.length - 1];
        if (jeSlovoIliCifra(prevChar) && firstInnerChar !== " " && words.length > 0) {
            words.shift();
        }
        if (jeSlovoIliCifra(nextChar) && lastInnerChar !== " " && words.length > 0) {
            words.pop();
        }

        total += words.length;
    });

    return total;
    };

    let brojiSveRijeci = function () {
        const text = div.textContent.trim();
        if (!text) {
            return 0;
        }
        return text
            .split(/\s+/)
            .map(w => w.replace(/[^\p{L}\p{N}\p{M}-]+/gu, ""))
            .filter(w => w.length > 0 && w !== "-")
            .length;
    };
        let jeUloga = function (linija, sljedecaLinija) {
        if (!linija) {
            return false;
        }
        const ime = linija.trim();
        const regexUloga = /^(?=.*[A-Z])[A-Z ]+$/;
        if (!regexUloga.test(ime)) {
            return false;
        }
        if (!sljedecaLinija) {
            return false;
        }
        const govor = sljedecaLinija.trim();
        if (govor.length === 0) {
            return false;
        }
        const letters = govor.match(/[A-Za-z]/g);
        if (!letters || letters.length === 0) {
            return false;
        }
        const onlyLetters = letters.join("");
        if (onlyLetters === onlyLetters.toUpperCase()) {
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

    let dajSveUloge = function () {
        const lines = div.innerText
            .split("\n")
            .map(l => l.trim())
            .filter(l => l.length > 0);
        const uloge = [];
        for (let i = 0; i < lines.length - 1; i++) {
            if (jeUloga(lines[i], lines[i + 1])) {
                uloge.push(lines[i]);
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
        if(Math.abs(check.length - target.length) > 1 || check === target) {
            return false;
        }
        let dozvoljeno = 1;
        if (target.length > 5 && check.length > 5) {
            dozvoljeno = 2;
        }
        let duzinaKraceg = Math.min(check.length, target.length)
        let countDiff = 0;
        if(check.length !== target.length) {
            countDiff++ ;
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
    }

    let dajBrojPonavljanja = function(sveUloge, target) {
        let brojPonavljanja = 0;
        for (let i = 0; i < sveUloge.length ; i++) {
            if (sveUloge[i] === target) {
                brojPonavljanja++;
            }
        }
        return brojPonavljanja;
    }

    let pogresnaUloga = function () {
        let pogresni = [];
        let sveUloge = dajSveUloge();
        for (let i = 0; i < sveUloge.length; i++) {
            for (let j = 0; j < sveUloge.length; j++) {
                let x = dajBrojPonavljanja(sveUloge, sveUloge[j]);
                let y = dajBrojPonavljanja(sveUloge, sveUloge[i]);
                if(daLiJeSlicno(sveUloge[i], sveUloge[j]) 
                    && (x >= (y + 3) && x >= 4)
                    && !(pogresni.includes(sveUloge[i]))) {
                    pogresni.push(sveUloge[i]);
                    break;
                }
            }
        }
        return pogresni;
    }


let formatirajTekst = function (komanda) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    if (sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
    }
    if (!div.contains(container)) return false;
    let tag = "";
    if (komanda === "bold") tag = "b";
    else if (komanda === "italic") tag = "i";
    else if (komanda === "underline") tag = "u";
    else return false;
    let alreadyInside = container.closest(tag);
    if (alreadyInside && div.contains(alreadyInside)) {
        sel.removeAllRanges();
        return false;
    }
    const contents = range.extractContents();
    const wrapper = document.createElement(tag);
    wrapper.appendChild(contents);
    range.insertNode(wrapper);
    sel.removeAllRanges();
    return true;
};


let imaLiZagrade = function (line) {
    const t = line.trim();
    return t.startsWith("(") && t.endsWith(")");
}


let sveVelikim = function (line) {
    return /^[A-Z ]+$/.test(line.trim());
}

let daLiJeSceneHeading = function (line) {
    const head = document.getElementById("scenehead");
    const sceneTitleEl = head ? head.textContent.trim() : "";
    if (!sceneTitleEl) return false;
    return line.trim() === sceneTitleEl.textContent.trim();
}


let scenarijUloge = function (uloga) {
    if (!uloga) return [];
    const target = uloga.trim().toUpperCase();

    const text = div.innerHTML
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n+/g, "\n")
        .trim();

    const lines = text.split("\n");
    const je_Uloga = function (i) {
        const line = lines[i] || "";
        const next = lines[i + 1] || "";
        return jeUloga(line, next);
    };
    let positionInScene = 0;
    let dialogSegment = 0;
    let lastWasAction = true;
    const replicas = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.length === 0) continue;
        if (je_Uloga(i)) {
            const roleName = lines[i].trim().toUpperCase();
            if (lastWasAction) dialogSegment++;
            const block = [];
            let j = i + 1;
            for (; j < lines.length; j++) {
                let l2 = lines[j].trim();
                if (l2.length === 0) break;
                if (je_Uloga(j)) break;
                if (imaLiZagrade(l2)) continue;
                if (sveVelikim(l2) && !je_Uloga(j)) break;
                block.push(lines[j]);
            }
            if (block.length > 0) {
                positionInScene++;
                replicas.push({
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
        if (r.role !== target) continue;
        let prev = null;
        for (let p = k - 1; p >= 0; p--) {
            const cand = replicas[p];
            if (cand.dialogSegment !== r.dialogSegment) break;
            prev = { uloga: cand.role, linije: cand.lines.slice() };
            break;
        }

        let next = null;
        for (let n = k + 1; n < replicas.length; n++) {
            const cand = replicas[n];
            if (cand.dialogSegment !== r.dialogSegment) break;
            next = { uloga: cand.role, linije: cand.lines.slice() };
            break;
        }
        const head = document.getElementById("scenehead");
    const sceneTitle = head ? head.textContent.trim() : "";


        out.push({
            scena: sceneTitle, // ili naziv koji znaš iz sidebara
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
    if (!text) return [];
    const lines = text.split("\n");
    const head = document.getElementById("scenehead");
    const sceneTitle = head ? head.textContent.trim() : "";
    if (!sceneTitle) return [];
    let dialogSegment = 0;
    let lastSeparator = true;
    const groups = [];
    const groupIndex = {}; 
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        let next = lines[i + 1] || "";

        if (line.length === 0) {
            continue;
        }

        if (jeUloga(line, next)) {
            const roleName = line.trim().toUpperCase();
            let j = i + 1;
            let imaGovora = false;
            for (; j < lines.length; j++) {
                let l2 = lines[j].trim();
                let next2 = lines[j + 1] || "";
                if (l2.length === 0) break;      
                if (jeUloga(l2, next2)) break;
                if (imaLiZagrade(l2)) continue;       
                if (sveVelikim(l2) && !jeUloga(l2, next2)) break;
                imaGovora = true;
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
                const key = dialogSegment;
                if (!groupIndex.hasOwnProperty(key)) {
                    groupIndex[key] = groups.length;
                    groups.push({
                        scena: sceneTitle,
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
        if (!imaLiZagrade(line)) {
            lastSeparator = true;
        }
    }
    return groups;
};



let brojLinijaTeksta = function (uloga) {
    if (!uloga) return 0;
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

        if (!jeUloga(line, lines[i + 1] || "")) continue;

        const roleName = line.trim().toUpperCase();
        const jeTrazeniLik = (roleName === target);

        let j = i + 1;
        for (; j < lines.length; j++) {
            let l2 = lines[j].trim();

            if (l2.length === 0) break; 
            if (daLiJeSceneHeading(l2)) break; 
            if (jeUloga(lines[j], lines[j + 1] || "")) break;

            if (imaLiZagrade(l2)) continue;

            if (sveVelikim(l2) && !jeUloga(lines[j], lines[j + 1] || "")) break;

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




