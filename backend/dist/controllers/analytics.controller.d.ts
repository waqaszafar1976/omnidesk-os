import { Request, Response } from 'express';
export declare const getKpis: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUsageTrend: (req: Request, res: Response) => Promise<void>;
export declare const getWorkspaceDistribution: (req: Request, res: Response) => Promise<void>;
export declare const getTopWorkspaces: (req: Request, res: Response) => Promise<void>;
export declare const getRecentActivity: (req: Request, res: Response) => Promise<void>;
