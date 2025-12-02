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

    
});
