
import { useEffect, useState } from "react";
import { Chess, type Square } from "chess.js";
import "./App.css";

const PIECES: Record<string, string> = {
  wp: "♙",
  wr: "♖",
  wn: "♘",
  wb: "♗",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  br: "♜",
  bn: "♞",
  bb: "♝",
  bq: "♛",
  bk: "♚",
};

type SavedGame = [number, string, string, string];

function App() {
  const [backendMessage, setBackendMessage] = useState(
    "Connecting to ChessMind..."
  );
  const [game, setGame] = useState(new Chess());
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // Connect to FastAPI and load saved games.
  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((response) => {
        if (!response.ok) throw new Error("Backend unavailable");
        return response.json();
      })
      .then((data) => setBackendMessage(data.message))
      .catch(() => setBackendMessage("Backend connection failed"));

    void loadSavedGames();
  }, []);

  const loadSavedGames = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/games");

      if (!response.ok) {
        throw new Error("Failed to load games");
      }

      const data = await response.json();
      setSavedGames(data.games);
    } catch (error) {
      console.error("Could not load saved games:", error);
    }
  };

  const board = game.board();

  const legalMoves = selectedSquare
    ? game.moves({ square: selectedSquare, verbose: true })
    : [];

  const legalTargets = legalMoves.map((move) => move.to);

  const handleSquareClick = (square: Square) => {
    if (selectedSquare) {
      
      try {
        const newGame = new Chess();

        // Replay previous moves to preserve the complete game history.
        for (const previousMove of game.history()) {
          newGame.move(previousMove);
        }

        const move = newGame.move({
          from: selectedSquare,
          to: square,
          promotion: "q",
        });


        setGame(newGame);
        console.log("Moves after this move:", newGame.history());
        setLastMove({ from: move.from, to: move.to });
        setSelectedSquare(null);
        return;
      } catch {
        // Invalid move; allow selecting another friendly piece.
      }

      const piece = game.get(square);

      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }

      return;
    }

    const piece = game.get(square);

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
    }
  };

  const saveGame = async () => {
    try {
      console.log("All moves being saved:", game.history());
      
      const response = await fetch("http://127.0.0.1:8000/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          result: game.isCheckmate()
            ? `${game.turn() === "w" ? "Black" : "White"} wins`
            : game.isDraw()
            ? "Draw"
            : "In progress",
          moves: game.history().join(" "),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save game");
      }

      const data = await response.json();
      await loadSavedGames();
      alert(`Game saved successfully! ID: ${data.id}`);
    } catch (error) {
      console.error("Could not save game:", error);
      alert("Could not save game. Check that the backend is running.");
    }
  };

  const resetGame = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLastMove(null);
  };

  const isCheck = game.inCheck();
  const isGameOver = game.isGameOver();

  // Ignore placeholder rows accidentally created during API testing.
  const validSavedGames = savedGames.filter(
    ([, date, result, moves]) =>
      date !== "string" &&
      result !== "string" &&
      moves !== "string"
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="logo">♟ ChessMind</div>
          <div className="subtitle">Offline AI Chess Coach</div>
        </div>

        <button className="new-game-button" onClick={resetGame}>
          New Game
        </button>
      </header>

      <main className="main-content">
        <section className="game-area">
          <div className="player-label">
            <span>Black</span>
            <span className="turn-indicator">
              {game.turn() === "b" && !isGameOver ? "● Your turn" : ""}
            </span>
          </div>

          <div className="board-wrapper">
            <div className="board">
              {board.map((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const file = String.fromCharCode(97 + colIndex);
                  const rank = 8 - rowIndex;
                  const square = `${file}${rank}` as Square;

                  const isDark = (rowIndex + colIndex) % 2 === 1;
                  const isSelected = selectedSquare === square;
                  const isLegalTarget = legalTargets.includes(square);
                  const isLastMove =
                    lastMove?.from === square || lastMove?.to === square;

                  const isKingInCheck =
                    piece?.type === "k" &&
                    piece.color === game.turn() &&
                    isCheck;

                  return (
                    <button
                      key={square}
                      className={[
                        "square",
                        isDark ? "dark" : "light",
                        isSelected ? "selected" : "",
                        isLastMove ? "last-move" : "",
                        isKingInCheck ? "in-check" : "",
                      ].join(" ")}
                      onClick={() => handleSquareClick(square)}
                    >
                      {colIndex === 0 && (
                        <span
                          className={`rank-label ${
                            isDark ? "dark-label" : "light-label"
                          }`}
                        >
                          {rank}
                        </span>
                      )}

                      {rowIndex === 7 && (
                        <span
                          className={`file-label ${
                            isDark ? "dark-label" : "light-label"
                          }`}
                        >
                          {file}
                        </span>
                      )}

                      {piece && (
                        <span
                          className={`piece ${
                            piece.color === "w"
                              ? "white-piece"
                              : "black-piece"
                          }`}
                        >
                          {PIECES[`${piece.color}${piece.type}`]}
                        </span>
                      )}

                      {isLegalTarget && (
                        <span
                          className={
                            piece ? "capture-indicator" : "move-indicator"
                          }
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="player-label bottom-player">
            <span>White</span>
            <span className="turn-indicator">
              {game.turn() === "w" && !isGameOver ? "● Your turn" : ""}
            </span>
          </div>
        </section>

        <aside className="side-panel">
          <div className="panel">
            <h2>Game</h2>
            <p>{backendMessage}</p>

            <div className="status">
              {game.isCheckmate()
                ? `Checkmate — ${
                    game.turn() === "w" ? "Black" : "White"
                  } wins`
                : game.isDraw()
                ? "Draw"
                : isCheck
                ? "Check!"
                : `${game.turn() === "w" ? "White" : "Black"} to move`}
            </div>

            <div className="move-history">
              <h3>Current Game Moves</h3>

              {game.history().length === 0 ? (
                <p className="empty-history">No moves yet</p>
              ) : (
                <div className="moves">
                  {Array.from(
                    { length: Math.ceil(game.history().length / 2) },
                    (_, index) => (
                      <div className="move-row" key={index}>
                        <span>{index + 1}.</span>
                        <span>{game.history()[index * 2]}</span>
                        <span>{game.history()[index * 2 + 1] || "—"}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <button className="reset-button" onClick={resetGame}>
              Restart Game
            </button>

            <button className="reset-button" onClick={saveGame}>
              Save Game
            </button>
          </div>

          <div className="panel game-history-panel">
            <h2>Game History</h2>
            <p>Click a game to see its recorded moves.</p>

            <button className="reset-button" onClick={loadSavedGames}>
              Refresh History
            </button>

            {validSavedGames.length === 0 ? (
              <p>No saved games yet.</p>
            ) : (
              <div className="saved-games-list">
                {validSavedGames
                  .slice()
                  .reverse()
                  .map(([id, date, result, moves]) => {
                    const moveList = moves.trim()
                      ? moves.trim().split(/\s+/)
                      : [];

                    return (
                      <details className="saved-game" key={id}>
                        <summary>
                          <strong>Game #{id}</strong>
                          <span>{date}</span>
                          <span>{result}</span>
                        </summary>

                        <div className="saved-moves">
                          {moveList.length === 0 ? (
                            <p>No moves recorded.</p>
                          ) : (
                            <div className="moves">
                              {Array.from(
                                { length: Math.ceil(moveList.length / 2) },
                                (_, index) => (
                                  <div className="move-row" key={index}>
                                    <span>{index + 1}.</span>
                                    <span>{moveList[index * 2]}</span>
                                    <span>{moveList[index * 2 + 1] || "—"}</span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="panel coming-soon">
            <h2>AI Coach</h2>
            <p>
              Stockfish analysis and personalized ML coaching will appear here
              later.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
