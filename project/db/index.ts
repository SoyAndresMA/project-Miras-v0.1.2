import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

let db: any = null;

async function getDb() {
  if (db) return db;

  db = await open({
    filename: path.join(process.cwd(), 'db/database.sqlite'),
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  return db;
}

export default getDb;