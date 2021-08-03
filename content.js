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
    chrome.runtime.onConnect.addListener(function (port) {
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
