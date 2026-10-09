
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from pathlib import Path

app = FastAPI(title="ChessMind API")

# Allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store the database alongside this file
DB_PATH = Path(__file__).resolve().parent / "chessmind.db"


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                result TEXT,
                moves TEXT NOT NULL
            )
        """)


class GameRecord(BaseModel):
    date: str
    result: str
    moves: str


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def home():
    return {"message": "ChessMind backend is running!"}


@app.get("/games")
def get_games():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM games ORDER BY id DESC"
        ).fetchall()
        return {"games": [dict(row) for row in rows]}


@app.post("/games")
def save_game(game: GameRecord):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "INSERT INTO games (date, result, moves) VALUES (?, ?, ?)",
            (game.date, game.result, game.moves),
        )
        game_id = cursor.lastrowid

    return {"message": "Game saved successfully!", "id": game_id}
