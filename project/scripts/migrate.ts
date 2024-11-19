import { Database } from 'sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import Logger from '../lib/utils/logger';

const logger = new Logger('Migration');

async function runMigration(db: Database, file: string): Promise<void> {
  const sql = readFileSync(file, 'utf8');
  
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        logger.error(`Error running migration ${file}:`, err);
        reject(err);
        return;
      }
      
      logger.info(`Successfully ran migration ${file}`);
      resolve();
    });
  });
}

async function main() {
  const db = new Database(join(__dirname, '../db/database.sqlite'));
  
  try {
    logger.info('Starting database migration...');
    
    // Ejecutar migración
    await runMigration(
      db,
      join(__dirname, '../db/migrations/001_refactor_items.sql')
    );
    
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
