
main();

// GLOBAL VARIABLES

const panel = {
    size: "400px",
    open: false,
    init: false
}

const players = [];

let iframe;
let nextBody;
let header;
let panelConn;
// FUNCTIONS

function main() {
    listenToPopup();
    disableStart();
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
    iframe.src = chrome.runtime.getURL("panel/panel.html")
    document.body.appendChild(iframe);

    // Reduce body/header size
    nextBody = document.getElementById("__next");
    header = document.querySelector("header");
}

function openPanel() {
    if (!panel.init) {
        panel.init = true;
        initPanel();
    }
    panel.open = true;
    iframe.style.width = panel.size;
    iframe.style.display = "block";
    nextBody.style.width = "calc(100% - 400px)";
    header.style.width = "calc(100% - 400px)";
    // connectToPanel();
}

async function connectToPanel() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    panelConn = chrome.tabs.connect(tab.id, { name: "panel" });
}

function closePanel() {
    panel.open = false;
    iframe.style.width = "0px";
    iframe.style.display = "none";
    nextBody.style.width = "100%";
    header.style.width = "100%";
}

function disableStart() {
    let startButton = document.querySelector('[data-qa="start-challenge-button"]');
    if (!startButton) {
        startButton = document.querySelector('[data-qa="join-challenge-button"]');
    }
    startButton.setAttribute("disabled", "true");
    startButton.style.backgroundColor = "black";
}

function connectToBackground() {
    // const port = chrome.runtime.connect({ name: "content" });
    // port.onMessage.addListener(function (msg) {
    //     console.log("content", msg);
    //     switch (msg.cmd) {
    //         case "open_panel":
    //             openPanel();
    //             break;
    //         case "close_panel":
    //             closePanel();
    //             break;
    //         default:
    //             console.warn("unrecognised msg command:", msg);
    //             break;
    //     }
    //     // port.postMessage({ answer: "Madame" });
    //     return true
    // });

}

function listenToPopup() {
    chrome.runtime.onConnect.addListener(function (port) {
        console.assert(port === "content");
        // console.log("connect");
        // console.log(port.sender)
        // console.log(port.sender.tab.id)
        port.onMessage.addListener(async function (msg, port) {
            console.log("msg in content", msg);
            // console.log(port.sender)
            // console.log(port.sender.tab.id)
            switch (msg.cmd) {
                case "open_panel":
                    openPanel();
                    players.push({
                        name: msg.payload.name
                    });
                    // msgPanel("add_player", players[players.length-1]);
                    break;
                case "close_panel":
                    closePanel();
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
    panelConn.postMessage({ cmd, payload});
}

// TODO: make panel listen to messages properly

