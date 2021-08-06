const express = require('express');
const app = express();
const cors = require('cors')
app.use(cors())
const http = require('http');
const { S_IFREG } = require('constants');
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// room: {[roomId: string]: players}
const rooms = {};
/*
player = {
  id
  roomId
  name
  score
  leader
}
*/

app.get('/', (req, res) => {
  res.send('<h1>GeoGuessr Party Server Running</h1>');
});

io.on("connection", socket => {
  const id = io.engine.generateId();
  // not set yet, will be set on adding player
  let roomId;
  console.log("user connected");
  // handle the event sent with socket.send()
  socket.on("message", (data) => {
    console.log("received message:", data);
    const msg = JSON.parse(data);
    switch (msg.cmd) {
      case "start_game":
        console.log("received message to start game, starting...");
        io.to(roomId).emit("message", createMessage("start_game"));
        break;
      case "continue_game":
        console.log("received message to continue game, continuing...");
        io.to(roomId).emit("message", createMessage("continue_game"));
        break;
      case "set_score":
        console.log(`changing player ${msg.payload.id} score to ${msg.payload.totalScore}`);
        rooms[msg.payload.roomId][msg.payload.id].score = msg.payload.totalScore;
        sendUpdatePlayersMessage(msg.payload.roomId);
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
        }
        rooms[roomId][id] = {
          id,
          roomId,
          name: msg.payload.name,
          score: msg.payload.score,
          // Leader if room doesnt exist or it's empty
          leader: Object.keys(rooms[roomId]).length === 0
        }
        console.log("adding player:", rooms[roomId][id]);
        console.log("current players in room:", rooms[roomId]);
        socket.emit("message", createMessage("set_current_player", rooms[roomId][id]));
        sendUpdatePlayersMessage(roomId);
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
      delete rooms[roomId][id];
      if (Object.keys(rooms[roomId]).length > 0) {
        socket.to(roomId).emit("message", createMessage("update_players", Object.values(rooms[roomId])));
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

function sendUpdatePlayersMessage(roomId) {
  if (rooms && rooms[roomId]) {
    io.to(roomId).emit("message", createMessage("update_players", Object.values(rooms[roomId])));
  } else {
    console.warn("skipping updating players because room is undefined");
  }
}
