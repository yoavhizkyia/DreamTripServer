import { Router } from "express";
import { compare, hash } from "bcrypt";
import { StatusCodes } from 'http-status-codes';

import pool from "../../../config/db";
import { validateData } from "../../../middleware";
import { userLoginSchema, userRegistrationSchema } from "./userScemas";

export const userRouter = Router();

const createUser = 'INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3)';
const getUserByEmail = 'SELECT * FROM users WHERE email = $1';

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

userRouter.post('/signup', validateData(userRegistrationSchema), async (req, res) => {
    const { email, password, username } = req.body;
    
    const client = await pool.connect();
    try {
        const user = await client.query(getUserByEmail, [email]);
        if (user.rows[0]) {
            res.sendStatus(StatusCodes.CONFLICT);
            return
        }
        const hashedPassword = await hash(password, 10);
        await client.query(createUser, [username, email, hashedPassword]);
        res.sendStatus(StatusCodes.CREATED);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }
    finally {
        await client.release();
    }
})

userRouter.post('/login', validateData(userLoginSchema), async (req, res) => {
    const { email, password } = req.body;

    const client = await pool.connect();
    try {
        const user = (await client.query(getUserByEmail, [email])).rows[0];

        if (!user) {
            res.sendStatus(StatusCodes.NOT_FOUND);
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
            res.sendStatus(StatusCodes.UNAUTHORIZED);
        }
        else {
            res.sendStatus(StatusCodes.OK);
        }
    }
    catch (err) {
        console.error(err);
        res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }
    finally {
        await client.release();
    }
})