// name, score
let players = [];
const exitButton = document.getElementById("exitGame");
const startButton = document.getElementById("startGame");
let contentConn;
let id;
let currentPlayer;
let socket;
let currentTab;

chrome.tabs.query({active: true, currentWindow: true},function(tabs){
	currentTab = tabs[0];
  console.log("set panel's current tab to:", currentTab);
});
console.log("panel script init");

function onConnectListener(port) {
  console.log("panel runtime onconnect");
  if (!id && port.name.startsWith("panel-")) {
    id = port.name.substring(6);
    console.log("assigning id:", id);
  }
  if (port.name !== `panel-${id}`) return;
  console.log("reached onMessage in panel");
  port.onMessage.addListener(function (msg) {
    console.log("message in panel", msg);
    switch (msg.cmd) {
      case "init":
        initSockets(msg.payload.name, msg.payload.score);
        break;
      case "set_score":
        socket.send(createSocketMessage("set_score", {id: currentPlayer.id, totalScore: msg.payload.totalScore}));
        break;
      case "close":
        console.log("closed the socket connection");
        socket.close();
        break;
    }
    console.log("received at panel", msg);
  });
  chrome.runtime.onConnect.removeListener(onConnectListener);
}
// Messages from chrome content/background scripts
chrome.runtime.onConnect.addListener(onConnectListener);
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
      case "set_current_player":
        updateCurrentPlayer(msg.payload);
        break;
      case "start_game":
        msgContent("start_game");
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
    console.log("no contentConn!");
    // const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    contentConn = chrome.tabs.connect(currentTab.id, { name: "content" });
    console.log("set contentConn tab:", currentTab);
    // console.log("got tab:", tab.index);
  }
  console.log("sending message from panel to content:", {cmd, payload}, contentConn);
  contentConn.postMessage({ cmd, payload });
}

exitButton.addEventListener("click", async () => {
  msgContent("close_panel");
});

startButton.addEventListener("click", async () => {
  socket.send(createSocketMessage("start_game"))
});

function updateCurrentPlayer(player) {
  currentPlayer = player;
  if (!currentPlayer.leader) {
    startButton.style.display = "none";
  } else {
    startButton.style.display = "unset";
  }
}

