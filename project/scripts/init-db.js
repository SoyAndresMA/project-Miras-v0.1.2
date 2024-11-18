const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

async function initDb() {
  try {
    // Ensure the db directory exists
    const dbDir = path.join(process.cwd(), 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir);
    }

    const dbPath = path.join(process.cwd(), 'db/database.sqlite');
    
    // Delete existing database if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Read and execute schema.sql
    const schema = fs.readFileSync(path.join(process.cwd(), 'db/schema.sql'), 'utf8');
    await db.exec(schema);

    console.log('Database initialized successfully');
    await db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();