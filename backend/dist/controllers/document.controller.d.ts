import { Request, Response } from 'express';
export declare const createPage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatePageContent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPageDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listAllPages: (req: Request, res: Response) => Promise<void>;
