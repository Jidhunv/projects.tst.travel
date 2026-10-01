import { User } from '../models/User';
export declare class UserService {
    private userRepository;
    createUser(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string;
        roleId: string;
    }): Promise<User>;
    getUserById(id: string): Promise<User>;
    getUserByEmail(email: string): Promise<User>;
    private static readonly MAX_FAILED_ATTEMPTS;
    private static readonly LOCKOUT_MINUTES;
    private loginSecurityRepository;
    authenticateUser(email: string, password: string): Promise<User>;
    updateUser(id: string, data: Partial<User>): Promise<User>;
    deleteUser(id: string): Promise<User>;
    getAllUsers(): Promise<User[]>;
    getUsers(filters: {
        page?: number;
        limit?: number;
        search?: string;
        roleId?: string;
        isActive?: boolean;
    }): Promise<{
        data: User[];
        total: number;
    }>;
    deactivateUser(id: string): Promise<User>;
    activateUser(id: string): Promise<User>;
    hasPermission(userId: string, module: string, action: string): Promise<boolean>;
    createPasswordResetToken(email: string): Promise<string | null>;
    resetPasswordWithToken(rawToken: string, newPassword: string): Promise<void>;
    changePasswordOnFirstLogin(userId: string, newPassword: string): Promise<User>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<User>;
    setUserPassword(userId: string, newPassword: string): Promise<User>;
    generateTemporaryPassword(): string;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=user.service.d.ts.map