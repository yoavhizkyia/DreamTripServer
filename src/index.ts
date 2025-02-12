import 'dotenv/config'
import cors from 'cors';
import express, { json } from 'express';
import cookieParser from 'cookie-parser';

import v1Router from './routers/v1';

const allowedOrigins = ['http://localhost:3000']

const app = express();
app.use(json());
app.use(cookieParser());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use('/health', (req, res) => {
  res.send('Ok')
})

app.use('/v1', v1Router);

app.listen(process.env.PORT, () => {
  console.log('Server is running on port 8080');
});

export default app;