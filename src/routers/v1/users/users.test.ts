import request from 'supertest';

import app from '../../..';
import pool from '../../../config/db';

const STUB_USER = {
    username: 'testuser',
    email: 'aa',
    password: '1234'
}

const STUB_USER_WITH_HASHED_PASSWORD = 'mocked_hashed_password';

jest.mock('../../config/db', () => ({
    connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
    }),
}))

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('mocked_hashed_password'),
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
            .post('/users/signup')
            .send(STUB_USER);
        expect(response.status).toBe(201);
        expect(mockClient.query).toHaveBeenCalledTimes(2);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /signup - should return 409 if username already exists', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [STUB_USER] });
        const response = await request(app)
            .post('/users/signup')
            .send(STUB_USER);
        expect(response.status).toBe(409);
        expect(mockClient.query).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('POST /signup - should return 500 if missing params', async () => {
        const response = await request(app)
            .post('/users/signup')
            .send({});
        expect(response.status).toBe(500);
    });
});