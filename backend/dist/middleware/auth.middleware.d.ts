import { Request, Response, NextFunction } from 'express';
export interface DecodedToken {
    id: string;
    email: string;
    role: string;
}
export declare const verifyJWT: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
