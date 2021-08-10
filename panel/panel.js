// Player object: {name: string, score: string, leader: boolean}
let players = [];
const exitButton = document.getElementById("exitGame");
const startContainer = document.getElementById("startContainer");
const startButton = document.getElementById("startGame");
const continueButton = document.getElementById("continueButton");
const chatInput = document.getElementById("chatInput");
// Connection to content script
let contentConn;
// Current player of the tab
let currentPlayer;
// Socket connection to the server
let socket;

// Chat in the panel
let chat = [];

let currentTab;

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  currentTab = tabs[0];
});
console.log("panel script init");

// Listening to messages from content script
function onConnectListener(port) {
  console.log("panel runtime onconnect");
  if (port.name !== 'panel') return;
  port.onMessage.addListener(function (msg) {
    console.log("message in panel", msg);
    switch (msg.cmd) {
      case "init":
        initSockets(msg.payload.name, msg.payload.score, msg.payload.roomId);
        break;
      case "set_score":
        socket.send(createSocketMessage("set_score", { totalScore: msg.payload.totalScore }));
        break;
      case "hide_start":
        startButton.style.display = "none";
        break;
      case "hide_continue":
        continueButton.style.display = "none";
        break;
      case "show_continue":
        showStartButton(continueButton);
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

// Building the HTML for player list
function buildPlayerList() {
  const htmlList = document.getElementById("playerList");
  htmlList.innerHTML = "";
  const orderByPoints = players.sort((a, b) => b.score - a.score);
  let counter = 1;
  for (const player of orderByPoints) {
    htmlList.innerHTML += `
    <tr>
      <th scope="row">${counter++}</th>
      <td>${player.name}</td>
      <td>${player.score}</td>
    </tr>`
  }
}

function buildChat() {
  const htmlList = document.getElementById("chatHistory");
  htmlList.innerHTML = "";
  // reversing to get newest in bottom
  const chatReversed = chat.reverse();
  for (const message of chatReversed) {
    let messageLine = `
      <b>${message.author}: </b>
      ${message.message}
    `;
    if (message.author === "system") {
      messageLine = `<i>${messageLine}</i>`
    }
    htmlList.innerHTML += `
      <div class="chat-message">
        ${messageLine}
      </div>
    `
  }
}

// Messages from backend sockets
// Parameters: name - new player name, score - new player score
function initSockets(name, score, roomId) {
  socket = io("ws://localhost:3000");
  socket.send(createSocketMessage("add_player", { name, score, roomId }))
  socket.on("message", data => {
    const msg = JSON.parse(data);
    console.log("received from socket:", msg);
    // Responding to messages from the server 
    switch (msg.cmd) {
      case "update_room":
        console.log("updating room, payload:", msg.payload);
        players = Object.values(msg.payload.players);
        chat = [...msg.payload.chat];
        buildPlayerList();
        buildChat();
        break;
      case "set_current_player":
        updateCurrentPlayer(msg.payload);
        break;
      case "start_game":
        msgContent("start_game");
        break;
      case "continue_game":
        msgContent("continue_game");
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
    contentConn = chrome.tabs.connect(currentTab.id, { name: "content" });
  }
  console.log("sending message from panel to content:", { cmd, payload }, contentConn);
  contentConn.postMessage({ cmd, payload });
}

exitButton.addEventListener("click", async () => {
  msgContent("close_panel");
});

startButton.addEventListener("click", async () => {
  socket.send(createSocketMessage("start_game"))
});

continueButton.addEventListener("click", async () => {
  socket.send(createSocketMessage("continue_game"))
});

chatInput.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    const msg = chatInput.value.trim();
    if (msg !== "") { 
      sendChatMessage(chatInput.value); 
    }
    chatInput.value = "";
  }
});

function updateCurrentPlayer(player) {
  currentPlayer = player;
  showStartButton(startButton);
}

// Only show start/continue buttons if player is leader
function showStartButton(btn) {
  if (!currentPlayer.leader) {
    startContainer.style.display = "none";
    btn.style.display = "none";
  } else {
    startContainer.style.display = "flex";
    btn.style.display = "unset";
  }
}

function sendChatMessage(message) {
  socket.send(createSocketMessage("chat_message", { message }));
}

