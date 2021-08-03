// name, score
let players = [];
const exitButton = document.getElementById("exitGame");
const startButton = document.getElementById("startGame");
let contentConn;
let id;
let socket;
console.log("panel script init");

function onConnectListener(port) {
  console.log("panel runtime onconnect");
  if (!id && port.name.startsWith("panel-")) {
    id = port.name.substring(6);
    console.log("assigning id:", id);
  }
  if (port.name !== `panel-${id}`) return;
  port.onMessage.addListener(function (msg) {
    console.log("message in panel", msg);
    switch (msg.cmd) {
      case "init":
        initSockets(msg.payload.name, msg.payload.score);
        break;
      case "close":
        console.log("closed the socket connection");
        socket.close();
        break;
    }
    console.log("received at panel", msg);
  });
  console.log("removing listener");
  chrome.runtime.onConnect.removeListener(onConnectListener);
}
// Messages from chrome content/background scripts
console.log("adding listener", onConnectListener);
chrome.runtime.onConnect.addListener(onConnectListener);
console.log("has listener?", chrome.runtime.onConnect.hasListener(onConnectListener));
function buildPlayerList() {
  const htmlList = document.getElementById("playerList");
  htmlList.innerHTML = "";
  for (const player of players) {
    htmlList.innerHTML += `
    <div class="row">
      <div class="col">
        ${player.name}
      </div>
      <div class="col">
        ${player.score}
      </div>
    </div>`
  }
}

// Messages from backend sockets
// Parameters: name - new player name, score - new player score
function initSockets(name, score) {
  socket = io("ws://localhost:3000");
  socket.send(createSocketMessage("add_player", { name, score }))
  socket.on("message", data => {
    const msg = JSON.parse(data);
    console.log("received from socket:", msg);
    switch (msg.cmd) {
      case "update_players":
        players = [...msg.payload];
        buildPlayerList();
        break;

      default:
        break;
    }
  });
}

function createSocketMessage(cmd, payload) {
  return JSON.stringify({ cmd, payload });
}

async function msgContent(cmd, payload) {
  if (!contentConn) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    contentConn = chrome.tabs.connect(tab.id, { name: "content" });
  }
  contentConn.postMessage({ cmd, payload });
}

exitButton.addEventListener("click", async () => {
  msgContent("close_panel");
});

