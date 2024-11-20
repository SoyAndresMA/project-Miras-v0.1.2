import { DatabaseService } from '@/lib/services/database.service';

export default async function getDb() {
  return await DatabaseService.getInstance().getConnection();
}
