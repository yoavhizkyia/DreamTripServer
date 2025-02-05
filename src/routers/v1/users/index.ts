import 'dotenv/config'
import { Router } from 'express';
import { compare, hash } from 'bcrypt';
import { JwtPayload } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';

import pool from '../../../config/db';
import { authMiddleware, validateData } from '../../../middleware';
import { userLoginSchema, userRegistrationSchema } from './userScemas';
import { generateToken, verifyToken } from '../../../jwt';

const userRouter = Router();

const createUser = 'INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3)';
const getUserByEmail = 'SELECT * FROM users WHERE email = $1';
const getUserById = 'SELECT * FROM users WHERE id = $1';

const cookieOptions: { httpOnly: boolean; secure: boolean; sameSite: boolean | 'strict' } = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
}

const ACCESS_TOKEN_EXPIRED = '1h';
const REFRESH_TOKEN_EXPIRED = '7d';

const ONE_HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * 60 * 60 * 1000;

userRouter.get('/', async (req, res) => {
    const client = await pool.connect();

    try {
        const res1 = await client.query('SELECT * FROM users')
        res.json(res1.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500)
    }
    finally {
        await client.release();
    }
});

userRouter.post('/signup', validateData(userRegistrationSchema), async (req: Request, res: Response) => {
    const { email, password, username } = req.body;

    console.log('Registering user');

    const client = await pool.connect();
    try {
        const user = await client.query(getUserByEmail, [email]);
        if (user.rows[0]) {
            res.status(StatusCodes.CONFLICT).json({ message: 'User already exists' });
            return
        }
        const hashedPassword = await hash(password, 10);
        await client.query(createUser, [username, email, hashedPassword]);
        res.status(StatusCodes.CREATED).json({ message: 'User created' });
    }
    catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
    }
    finally {
        await client.release();
    }
})

userRouter.post('/login', validateData(userLoginSchema), async (req: Request, res: Response) => {
    const { email, password } = req.body;

    console.log('Starting login process');
    
    const client = await pool.connect();
    try {
        const user = (await client.query(getUserByEmail, [email])).rows[0];

        if (!user) {
            res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
            return;
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
            res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid password' });
        }
        else {
            console.log('generating tokens');
            const accessToken = generateToken(user.email, ACCESS_TOKEN_EXPIRED);
            const refreshToken = generateToken(user.email, REFRESH_TOKEN_EXPIRED);

            res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: ONE_HOUR });
            res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: WEEK });

            console.log('Logged in');
            res.status(StatusCodes.OK).json({ message: 'Logged in' });
        }
    }
    catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
    }
    finally {
        await client.release();
    }
})

userRouter.get('/auth', authMiddleware, async (req: any, res: any) => {
    console.log('Starting auth process');
    
    const client = await pool.connect();
    try {
        const user = (await client.query(getUserByEmail, [req.email])).rows[0];
        if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
        console.log('User found');
        
        res.json({ id: user.id, email: user.email });
    }
    catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
    }
    finally {
        await client.release();
    }
});

userRouter.post('/refresh', (req: any, res: any) => {
    console.log('Refreshing token');
    
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'No refresh token' });

    const decoded = verifyToken(refreshToken) as JwtPayload;
    if (!decoded) return res.status(StatusCodes.FORBIDDEN).json({ message: 'Invalid refresh token' });

    const newAccessToken = generateToken(decoded.userId, ACCESS_TOKEN_EXPIRED);

    res.cookie('accessToken', newAccessToken, {
        ...cookieOptions,
        maxAge: ONE_HOUR
    });

    res.json({ message: 'Token refreshed' });
});

userRouter.post('/logout', async (req, res) => {
    console.log('Logging out');
    
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(StatusCodes.OK).json({ message: 'Logged out' });
})

export default userRouter;