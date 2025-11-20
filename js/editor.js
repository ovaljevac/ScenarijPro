window.addEventListener("DOMContentLoaded", function () {
    const editorDiv = document.getElementById("divEditor");
    if (!editorDiv) {
        console.error("divEditor nije pronađen!");
        return;
    }

    const editor = EditorTeksta(editorDiv);

    function osvjeziStatistiku() {
        const stats = editor.dajBrojRijeci();  

        const liElems = document.querySelectorAll("#poruke .statistics li");
        if (liElems.length >= 3) {
            liElems[0].textContent = "Ukupan broj riječi: " + stats.ukupno;
            liElems[1].textContent = "Broj boldiranih riječi: " + stats.boldiranih;
            liElems[2].textContent = "Broj italic riječi: " + stats.italic;
        }
    }

    osvjeziStatistiku();

    const btnBold = document.getElementById("btnBold");
    if (btnBold) {
        btnBold.addEventListener("click", function () {
            editor.formatirajTekst("b");
        });

    }

    const btnItalic = document.getElementById("btnItalic");
    if (btnItalic) {
        btnItalic.addEventListener("click", function () {
            editor.formatirajTekst("i");
        });
    }

    const btnUnderline = document.getElementById("btnUnderline");
    if (btnUnderline) {
        btnUnderline.addEventListener("click", function () {
            editor.formatirajTekst("u");
        });
    }

    const btnWords = document.getElementById("btnWords");
    if (btnWords) {
        btnWords.addEventListener("click", function () {
            osvjeziStatistiku();
        });
    }
});
