const startButton = document.getElementById("startButton");
const exitButton = document.getElementById("exitButton");

let tab;
let port;

initTabAndPort();


async function initTabAndPort() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
    port = chrome.tabs.connect(tab.id, { name: "content" });
    port.postMessage({ cmd: "is_panel_open" });
    port.onMessage.addListener(function (msg) {
        console.log("received message in popup:", msg);
        switch (msg.cmd) {
            case "is_panel_open":
                if (msg.payload === true) {
                    disableStart();
                }
                break;
        }
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

function disableStart() {
    let name = document.getElementById("name");
    name.parentNode.removeChild(name);
    let startContainer = document.getElementById("startContainer");
    startContainer.parentNode.removeChild(startContainer);
}