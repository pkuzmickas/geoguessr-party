const host = 'ec2-35-179-97-149.eu-west-2.compute.amazonaws.com';
let socket;

try {
  importScripts('/scripts/socket.io.js');
} catch (e) {
  console.error(e);
}

// initTabAndPort();

// async function initTabAndPort() {
//   const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   tab = activeTab;
//   port = chrome.tabs.connect(tab.id, { name: "panel" });
//   port.postMessage({ cmd: "init" });
// }

chrome.runtime.onConnect.addListener(function (port) {
  console.log("HELLO from BG, port:", port)
  if (port.name !== 'background') return;
  console.log("listening");
  port.onMessage.addListener((msg) => {
    switch (msg.cmd) {
      case "init":
        console.log("HELLO INIT FROM BG")
        initSockets(port, msg.payload.name, msg.payload.score, msg.payload.roomId);
        break;
      case 'to_socket':
        console.log("HELLO TO_SOCKET FROM BG")
        socket.send(createSocketMessage(msg.payload.cmd, msg.payload.payload));
        break;
      case 'close':
        socket.close();
        break;
    }
  });
});


// Messages from backend sockets
// Parameters: name - new player name, score - new player score
function initSockets(portToForwardTo, name, score, roomId) {
  socket = io(`ws://${host}:3000`, {jsonp: false});
  socket.send(createSocketMessage("add_player", { name, score, roomId }))
  socket.on("message", data => {
    const msg = JSON.parse(data);
    console.log("received from socket:", msg);
    portToForwardTo.postMessage(msg);
  });
}

function createSocketMessage(cmd, payload) {
  const msg = JSON.stringify({ cmd, payload });
  console.log('sending to socket:', msg)
  return msg;
}

chrome.tabs.onUpdated.addListener(
  function (tabId, changeInfo, tab) {
    // read changeInfo data and do something with it
    // like send the new url to contentscripts.js
    if (changeInfo.url) {
      chrome.tabs.sendMessage(tabId, {
        message: 'url_change',
        url: changeInfo.url
      })
    }
  }
);