const startButton = document.getElementById("startButton");
const exitButton = document.getElementById("exitButton");

let tab;
let port;

async function initTabAndPort() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
    port = chrome.tabs.connect(tab.id, { name: "content" });
}

startButton.addEventListener("click", async () => {
    // TODO: disable this button after open?
    if (!tab || !port) {
        await initTabAndPort();
    }
    const name = document.getElementById("name").value;
    port.postMessage({ cmd: "open_panel", payload: {name} });
    window.close();
});
exitButton.addEventListener("click", async () => {
    if (!tab || !port) {
        await initTabAndPort();
    }
    port.postMessage({ cmd: "close_panel" });
    window.close();
});