import { Pool } from 'pg';

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  password: '1234',
  port: 5433,
});

export default pool;
