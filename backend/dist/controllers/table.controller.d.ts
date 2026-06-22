import { Request, Response } from 'express';
export declare const getTableSchema: (req: Request, res: Response) => Promise<void>;
export declare const getTableRows: (req: Request, res: Response) => Promise<void>;
export declare const addTableRow: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTableRow: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addTableColumn: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
