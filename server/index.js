const express = require('express');
const app = express();
const cors = require('cors')
app.use(cors())
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// rooms: {[roomId: string]: {players:{}, chat: {}, started: boolean}
const rooms = {};
/*
player = {
  id
  roomId
  name
  score
  leader
  guessed
}
chat = {
  author,
  message,
  isSystem // whether the message is from the system
}
*/

app.get('/', (req, res) => {
  res.send('<h1>GeoGuessr Party Server Running</h1>');
});

// GET with param room=roomid
app.get('/isingame', (req, res) => {
  let roomId = req.query.room;
  res.send(rooms[roomId] ? rooms[roomId].started : false);
});

io.on("connection", socket => {
  // user Id in the game
  const id = io.engine.generateId();
  // not set yet, will be set on adding player
  let roomId;
  let currentPlayer;

  console.log("user connected");
  // handle the event sent with socket.send()
  socket.on("message", (data) => {
    console.log("received message:", data);
    const msg = JSON.parse(data);
    switch (msg.cmd) {
      case "start_game":
        console.log("received message to start game, starting...");
        rooms[roomId].started = true;
        io.to(roomId).emit("message", createMessage("start_game"));
        break;
      case "continue_game":
        console.log("received message to continue game, continuing...");
        io.to(roomId).emit("message", createMessage("continue_game"));
        for (const player of Object.values(rooms[roomId].players)) {
          player.guessed = false;
        }
        sendUpdateRoomMessage(roomId);
        break;
      case "set_score":
        console.log(`changing player ${currentPlayer.name} score to ${msg.payload.totalScore}`);
        if (msg.payload.totalScore) {
          rooms[roomId].players[id].score = msg.payload.totalScore;
        }
        rooms[roomId].players[id].guessed = true;
        rooms[roomId].chat.push({
          author: "system",
          message: currentPlayer.name + " made a guess!"
        });
        sendUpdateRoomMessage(roomId);
        break;
      case "chat_message":
        console.log("message received in chat:" + msg.payload.message);
        const chatMessage = {
          author: currentPlayer.name,
          message: msg.payload.message
        }
        rooms[roomId].chat.push(chatMessage);
        sendUpdateRoomMessage(roomId);
        break;
      case "ads_message":
        rooms[roomId].chat.push({
          author: "system",
          message: currentPlayer.name + " is watching ads!"
        });
        sendUpdateRoomMessage(roomId);
        break;
      case "add_player":
        if (!msg.payload.roomId) {
          console.error("roomId not specified when joining the room by:", msg.payload.name);
          console.warn("skipping adding this player");
          socket.disconnect();
          return;
        }
        roomId = msg.payload.roomId;
        socket.join(roomId);
        if (!rooms[roomId]) {
          rooms[roomId] = {};
          rooms[roomId].players = {};
          rooms[roomId].chat = [];
        }
        rooms[roomId].players[id] = {
          id,
          roomId,
          name: msg.payload.name,
          score: msg.payload.score,
          // Leader if room doesnt exist or it's empty
          leader: Object.keys(rooms[roomId].players).length === 0
        }
        currentPlayer = rooms[roomId].players[id];
        rooms[roomId].chat.push({
          author: "system",
          message: msg.payload.name + " joined the game."
        });
        console.log("adding player:", rooms[roomId].players[id]);
        console.log("current state of room:", rooms[roomId]);
        socket.emit("message", createMessage("set_current_player", currentPlayer));
        sendUpdateRoomMessage(roomId);
        break;
      default:
        console.log("unrecognized command!");
        break;
    }
    // socket.send("message from server");
  });

  socket.on("disconnect", (reason) => {
    console.log("player disconnected, reason:", reason);
    if (roomId) {
      const leaveMessage = `${currentPlayer.name} has left the game.`
      const wasLeader = currentPlayer.leader;
      delete rooms[roomId].players[id];
      if (Object.keys(rooms[roomId].players).length > 0) {
        rooms[roomId].chat.push({
          author: "system",
          message: leaveMessage
        });
        if (wasLeader) {
          // Picking new leader
          const newLeader = Object.values(rooms[roomId].players)[0];
          newLeader.leader = true;
          rooms[roomId].chat.push({
            author: "system",
            message: `assigned new leader: ${newLeader.name}`
          });
        }
        socket.to(roomId).emit("message", createMessage("update_room", rooms[roomId]));
      } else {
        delete rooms[roomId];
      }
    }
  });

});

function createMessage(cmd, payload) {
  return JSON.stringify({ cmd, payload });
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});

function sendUpdateRoomMessage(roomId) {
  if (rooms && rooms[roomId]) {
    io.to(roomId).emit("message", createMessage("update_room", rooms[roomId]));
  } else {
    console.warn("skipping updating players because room is undefined");
  }
}
