import request from 'supertest';
import { compare } from 'bcrypt';
import { StatusCodes } from 'http-status-codes';

import app from '../../..';
import pool from '../../../config/db';

const STUB_USER = {
    username: 'testuser',
    email: 'test@test.com',
    password: '12345678'
}
const STUB_USER_WITH_HASHED_PASSWORD = 'mocked_hashed_password';
const STUB_UNOAUTHORIZED_PASSWORD = 'unauthorized_password';
const VALID_TOKEN = 'valid_token';
const NOT_VALID_TOKEN = 'not_valid_token';

jest.mock('../../../config/db', () => ({
    connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
    }),
}))

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('mocked_hashed_password'),
    compare: jest.fn().mockImplementation((password: string) => {
        if (password === STUB_USER.password) {
            return Promise.resolve(true);
        }
        else {
            return Promise.resolve(false);
        }
    }),
})
);

jest.mock('../../../jwt', () => ({
    generateToken: jest.fn().mockReturnValue('valid_token'),
    verifyToken: jest.fn().mockImplementation((token: string) => {
        if (token === VALID_TOKEN) {
            return { email: STUB_USER.email };
        }
        else {
            return null;
        }
    }),
}));

describe('Users Router', () => {
    let mockClient: any;

    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        };
        (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('POST /signup - should return 201, create a user', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ ...STUB_USER, password: STUB_USER_WITH_HASHED_PASSWORD }] });
        const response = await request(app)
            .post('/v1/users/signup')
            .send(STUB_USER);
        expect(response.status).toBe(StatusCodes.CREATED);
        expect(mockClient.query).toHaveBeenCalledTimes(2);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /signup - should return 409 if username already exists', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [STUB_USER] });
        const response = await request(app)
            .post('/v1/users/signup')
            .send(STUB_USER);
        expect(response.status).toBe(StatusCodes.CONFLICT);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /signup - should return 400 if missing params', async () => {
        const response = await request(app)
            .post('/v1/users/signup')
            .send({});
        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test('POST /signup - should return 400 if email is not valid', async () => {
        const response = await request(app)
            .post('/v1/users/signup')
            .send({ ...STUB_USER, email: 'invalid_email' });
        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test('POST /signup - should return 400 if password is not valid', async () => {
        const response = await request(app)
            .post('/v1/users/signup')
            .send({ ...STUB_USER, password: '123' });
        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test('POST /login - should return 200 if user exists', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [{ ...STUB_USER, password: STUB_USER_WITH_HASHED_PASSWORD }] });
        const response = await request(app)
            .post('/v1/users/login')
            .send({ email: STUB_USER.email, password: STUB_USER.password });
        expect(response.status).toBe(StatusCodes.OK);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /login - should return 404 if user not found', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] });
        const response = await request(app)
            .post('/v1/users/login')
            .send({ email: STUB_USER.email, password: STUB_USER.password });
        expect(response.status).toBe(StatusCodes.NOT_FOUND);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /login - should return 401 if password is not unauthorized', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [{ ...STUB_USER, password: STUB_USER_WITH_HASHED_PASSWORD }] });
        (compare as jest.Mock).mockResolvedValueOnce(false);
        const response = await request(app)
            .post('/v1/users/login')
            .send({ email: STUB_USER.email, password: STUB_UNOAUTHORIZED_PASSWORD });
        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /login - should return 400 if email is not valid', async () => {
        const response = await request(app)
            .post('/v1/users/login')
            .send({ ...STUB_USER, email: 'invalid_email' });
        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test('POST /login - should return 400 if password is not valid', async () => {
        const response = await request(app)
            .post('/v1/users/login')
            .send({ ...STUB_USER, password: '123' });
        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test('GET /auth - should return the user if the token is valid and the user found', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [{ ...STUB_USER, password: STUB_USER_WITH_HASHED_PASSWORD }] });
        const response = await request(app)
            .get('/v1/users/auth')
            .set('Cookie', [`accessToken=${VALID_TOKEN}`]);
        expect(response.body).toEqual({ email: STUB_USER.email });
        expect(response.status).toBe(StatusCodes.OK);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('GET /auth - should return 401 if there is no access token', async () => {
        const response = await request(app)
            .get('/v1/users/auth')
            .set('Cookie', [`accessToken=`]);
        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('GET /auth - should return 403 if the access token is invalid', async () => {
        const response = await request(app)
            .get('/v1/users/auth')
            .set('Cookie', [`accessToken=${NOT_VALID_TOKEN}`]);
        expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });

    test('GET /auth - should return 404 if access token is valid and the user not found', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] });
        const response = await request(app)
            .get('/v1/users/auth')
            .set('Cookie', [`accessToken=${VALID_TOKEN}`]);
        expect(response.status).toBe(StatusCodes.NOT_FOUND);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /refresh - should return 200 if the refresh token is valid', async () => {
        const response = await request(app)
            .post('/v1/users/refresh')
            .set('Cookie', [`refreshToken=${VALID_TOKEN}`]);
        expect(response.status).toBe(StatusCodes.OK);
    });

    test('POST /refresh - should return 401 if there is no refresh token', async () => {
        const response = await request(app)
            .post('/v1/users/refresh')
            .set('Cookie', [`refreshToken=`]);
        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('POST /refresh - should return 403 if the refresh token is invalid', async () => {
        const response = await request(app)
            .post('/v1/users/refresh')
            .set('Cookie', [`refreshToken=${NOT_VALID_TOKEN}`]);
        expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });
});