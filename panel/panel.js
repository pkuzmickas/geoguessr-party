// name, score
let players = [];
const disableStartButton = document.getElementById("blockStart");
const startButton = document.getElementById("startGame");
let contentConn;
let id;

// Messages from chrome content/background scripts
chrome.runtime.onConnect.addListener(function (port) {
  if (!id && port.name.startsWith("panel-")) {
    id = port.name.substring(6);
    console.log("assigning id:",id);
  }
  if (port.name !== `panel-${id}`) return;
  port.onMessage.addListener(function (msg) {
    console.log("message in panel", msg);
    switch (msg.cmd) {
      case "init":
        initSockets(msg.payload.name, msg.payload.score);
        break;
    }
    console.log("received at panel", msg);
  });
});

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
  let socket = io("ws://localhost:3000");
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

disableStartButton.addEventListener("click", async () => {
  msgContent("disable_start", null);
});

