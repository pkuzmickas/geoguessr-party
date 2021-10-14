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
let nextRoundButton;

// Text to show the players when their start button is disabled
const disabledButtonText = "Waiting for host to start...";
const lastResultIndicator = "VIEW SUMMARY";
const lastResultButtonText = "Waitig for host to reveal final scores...";
// Observes the game state, checks when the result screen is up
let stateObserver;

// Start game timer
let timerId;

let extensionClosed = false;

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
    if(header)
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
    resetGameToNormal();
}

function disableStart() {
    startButton = document.querySelector('[data-qa="start-challenge-button"]');
    if (!startButton) {
        startButton = document.querySelector('[data-qa="join-challenge-button"]');
    }
    previousStartButton = startButton.cloneNode(true);
    startButton.setAttribute("disabled", "true");
    startButton.style.backgroundColor = "black";
    startButton.innerText = disabledButtonText;
}

function enableStart() {
    startButton.removeAttribute("disabled");
    startButton.style.backgroundColor = previousStartButton.style.backgroundColor;
    const label = startButton.querySelector(".button__label");
    const previousLabel = previousStartButton.querySelector(".button__label")
    label.innerHTML = previousLabel.innerHTML;
    label.style = previousLabel.style;
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
                    // Initiating panel.js etc
                    setTimeout(() => {
                        openPanel();
                        disableStart();
                        // Getting roomId
                        const urlSplit = document.location.href.split("/");
                        const roomId = urlSplit[urlSplit.length - 1];
                        msgPanel("init", { name: msg.payload.name, score: 0, roomId });
                    }, 1000);
                    break;
                case "close_panel":
                    msgPanel("close");
                    enableStart();
                    closePanel();
                    if (stateObserver) {
                        stateObserver.disconnect();
                    }
                    break;
                case "is_panel_open":
                    port.postMessage({ cmd: "is_panel_open", payload: !!document.getElementById("ggPartyPanel") });
                    break;
                case "start_game":
                    startTimer(startButton, startGame);
                    break;
                case "continue_game":
                    nextRoundButton = document.querySelector("[data-qa='close-round-result']");
                    startTimer(nextRoundButton, continueGame);
                    break;
                default:
                    console.warn("unrecognised msg command:", msg);
                    break;
            }
            return true
        });
    });

    // Listen to background message about URL
    chrome.runtime.onMessage.addListener(
        function (request) {
            if (request.message === 'url_change') {
                if (!extensionClosed) {
                    if (!validChallengerOrResultURL(request.url)) {
                        msgPanel("close");
                        closePanel();
                        extensionClosed = true;
                    }
                }
            }
        }
    );

}

function validChallengerOrResultURL(str) {
    const patternChallenge = new RegExp('^(https?:\/\/)?(www\.)?geoguessr\.com\/challenge\/[a-zA-Z0-9]+$');
    const patternResult = new RegExp('^(https?:\/\/)?(www\.)?geoguessr\.com\/results\/[a-zA-Z0-9]+$');
    return !!patternChallenge.test(str) || !!patternResult.test(str);
}

function msgPanel(cmd, payload) {
    console.log("sending panel message:", { cmd, payload }, panelConn);
    panelConn.postMessage({ cmd, payload });
}

function continueGame() {
    nextRoundButton.removeAttribute("disabled");
    nextRoundButton.click();
}

function startGame() {
    startButton.removeAttribute("disabled");
    startButton.click();
    msgPanel("set_game_stage", "in-game");
    console.log("resizing the game window in 1 secs...");
    setTimeout(() => {
        console.log("resized the game window");
        reduceGameSize();
        observeForResults();
    }, 1000);
}

// Starts the timer on the element in the parameter (button usually)
// executeAfter - function to execute after timer
function startTimer(element, executeAfter) {
    let counter = 3;
    // TODO: tidy
    // const label = element.querySelector(".button__label");
    const label = element;
    if (label) {
        label.style.fontSize = "36px";
        label.innerHTML = "GET READY...";
    }
    timerId = setInterval(() => {
        label.innerHTML = counter;
        counter--;
        if (counter == -1) {
            clearInterval(timerId);
            executeAfter();
            element.style.display = "none";
        }
    }, 1000);
}

// Waiting for the game to enter results stage
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
                    // Check if it's the ad page
                    const ad = result.querySelector('.interstitial-message');
                    if (ad) {
                        msgPanel("set_game_stage", "ads");
                        const continueBtn = ad.querySelector("[data-qa='interstitial-message-continue-to-game']");
                        continueBtn.addEventListener('click', () => {
                            handleResultsScreen(result);
                        });
                    } else {
                        handleResultsScreen(result);
                    }
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

function handleResultsScreen(result) {
    console.log("results stage")
    msgPanel("set_game_stage", "results");
    const nextRoundButton = document.querySelector("[data-qa='close-round-result']");
    // Last results page before scores
    if (nextRoundButton && nextRoundButton.innerText === lastResultIndicator) {
        msgPanel("hide_scores");
    } else {
        // Update the score if not final results
        const totalScore =
            document.querySelector(".table__row.table__row--highlighted span.highscore__score")?.childNodes[1]?.data.toString().replace(",", "")
            ??
            document.querySelector(".score-bar__label")?.childNodes[1]?.data.toString().replace(",", "")
        msgPanel("set_score", { totalScore });
    }
    disableContinue(nextRoundButton);
    result.style.width = "calc(100% - 400px)";
}

function disableContinue(nextRoundButton) {
    if (nextRoundButton) {
        nextRoundButton.setAttribute("disabled", true);
        nextRoundButton.style.backgroundColor = "black";
        const btnText = nextRoundButton.querySelector(".button__label");
        if (btnText) {
            setTimeout(() => {
                btnText.innerHTML = disabledButtonText;
                if (nextRoundButton.innerText === lastResultIndicator) {
                    btnText.innerHTML = lastResultButtonText;
                }
            }, 500);
        }
    }
}

function reduceGameSize() {
    const gameLayout = document.querySelector(".game-layout");
    if (gameLayout) gameLayout.style.width = "calc(100% - 400px)";
    const gameCanvas = document.querySelector("canvas");
    if (gameCanvas) {
        gameCanvas.style.width = "100%";
        const canvasWidth = gameCanvas.clientWidth;
        gameCanvas.setAttribute("width", canvasWidth);
    }
    const arrowsContainer = document.querySelector(".gmnoprint");
    if (arrowsContainer) arrowsContainer.style.width = "100%";
    const arrows = arrowsContainer?.firstChild;
    if (arrows) arrows.style.width = "100%";
    window.dispatchEvent(new Event("resize"))
}

function resetGameToNormal() {
    const gameLayout = document.querySelector(".game-layout");
    if (gameLayout) gameLayout.style.width = "100%";
    const gameCanvas = document.querySelector("canvas");
    if (gameCanvas) {
        gameCanvas.style.width = "100%";
        const canvasWidth = gameCanvas.clientWidth;
        gameCanvas.setAttribute("width", canvasWidth);
    }
    const results = document.querySelector(".result");
    if (results) {
        results.style.width = "100%";
        const continueButton = document.querySelector('[data-qa="close-round-result"]');
        if (continueButton) {
            const continueButtonLabel = continueButton.querySelector(".button__label");
            continueButtonLabel.innerHTML = "PLAY NEXT ROUND";
            continueButton.removeAttribute("disabled");
            continueButton.style.backgroundColor = "var(--color-primary-60)";
        }
    }
    clearInterval(timerId);
}
