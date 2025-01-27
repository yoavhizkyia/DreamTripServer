import { Client } from 'pg';

export const client = new Client({
  user: 'postgres',
  host: 'localhost',
  password: '1234',
  port: 5433,
});
