const Database = require('better-sqlite3');
const db = new Database('data/storm.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, name TEXT NOT NULL,
 description TEXT DEFAULT '', price_cents INTEGER NOT NULL, stock INTEGER DEFAULT -1,
 active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, product_id INTEGER NOT NULL,
 quantity INTEGER NOT NULL, total_cents INTEGER NOT NULL, payment_method TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO', mp_payment_id TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP, delivered_at TEXT,
 FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS tickets (
 id INTEGER PRIMARY KEY AUTOINCREMENT, channel_id TEXT NOT NULL, user_id TEXT NOT NULL,
 order_id INTEGER, status TEXT DEFAULT 'ABERTO', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
module.exports = db;