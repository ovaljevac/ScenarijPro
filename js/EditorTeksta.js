let EditorTeksta = function (divRef) {
    // --- privatni atributi ---
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
            if (jeSlovoIliCifra(prevChar) || jeSlovoIliCifra(nextChar)) {
                return;
            }
            let text = el.textContent.trim();
            if (!text) return;
            const words = text
                .split(/\s+/)
                .map(w => w.replace(/[^\p{L}\p{N}\p{M}-]+/gu, ""))
                .filter(w => w.length > 0 && w !== "-"); // "-" sam nije riječ
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

    let dajUloge = function () {
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
        let sveUloge = dajUloge();
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

    let brojiReplike = function (ime) {
    const text = div.innerHTML
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/\r\n/g, "\n")        
        .replace(/\r/g, "\n")          
        .replace(/\n+/g, "\n")         
        .trim();
    const lines = text.split("\n");
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const isCharacterName = /^[A-Z0-9 ]+$/.test(line);
        if (!isCharacterName) {
            continue;
        }
        if (line !== ime) {
            continue;
        }
        const nextLine = (lines[i + 1] || "").trim();
        const nextIsCharacterName = /^[A-Z0-9 ]+$/.test(nextLine);
        if (nextLine.length > 0 && !nextIsCharacterName) {
            count++;
        }
    }
    return count;
};

let formatirajSelektovaniTekstUBold = function () {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
        return;
    }
    const range = sel.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
    }
    if (!div.contains(container)) {
        return;
    }
    if (sel.isCollapsed) {
        return;
    }
    const contents = range.extractContents();
    const bold = document.createElement("b");
    bold.appendChild(contents);
    range.insertNode(bold);
    sel.removeAllRanges();
};

     return {
        dajBrojRijeci: dajBrojRijeci,
        dajUloge: dajUloge,
        pogresnaUloga: pogresnaUloga,
        brojiReplike: brojiReplike,
        formatirajSelektovaniTekstUBold: formatirajSelektovaniTekstUBold
    };

};

const editorDiv = document.getElementById("divEditor");
const editor = EditorTeksta(editorDiv);
console.log(editor.dajBrojRijeci());
console.log(editor.dajUloge());
console.log(editor.pogresnaUloga());
console.log(editor.brojiReplike("NAVIGATER"));
document.getElementById("btnBold").addEventListener("click", () => {
    editor.formatirajSelektovaniTekstUBold();
});
document.getElementById("btnWords").addEventListener("click", () => {
  editor.dajBrojRijeci()
})


