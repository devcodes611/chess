const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const app = express();

const server = http.createServer(app);
const io = socketio(server);

const chess = new Chess();
let num = 0;
let players = {};

app.set('view engine', "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

io.on("connection", function (unisocket) {
    num++;
    console.log(`connected ${num}`);

    if (!players.white) {
        players.white = unisocket.id;
        unisocket.emit("playerrole", "w");
        console.log(`White player assigned: ${unisocket.id}`);
        io.emit("message", "White's turn");
    } else if (!players.black) {
        players.black = unisocket.id;
        unisocket.emit("playerrole", "b");
        console.log(`Black player assigned: ${unisocket.id}`);
    } else {
        unisocket.emit("spectatorrole");
        console.log(`Spectator assigned: ${unisocket.id}`);
    }

    unisocket.on("disconnect", function () {
        num--;
        console.log(`disconnected, now online ${num}`);
        if (unisocket.id === players.white) {
            delete players.white;
            console.log(`White player disconnected: ${unisocket.id}`);
        } else if (unisocket.id === players.black) {
            delete players.black;
            console.log(`Black player disconnected: ${unisocket.id}`);
        }
    });

    unisocket.on("move", (move) => {
        try {
            console.log(`Move received: ${JSON.stringify(move)}`);
            if (chess.turn() === "w" && unisocket.id !== players.white) {
                console.log("Move rejected: Not white's turn");
                return;
            }
            if (chess.turn() === "b" && unisocket.id !== players.black) {
                console.log("Move rejected: Not black's turn");
                return;
            }

            const result = chess.move(move);
            if (result) {
                console.log("Move accepted: ", move);
                io.emit("move", move);
                io.emit("boardstate", chess.fen());
                io.emit("notation", chess.history({ verbose: true }).map(m => `${m.from}${m.to}`).join(" "));
                
                if (chess.in_checkmate()) {
                    io.emit("message", `Checkmate, ${chess.turn() === 'w' ? 'Black' : 'White'} wins`);
                } else if (chess.in_check()) {
                    io.emit("message", "Check");
                } else {
                    io.emit("message", `${chess.turn() === 'w' ? 'White' : 'Black'}'s turn`);
                }
            } else {
                console.log("Invalid move: ", move);
                unisocket.emit("invalidMove", move);
            }
        } catch (error) {
            console.log("Error processing move: ", error);
            unisocket.emit("failed", move);
        }
    });
});

server.listen(3000, function () {
    console.log("server running on 3000");
});
