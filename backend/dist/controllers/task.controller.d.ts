import { Request, Response } from 'express';
export declare const getTasks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEvents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
