import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// GET all cards in collection
app.get("/api/collection", (req, res) => {
  const cards = db.prepare("SELECT * FROM collection ORDER BY name").all();
  res.json(cards);
});

// POST add or increment a card
app.post("/api/collection", (req, res) => {
  const { id, name, set_name, rarity, image } = req.body;
  if (!id || !name) return res.status(400).json({ error: "id and name required" });

  const existing = db.prepare("SELECT * FROM collection WHERE id = ?").get(id);
  if (existing) {
    db.prepare("UPDATE collection SET qty = qty + 1 WHERE id = ?").run(id);
  } else {
    db.prepare(
      "INSERT INTO collection (id, name, set_name, rarity, image, qty) VALUES (?, ?, ?, ?, ?, 1)"
    ).run(id, name, set_name, rarity, image);
  }
  const card = db.prepare("SELECT * FROM collection WHERE id = ?").get(id);
  res.json(card);
});

// PATCH update quantity
app.patch("/api/collection/:id", (req, res) => {
  const { id } = req.params;
  const { qty } = req.body;
  if (qty <= 0) {
    db.prepare("DELETE FROM collection WHERE id = ?").run(id);
    return res.json({ deleted: true });
  }
  db.prepare("UPDATE collection SET qty = ? WHERE id = ?").run(qty, id);
  const card = db.prepare("SELECT * FROM collection WHERE id = ?").get(id);
  res.json(card);
});

// DELETE remove a card
app.delete("/api/collection/:id", (req, res) => {
  db.prepare("DELETE FROM collection WHERE id = ?").run(req.params.id);
  res.json({ deleted: true });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`MTG server running on http://localhost:${PORT}`));