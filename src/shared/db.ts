import * as dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { Pool } from 'pg';

expand(dotenv.config());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

export const db = new Pool({
  connectionString: databaseUrl,
});