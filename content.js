// GLOBAL VARIABLES

const panel = {
    size: "400px",
    open: false
}

// Panel's iframe
let iframe;
// Game screen body/header
let nextBody;
let header;
// Connection to panel's JS, using chrome.runtime ports
let panelConn;
// Saving unchanged start button for when stopping extension
let previousStartButton = {};

let startButton;

// Text to show the players when their start button is disabled
let disabledButtonText = "NESPAUSK BLET :)";

// Observes the game state, checks when the result screen is up
let stateObserver;

main();

// FUNCTIONS

function main() {
    listenToMessages();
}

function initPanel() {
    console.log("panel init");
    // Init iframe
    iframe = document.createElement('iframe');
    iframe.style.height = "100%";
    iframe.style.width = "0px";
    iframe.style.position = "fixed";
    iframe.style.top = "0px";
    iframe.style.right = "0px";
    iframe.style.zIndex = "20000000";
    iframe.style.display = "none";
    iframe.setAttribute("id", "ggPartyPanel");
    iframe.src = chrome.runtime.getURL("panel/panel.html")
    document.body.appendChild(iframe);

    // Reduce body/header size
    nextBody = document.getElementById("__next");
    header = document.querySelector("header");
}

function openPanel() {
    panel.open = true;
    iframe.style.width = panel.size;
    iframe.style.display = "block";
    nextBody.style.width = "calc(100% - 400px)";
    header.style.width = "calc(100% - 400px)";
    connectToPanel();
}

async function connectToPanel() {
    panelConn = chrome.runtime.connect({ name: `panel` });
}

function closePanel() {
    panel.open = false;
    iframe.parentNode.removeChild(iframe);
    iframe = undefined;
    nextBody.style.width = "100%";
    header.style.width = "100%";
}

function disableStart() {
    startButton = document.querySelector('[data-qa="start-challenge-button"]');
    if (!startButton) {
        startButton = document.querySelector('[data-qa="join-challenge-button"]');
    }
    previousStartButton = startButton.cloneNode(true);
    startButton.setAttribute("disabled", "true");
    startButton.style.backgroundColor = "black";
    startButton.querySelector(".button__label").innerHTML = disabledButtonText;
}

function enableStart() {
    startButton.removeAttribute("disabled");
    startButton.style.backgroundColor = previousStartButton.style.backgroundColor;
    startButton.querySelector(".button__label").innerHTML = previousStartButton.querySelector(".button__label").innerHTML;
}

// Listening to messages to content
function listenToMessages() {
    chrome.runtime.onConnect.addListener(function (port) {
        console.log("connection in content, port:", port);
        if (port.name !== "content") return;
        port.onMessage.addListener(async function (msg, port) {
            console.log("msg in content", msg);
            switch (msg.cmd) {
                case "open_panel":
                    initPanel();
                    setTimeout(() => {
                        openPanel();
                        disableStart();
                        msgPanel("init", { name: msg.payload.name, score: 0 });
                    }, 1000);
                    break;
                case "close_panel":
                    msgPanel("close");
                    enableStart();
                    closePanel();
                    stateObserver.disconnect();
                    break;
                case "is_panel_open":
                    port.postMessage({ cmd: "is_panel_open", payload: !!document.getElementById("ggPartyPanel") });
                    break;
                case "start_game":
                    startGame();
                    break;
                case "continue_game":
                    continueGame();
                    break;
                default:
                    console.warn("unrecognised msg command:", msg);
                    break;
            }
            return true
        });
    });
}

function msgPanel(cmd, payload) {
    console.log("sending panel message:", { cmd, payload }, panelConn);
    panelConn.postMessage({ cmd, payload });
}

function continueGame() {
    const nextRoundButton = document.querySelector("[data-qa='close-round-result']");
    if (nextRoundButton) {
        nextRoundButton.removeAttribute("disabled");
        nextRoundButton.click();
    }
    msgPanel("hide_continue");
}

function startGame() {
    startButton.removeAttribute("disabled");
    startButton.click();
    msgPanel("hide_start");
    console.log("resizing the game window in 2 secs...");
    setTimeout(() => {
        console.log("resized the game window");
        const gameLayout = document.querySelector(".game-layout");
        if (gameLayout) gameLayout.style.width = "calc(100% - 400px)";
        const gameCanvas = document.querySelector("canvas");
        if (gameCanvas) gameCanvas.style.width = "100%";
        const arrowsContainer = document.querySelector(".gmnoprint");
        if (arrowsContainer) arrowsContainer.style.width = "100%";
        const arrows = arrowsContainer?.firstChild;
        if (arrows) arrows.style.width = "100%";
        observeForResults();
    }, 2000);
}

function observeForResults() {
    console.log("observing for results");
    // Select the node that will be observed for mutations
    const targetNode = document.querySelector('.layout__main');

    // Options for the observer (which mutations to observe)
    const config = { attributes: false, childList: true, subtree: false };

    // Callback function to execute when mutations are observed
    const callback = function (mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const result = document.querySelector('.result');
                // Reached the result screen
                if (result) {
                    msgPanel("hide_start");
                    msgPanel("show_continue");
                    disableContinue();
                    result.style.width = "calc(100% - 400px)";
                    console.log("changed result size: ", result);
                    const totalScore =
                        document.querySelector(".table__row.table__row--highlighted span.highscore__score")?.childNodes[1]?.data.toString().replace(",", "")
                        ??
                        document.querySelector(".score-bar__label").childNodes[1].data.toString().replace(",", "")
                    msgPanel("set_score", { totalScore: totalScore });
                }
            } else {
                console.log('something different changed', mutation);
            }
        }
    };

    // Create an observer instance linked to the callback function
    stateObserver = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    stateObserver.observe(targetNode, config);

}

function disableContinue() {
    const nextRoundButton = document.querySelector("[data-qa='close-round-result']");
    if (nextRoundButton) {
        nextRoundButton.setAttribute("disabled", true);
        nextRoundButton.style.backgroundColor = "black";
        const btnText = nextRoundButton.querySelector(".button__label");
        if (btnText) {
            setTimeout(() => {
                btnText.innerHTML = disabledButtonText;
            }, 500);
        }
    }
}
