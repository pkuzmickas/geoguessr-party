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

const players = {};

app.get('/', (req, res) => {
  res.send('<h1>GeoGuessr Party Server Running</h1>');
});

io.on("connection", socket => {
  const id = io.engine.generateId();
  console.log("user connected");
  // handle the event sent with socket.send()
  socket.on("message", (data) => {
    console.log("received message:", data);
    const msg = JSON.parse(data);
    switch (msg.cmd) {
      case "add_player":
        players[id] = {
          id,
          name: msg.payload.name,
          score: msg.payload.score,
          leader: Object.keys(players).length === 0
        }
        console.log("adding player:", players[id]);
        console.log("current players:", players);
        socket.emit("message", createMessage("set_current_player", players[id]));
        io.emit("message", createMessage("update_players", Object.values(players)));
        break;
      default:
        console.log("unrecognized command!");
        break;
    }
    // socket.send("message from server");
  });

  socket.on("disconnect", (reason) => {
    console.log("player disconnected, reason:", reason);
    if (players[id]) {
      delete players[id];
    }
    socket.broadcast.emit("message", createMessage("update_players", Object.values(players)));
  });

});

function createMessage(cmd, payload) {
  return JSON.stringify({ cmd, payload });
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});

