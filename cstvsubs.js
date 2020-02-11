const alphanumCharRegex = /[a-zA-Z]|[À-ʸ]/;

class Subber {
    constructor() {
        // google translate doesn't allow being put in an iframe,
        // so we must put it in a separate window
        this.googleTranslateWindow = null;
        this.intervalId = null;
    }
    initialize() {
        console.log("CSTVSubtitler: running.");
        let originalTxt = "";

        const videoPlayer = document.getElementById("ctPlayer1");
        if (videoPlayer == null) {
            console.log("CSTVSubtitler: Video played not found.");
            return;
        }
        const subtitlesBox = document.createElement("div");
        subtitlesBox.id = "cstvsub-subtitlesContainer";
        subtitlesBox.innerHTML = "Subtitles go here.";
        subtitlesBox.style.fontSize = "22px";
        subtitlesBox.style.textAlign = "center";
        const dictionaryIframeContainer = document.createElement("div");
        const dictionaryIframe = document.createElement("iframe");
        dictionaryIframe.width = "60%";
        dictionaryIframe.height = "700px";
        dictionaryIframe.style.float = "left";
        dictionaryIframeContainer.appendChild(dictionaryIframe);

        const historyBox = document.createElement("div");
        historyBox.style.width = "39%";
        historyBox.style.float = "left";
        historyBox.style.fontSize = "18px";
        dictionaryIframeContainer.appendChild(historyBox);
        const historyLines = document.createElement("div");
        historyBox.appendChild(historyLines);
        videoPlayer.appendChild(subtitlesBox);
        videoPlayer.appendChild(dictionaryIframeContainer);

        const sidePanel = document.getElementsByClassName("sidePanel")[0];
        sidePanel.remove();
        const mainPanel = document.getElementsByClassName("mainPanel")[0];
        // normal size of mainPanel + side panel size that we just removed
        mainPanel.style.width = "980px";

        subtitlesBox.addEventListener("click", (e) => {
            if (e.target.tagName === "A") {
                e.preventDefault();
                dictionaryIframe.src = e.target.href;
            }
        });
        historyLines.addEventListener("click", (e) => {
            if (e.target.className === "dictionary-link") {
                e.preventDefault();
                dictionaryIframe.src = e.target.href;
            } else if (e.target.className === "google-translate-link") {
                e.preventDefault();
                if (this.googleTranslateWindow == null) {
                    this.googleTranslateWindow = window.open(e.target.href)
                } else {
                    this.googleTranslateWindow.location.replace(e.target.href);
                }
            }
        });

        let currentSentence = "";
        let currentSentenceHtml = "";
        let currentSentenceTimeStamp = "";

        this.intervalId = setInterval(() => {
            const txt = this.getSubtitles();
            if (txt != null && txt !== "" && txt !== originalTxt) {
                subtitlesBox.innerText = "";
                originalTxt = txt;
                let currentWord = "";
                let subtitleBoxHtml = "";
                let inWord = false;
                if (currentSentenceTimeStamp == null) {
                    currentSentenceTimeStamp = document.getElementsByClassName("seekBarTimeInfo")[0].innerHTML;
                }
                for (let c of txt) {
                    currentSentence += c;
                    if (c.match(alphanumCharRegex)) {
                        if (!inWord) {
                            inWord = true;
                            currentWord = "";
                        }
                        currentWord += c;
                    } else {
                        if (inWord) {
                            inWord = false;
                            const wikipediaArticleName = currentWord.toLocaleLowerCase();
                            const html = `<a target='_blank' class='dictionary-link' href='https://slovniky.lingea.cz/Anglicko-cesky/${wikipediaArticleName}'>${currentWord}</a>`;
                            subtitleBoxHtml += html;
                            currentSentenceHtml += html;
                        }
                        if (c === "\n") {
                            subtitleBoxHtml += "<br>";
                        } else {
                            subtitleBoxHtml += c;
                            currentSentenceHtml += c;
                            // TODO: this is buggy when
                            // * there are multiple dots ("...")
                            // * there is a dot that doesn't end a sentence ("Král Karel IV.")
                            if (c === "." || c === "!" || c === "?") {
                                const newHistory = document.createElement("div");
                                newHistory.innerHTML = `${currentSentenceTimeStamp}: ${currentSentenceHtml}`;

                                const link = document.createElement("a");
                                link.target = "_blank";
                                link.className = "google-translate-link";
                                link.href = `https://translate.google.com/#view=home&op=translate&sl=cs&tl=en&text=${currentSentence}`;
                                link.innerText = " → Translate";
                                newHistory.appendChild(link);
                                if (this.googleTranslateWindow != null) {
                                    this.googleTranslateWindow.location.replace(link.href);
                                }
                                historyLines.prepend(newHistory);
                                currentSentence = "";
                                currentSentenceHtml = "";
                                currentSentenceTimeStamp = null;
                            }
                        }
                    }
                }
                subtitlesBox.innerHTML = subtitleBoxHtml;
            }
        }, 100);
    }
    getSubtitles() {
        const lines = document.getElementsByClassName("subtitlesLine");
        let txt = "";
        for (let i = 0 ; i < lines.length ; i++) {
            const line = lines[i].innerText;
            txt += line;
            if (line[line.length-1] !== " ") {
                txt += " ";
            }
            txt += "\n";
        }
        return txt;
    }

    clear() {
        if (this.intervalId != null) {
            clearInterval(this.intervalId);
        }
        if (this.googleTranslateWindow != null) {
            this.googleTranslateWindow.close();
        }
    }
}

function main() {
    // wait until at least one subtitle appear before
    // doing anything, to make sure that the video is actually loaded
    console.log("CSTVSubtitler: waiting for first subtitle.");
    let waitForFirstSubtitlesInterval = setInterval(() => {
        const lines = document.getElementsByClassName("subtitlesLine");
        if (lines.length !== 0) {
            console.log("CSTVSubtitler: found subtitle.");
            let subber = new Subber();
            subber.initialize();
            window.addEventListener("unload", () => {
                subber.clear();
            });
            clearInterval(waitForFirstSubtitlesInterval);
        }
    }, 50);
}

main();

