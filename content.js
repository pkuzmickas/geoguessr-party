// GLOBAL VARIABLES

const panel = {
    size: "400px",
    open: false
}

let iframe;
let nextBody;
let header;
let panelConn;
const id = Date.now();

main();

// FUNCTIONS

function main() {
    listenToMessages();
    initPanel();
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
    panelConn = chrome.runtime.connect({ name: `panel-${id}` });
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

function listenToMessages() {
    chrome.runtime.onConnect.addListener(function (port) {
        if(port.name !== "content") return;
        port.onMessage.addListener(async function (msg, port) {
            console.log("msg in content", msg);
            switch (msg.cmd) {
                case "open_panel":
                    openPanel();
                    msgPanel("init", {name: msg.payload.name, score: 0});
                    break;
                case "close_panel":
                    closePanel();
                    break;
                case "disable_start":
                    disableStart();
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
    panelConn.postMessage({ cmd, payload });
}
