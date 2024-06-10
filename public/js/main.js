const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const messageElement = document.querySelector(".message");
const notationElement = document.querySelector(".notation");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                        console.log("Drag started: ", sourceSquare);
                    }
                });

                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                    console.log("Drag ended");
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", function (e) {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", function (e) {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };

                    console.log("Drop event: ", targetSquare);
                    handleMove(sourceSquare, targetSquare);
                    draggedPiece = null;
                    sourceSquare = null;
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q', // Promoting to a queen by default
    };

    console.log("Move attempt: ", move);
    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    const unicodePiece = {
        p: "♙",
        r: "♖",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♟",
        R: "♜",
        N: "♞",
        B: "♝",
        Q: "♛",
        K: "♚",
    };

    return unicodePiece[piece.type] || "";
};

socket.on("playerrole", function (role) {
    playerRole = role;
    renderBoard();
    console.log("Player role: ", playerRole);
});

socket.on("spectatorrole", function () {
    playerRole = null;
    renderBoard();
    console.log("Spectator role");
});

socket.on("boardstate", function (fen) {
    chess.load(fen);
    renderBoard();
    console.log("Board state updated: ", fen);
});

socket.on("move", function (move) {
    chess.move(move);
    renderBoard();
    console.log("Move received: ", move);
});

socket.on("message", function (message) {
    messageElement.innerText = message;
    console.log("Message: ", message);
});

socket.on("notation", function (notation) {
    notationElement.innerText = notation.split(" ").join("\n");
    console.log("Notation: ", notation);
});

renderBoard();
