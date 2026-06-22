import { Request, Response } from 'express';
export declare const logAuditEvent: (client: any, userId: string, action: string, resource: string, metadata?: any) => Promise<void>;
export declare const getBillingMetrics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
