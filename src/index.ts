import express, { Router, json } from 'express';
import { client } from './config/db';

const app = express();
app.use(json());

const userRouter = Router();

const createUser = 'INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3)';

userRouter.get('/', async (req, res) => {
  try{
    await client.connect();
    const res1 = await client.query('SELECT * FROM users')
    console.log(res1.rows);
    res.sendStatus(200).json(res1.rows);
  }
  catch(err){
    console.error(err);
  }
  finally{
    client.end();
    res.sendStatus(500)
  }
});

userRouter.post('/signIn', async (req, res) => {
  const { userName, email, password } = req.body;
  
  try{
    await client.connect();
    // bycrypt password
    // login
  }
  catch(err){
    console.error(err);
  }
})

app.use('/users', userRouter);

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});