import { z, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

import { verifyToken } from '../jwt';

export const validateData = (schema: z.ZodObject<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
      const errorMessages = error.errors.map((issue: any) => ({
            message: `${issue.path.join('.')} is ${issue.message}`,
        }))
        res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid data', details: errorMessages });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
      }
    }
  };
}

export const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });

  const decoded = verifyToken(token) as JwtPayload;
  if (!decoded) return res.status(StatusCodes.FORBIDDEN).json({ message: "Invalid token" });

  req.email = decoded.email;
  next();
};