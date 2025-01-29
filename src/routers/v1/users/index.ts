import { Router } from "express";
import { compare, hash } from "bcrypt";

import pool from "../../../config/db";

export const userRouter = Router();

const createUser = 'INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3)';
const getUser = 'SELECT * FROM users WHERE user_name = $1';

userRouter.get('/', async (req, res) => {
    const client = await pool.connect();

    try {
        const res1 = await client.query('SELECT * FROM users')
        res.json(res1.rows);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500)
    }
    finally {
        await client.release();
    }
});

userRouter.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    
    const client = await pool.connect();
    try {
        const username = req.body.username.trim();
        const res1 = await client.query(getUser, [username]);
        if (res1.rows[0]) {
            res.sendStatus(409);
            return
        }
        const hashedPassword = await hash(password, 10);
        await client.query(createUser, [username, email, hashedPassword]);
        res.sendStatus(201);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
    finally {
        await client.release();
    }
})

userRouter.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const client = await pool.connect();
    try {
        const user = (await client.query(getUser, [username])).rows[0];

        if (!user) {
            res.sendStatus(404);
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
            res.sendStatus(401);
        }
        else {
            res.sendStatus(200);
        }
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500)
    }
    finally {
        await client.release();
    }
})