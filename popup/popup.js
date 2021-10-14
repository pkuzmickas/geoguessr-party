const host = 'ec2-35-179-97-149.eu-west-2.compute.amazonaws.com';

const startButton = document.getElementById("startButton");
const exitButton = document.getElementById("exitButton");

let tab;
let port;

let api = `http://${host}:3000`

initTabAndPort();


async function initTabAndPort() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
    // Checks if URL is not a /challenge/ url
    if(!validURL(tab.url)) {
        badURLPopup();
        return;
    }
    // Checks whether the panel is already opened
    port = chrome.tabs.connect(tab.id, { name: "content" });
    port.postMessage({ cmd: "is_panel_open" });
    port.onMessage.addListener(function (msg) {
        console.log("received message in popup:", msg);
        switch (msg.cmd) {
            case "is_panel_open":
                if (msg.payload === true) {
                    existingSessionPopup();
                }
                break;
        }
    });
    const urlSplit = tab.url.split("/");
    const roomId = urlSplit[urlSplit.length - 1];
    // Checks whether the game is already started
    fetch(`${api}/isingame?room=${roomId}`)
        .then(response => response.json())
        .then(data => {
            console.log(data)
            console.log("fetched:", `${api}/isingame?room=${roomId}`);
            if (data === true)
                sessionStartedPopup();
        });
}

startButton.addEventListener("click", async () => {
    const name = document.getElementById("name").value;
    if (!name) return;
    port.postMessage({ cmd: "open_panel", payload: { name } });
    window.close();
});
exitButton.addEventListener("click", async () => {
    if (!tab || !port) {
        await initTabAndPort();
    }
    port.postMessage({ cmd: "close_panel" });
    window.close();
});

function existingSessionPopup() {
    let newSessionForm = document.getElementById("newSession");
    newSessionForm.parentNode.removeChild(newSessionForm);
    let existingSessionForm = document.getElementById("existingSession");
    existingSessionForm.style.display = "unset";
}

function sessionStartedPopup() {
    let newSessionForm = document.getElementById("newSession");
    newSessionForm.parentNode.removeChild(newSessionForm);
    let sessionStartedForm = document.getElementById("sessionStarted");
    sessionStartedForm.style.display = "unset";
}

function badURLPopup() {
    let newSessionForm = document.getElementById("newSession");
    newSessionForm.parentNode.removeChild(newSessionForm);
    let sessionStartedForm = document.getElementById("badURL");
    sessionStartedForm.style.display = "unset";
}

function validURL(str) {
    const pattern = new RegExp('^(https?:\/\/)?(www\.)?geoguessr\.com\/challenge\/[a-zA-Z0-9]+$');
    return !!pattern.test(str);
}
