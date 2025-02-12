import 'dotenv/config'
import { Pool } from 'pg';

const poolOptionsConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
}

const pool = new Pool({
  ...poolOptionsConfig
});

const productionPool = new Pool({
  ...poolOptionsConfig,
  ssl: {
    rejectUnauthorized: false
  }
});

export default process.env.DB_HOST !== 'localhost' ? productionPool : pool;
