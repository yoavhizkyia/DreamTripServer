import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const generateToken = (email: string, expiresIn: any): string => {
    return jwt.sign({ email }, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
};