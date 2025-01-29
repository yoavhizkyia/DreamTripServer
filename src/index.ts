import express, { json } from 'express';
import v1Router from './routers/v1';

const app = express();
app.use(json());

app.use('/v1', v1Router);

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});

export default app;