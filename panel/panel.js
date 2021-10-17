const host = 'ec2-35-179-97-149.eu-west-2.compute.amazonaws.com';

// Player object: {name: string, score: string, leader: boolean}
let players = [];
const exitButton = document.getElementById("exitGame");
const startContainer = document.getElementById("startContainer");
const startButton = document.getElementById("startGame");
const continueButton = document.getElementById("continueButton");
const chatInput = document.getElementById("chatInput");
const revealButton = document.getElementById("revealButton");
const waitingButton = document.getElementById("waitingButton");
// Connection to content script
let contentConn;
// Current player of the tab
let currentPlayer;
// Socket connection to the server
let backgroundScript = chrome.runtime.connect({ name: "background" });

// pre-game, in-game, results
let gameStage = "pre-game";

// Chat in the panel
let chat = [];

let currentTab;

const scoreHiddenText = "HIDDEN";

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
        console.log("posting TO bg")
        backgroundScript.postMessage({cmd: 'init', payload: msg.payload})
        break;
      case "set_score":
        sendSocketMessage('set_score', {totalScore: msg.payload.totalScore});
        break;
      case "set_game_stage":
        updateGameStage(msg.payload);
        updateControlPanel();
        break;
      case "close":
        console.log("closed the socket connection");
        backgroundScript.postMessage({cmd: 'close'})
        break;
      case "hide_scores":
        updateGameStage("final-results");
        sendSocketMessage('set_score', {totalScore: "HIDDEN"});
        break;
    }
    console.log("received at panel", msg);
  });
  chrome.runtime.onConnect.removeListener(onConnectListener);
}
// Messages from chrome content/background scripts
chrome.runtime.onConnect.addListener(onConnectListener);

function checkMark() {
  return `<div class="checkmark">
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-check" viewBox="-3 1 16 16" font-weight="bold">
    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
  </svg></div>
  `;
}

// Building the HTML for player list
function buildPlayerList() {
  const htmlList = document.getElementById("playerList");
  htmlList.innerHTML = "";
  // Checks whether it's the final round (if someone has guessed and has HIDDEN in scores)
  let finals = false;
  for (const player of players) {
    if (player.score === scoreHiddenText) {
      finals = true;
      break;
    }
  }
  // If not last round - sort players, else don't
  const orderByPoints = !finals ? players.sort((a, b) => b.score - a.score) : players;

  let counter = 1;
  for (const player of orderByPoints) {
    let playerRow;
    if (finals) {
      playerRow = `
      <th scope="row"> </th>
      <td>${player.name}${player.guessed ? checkMark() : ''}</td>
      <td>${player.score}</td>
    `;
    } else {
      playerRow = `
      <th scope="row">${counter}</th>
      <td>${player.name}${player.guessed ? checkMark() : ''}</td>
      <td>${player.score}</td>
    `;
      if (player.leader && counter === 1 && player.score !== 0) {
        playerRow = `<tr class="leader-winner">${playerRow}</tr>`
      } else if (player.leader) {
        playerRow = `<tr class="leader">${playerRow}</tr>`
      } else if (counter === 1 && player.score !== 0) {
        playerRow = `<tr class="winner">${playerRow}</tr>`
      }
    }
    htmlList.innerHTML += playerRow;
    counter++;
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

// SOCKET IO THROUGH BG PROXY 
backgroundScript.onMessage.addListener((msg) => {
  console.log("MSG FROM BG IN PANEL:", msg)
  switch (msg.cmd) {
    case "update_room":
      console.log("updating room, payload:", msg.payload);
      players = Object.values(msg.payload.players);
      chat = [...msg.payload.chat];
      // Mostly for leader election
      const currentPlayerUpdated = players.find((player) => player.id === currentPlayer.id);
      updateCurrentPlayer(currentPlayerUpdated);
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
      updateGameStage("in-game");
      msgContent("continue_game");
      break;
    default:
      break;
  }
});

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
  sendSocketMessage('start_game');
  startContainer.style.display = "none";
  startButton.style.display = "none";
});

continueButton.addEventListener("click", async () => {
  sendSocketMessage('continue_game');
  startContainer.style.display = "none";
});

revealButton.addEventListener("click", async () => {
  sendSocketMessage('continue_game');
  startContainer.style.display = "none";
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
  updateControlPanel();
}

function updateGameStage(newStage) {
  gameStage = newStage;
  switch (gameStage) {
    case "ads":
      sendSocketMessage('ads_message');
      break;
  }
}

// Makes changes to the panel/game according to the stage
function updateControlPanel() {
  let btn;
  console.log("updating control panel, stage:", gameStage);
  switch (gameStage) {
    case "pre-game":
      btn = startButton;
      break;
    case "in-game":
      return;
    case "results":
      if (players.every((player) => player.guessed)) {
        waitingButton.style.display = "none";
        btn = continueButton;
      } else {
        continueButton.style.display = "none";
        btn = waitingButton;
      }
      break;
    case "final-results":
      if (players.every((player) => player.guessed)) {
        waitingButton.style.display = "none";
        btn = revealButton;
      } else {
        continueButton.style.display = "none";
        btn = waitingButton;
      }
      break;
  }
  if (!currentPlayer.leader) {
    startContainer.style.display = "none";
    if (btn) {
      btn.style.display = "none";
    }
  } else if (gameStage !== "ads") {
    startContainer.style.display = "flex";
    if (btn) {
      btn.style.display = "unset";
    }
  }
}

function sendChatMessage(message) {
  sendSocketMessage("chat_message", { message });
}

function sendSocketMessage(cmd, payload) {
  backgroundScript.postMessage({ cmd: 'to_socket', payload: { cmd, payload } });
}

//interstitial-message-continue-to-game