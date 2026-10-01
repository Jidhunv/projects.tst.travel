import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
    teamId?: string | null;
}
export declare const getReadScope: (user: AuthUser | undefined, module: string) => "all" | "team" | "self" | null;
export declare const getScope: (user: AuthUser | undefined, module: string, action: string) => "all" | "team" | "self" | null;
export interface AuthRequest extends Request {
    user?: AuthUser;
    traceId?: string;
}
export declare const extractToken: (req: Request) => string | undefined;
export declare const verifyToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireRole: (...allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const getOwnerScope: (user: AuthUser | undefined, module: string) => string | undefined;
export declare const canAccessRecord: (user: AuthUser | undefined, module: string, ownerId: string, action?: string, assigneeIds?: string[]) => boolean;
export declare const assertOwnsViaAccount: (user: AuthUser | undefined, module: string, action: string, accountOwnerId: string | undefined, personalIds?: Array<string | string[] | undefined>) => void;
export declare const generateToken: (id: string, email: string, role: string) => string;
export declare const canPerformAction: (user: AuthUser | undefined, module: string, action: string) => boolean;
export declare const canReassign: (user: AuthUser | undefined, module: string) => boolean;
//# sourceMappingURL=auth.d.ts.map