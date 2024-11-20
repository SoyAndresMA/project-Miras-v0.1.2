import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
    if (db) {
        return db;
    }

    const dbPath = path.join(process.cwd(), 'data', 'bolt.db');
    
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Habilitar foreign keys
    await db.run('PRAGMA foreign_keys = ON');

    return db;
}

export async function query<T>(sql: string, params: any[] = []): Promise<T> {
    const db = await getDb();
    return db.all(sql, params);
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
    const db = await getDb();
    await db.run(sql, params);
}

// Asegurar que cerramos la conexión al salir
process.on('exit', () => {
    if (db) {
        db.close();
    }
});
