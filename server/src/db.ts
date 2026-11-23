import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file location (supports persistent disk mount in production e.g. /var/data)
const dbDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'salon.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_gu TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS barbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_on_duty INTEGER NOT NULL DEFAULT 1,
      is_on_break INTEGER NOT NULL DEFAULT 0,
      current_token TEXT DEFAULT NULL,
      current_started_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      service_ids TEXT NOT NULL,
      service_names_en TEXT NOT NULL,
      service_names_gu TEXT NOT NULL,
      total_duration INTEGER NOT NULL,
      total_price REAL NOT NULL,
      barber_preference TEXT NOT NULL DEFAULT 'Any',
      assigned_barber TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'Waiting',
      is_walk_in INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      called_at TEXT DEFAULT NULL,
      started_at TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      cancelled_at TEXT DEFAULT NULL,
      no_show_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS salon_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      salon_name_en TEXT NOT NULL DEFAULT 'Royal Crown Salon & Spa',
      salon_name_gu TEXT NOT NULL DEFAULT 'રોયલ ક્રાઉન સલૂન અને સ્પા',
      is_online_queue_open INTEGER NOT NULL DEFAULT 1,
      open_time TEXT NOT NULL DEFAULT '09:00',
      close_time TEXT NOT NULL DEFAULT '21:00',
      cutoff_minutes_before_close INTEGER NOT NULL DEFAULT 30
    );
  `);

  // Seed default settings if not exists
  const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM salon_settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO salon_settings (id, salon_name_en, salon_name_gu, is_online_queue_open, open_time, close_time, cutoff_minutes_before_close)
      VALUES (1, 'Royal Crown Salon & Spa', 'રોયલ ક્રાઉન સલૂન અને સ્પા', 1, '00:00', '23:59', 30)
    `).run();
  }

  // Seed default barbers if not exists
  const barberCount = (db.prepare('SELECT COUNT(*) as count FROM barbers').get() as { count: number }).count;
  if (barberCount === 0) {
    const insertBarber = db.prepare('INSERT INTO barbers (name, is_on_duty, is_on_break) VALUES (?, ?, ?)');
    insertBarber.run('Amit', 1, 0);
    insertBarber.run('Ravi', 1, 0);
    insertBarber.run('Kiran', 1, 0);
  }

  // Seed default services if not exists
  const serviceCount = (db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number }).count;
  if (serviceCount === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name_en, name_gu, duration, price, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertService.run('Classic Haircut', 'ક્લાસિક હેરકટ', 30, 250, 1);
    insertService.run('Beard Trim & Shape', 'દાઢી ટ્રીમ અને શેપ', 15, 150, 1);
    insertService.run('Hair Wash & Styling', 'હેર વૉશ અને સ્ટાઇલિંગ', 20, 200, 1);
    insertService.run('Royal Head Massage', 'રોયલ હેડ મસાજ', 25, 300, 1);
    insertService.run('Premium Facial Clean-up', 'પ્રીમિયમ ફેશિયલ ક્લીન-અપ', 45, 500, 1);
    insertService.run('Hair Color Touch-up', 'હેર કલર ટચ-અપ', 40, 450, 1);
  }
}

// Auto-initialize tables and seed data upon load
initDatabase();

