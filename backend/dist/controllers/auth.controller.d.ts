import { Request, Response } from 'express';
export declare const ssoLoginMock: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const generateDeveloperToken: (req: Request, res: Response) => Promise<void>;
