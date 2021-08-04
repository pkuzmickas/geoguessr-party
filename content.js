// GLOBAL VARIABLES

const panel = {
    size: "400px",
    open: false
}

let iframe;
let nextBody;
let header;
let panelConn;
let previousStartButton = {};
let startButton;
const id = Date.now();

main();

console.log("hi from content");
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
    console.log("connecting to panel, ID:", id);
    panelConn = chrome.runtime.connect({ name: `panel-${id}` });
    console.log("connected:", panelConn);
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
    console.log("copied:", startButton, "into", previousStartButton);
    startButton.setAttribute("disabled", "true");
    startButton.style.backgroundColor = "black";
    startButton.querySelector(".button__label").innerHTML = "NESPAUSK BLET :)"
}

function enableStart() {
    startButton.removeAttribute("disabled");
    startButton.style.backgroundColor = previousStartButton.style.backgroundColor;
    startButton.querySelector(".button__label").innerHTML = previousStartButton.querySelector(".button__label").innerHTML;
}

function listenToMessages() {
    console.log("listening to messages in content");
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
                    chrome.storage.local.set({ started: false }, function () {
                        console.log('Started is set to ' + false);
                    });
                    break;
                case "is_panel_open":
                    port.postMessage({ cmd: "is_panel_open", payload: !!document.getElementById("ggPartyPanel") });
                    break;
                case "start_game":
                    startGame();
                    break;
                default:
                    console.warn("unrecognised msg command:", msg);
                    break;
            }
            // port.postMessage({ answer: "Madame" });
            return true
        });
    });
}

function msgPanel(cmd, payload) {
    console.log("sending panel message:", { cmd, payload }, panelConn);
    panelConn.postMessage({ cmd, payload });
}

function startGame() {
    startButton.removeAttribute("disabled");
    startButton.click();
    // once game starts:
    // result width change
    // game-layout for game width
    //gmnoprint 100%
    // child svg 100%
    console.log("resizing the game window in 2 secs...");
    setTimeout(() => {
        console.log("resized the game window");
        const gameLayout = document.querySelector(".game-layout");
        gameLayout.style.width = "calc(100% - 400px)";
        const gameCanvas = document.querySelector("canvas");
        gameCanvas.style.width = "100%";
        const arrowsContainer = document.querySelector(".gmnoprint");
        arrowsContainer.style.width = "100%";
        const arrows = arrowsContainer.firstChild;
        arrows.style.width = "100%";
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
        // Use traditional 'for loops' for IE 11
        console.log("callback! something changed");
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const result = document.querySelector('.result');
                if (result) {
                    result.style.width = "calc(100% - 400px)";
                    console.log("changed result size: ", result);
                }
                const totalScore =
                    document.querySelector(".table__row.table__row--highlighted span.highscore__score")?.childNodes[1]?.data.toString().replace(",", "")
                    ??
                    document.querySelector(".score-bar__label").childNodes[1].data.toString().replace(",", "")
                console.log("got totalscore:", totalScore)
                msgPanel("set_score", { totalScore: totalScore });
            } else {
                console.log('something different changes', mutation);
            }
        }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);

    // Later, you can stop observing
    // observer.disconnect();

}

// observe for results **********
