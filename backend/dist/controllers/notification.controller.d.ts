import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class NotificationController {
    getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    deleteNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: NotificationController;
export default _default;
//# sourceMappingURL=notification.controller.d.ts.map