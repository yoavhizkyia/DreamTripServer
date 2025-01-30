import request from 'supertest';
import { StatusCodes } from 'http-status-codes';

import app from '../../..';
import pool from '../../../config/db';

const STUB_USER = {
    username: 'testuser',
    email: 'test@test.com',
    password: '12345678'
}

const STUB_USER_WITH_HASHED_PASSWORD = 'mocked_hashed_password';

jest.mock('../../../config/db', () => ({
    connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
    }),
}))

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('mocked_hashed_password'),
    compare: jest.fn().mockResolvedValue(true),
  })
);

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
            .mockResolvedValueOnce({ rows: [{...STUB_USER, password: STUB_USER_WITH_HASHED_PASSWORD}] });
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
            .send({...STUB_USER, email: 'invalid_email'});
        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test('POST /signup - should return 400 if password is not valid', async () => {
        const response = await request(app)
            .post('/v1/users/signup')
            .send({...STUB_USER, password: '123'});
        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test('POST /login - should return 200 if user exists', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [{...STUB_USER, password: STUB_USER_WITH_HASHED_PASSWORD}] });
        const response = await request(app)
            .post('/v1/users/login')
            .send({ email: STUB_USER.email, password: STUB_USER.password });
        expect(response.status).toBe(StatusCodes.OK);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });
});