import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "collection.db"));

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS collection (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    set_name TEXT,
    rarity TEXT,
    image TEXT,
    qty INTEGER NOT NULL DEFAULT 1
  )
`);

export default db;