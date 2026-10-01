export declare class LoginDTO {
    email: string;
    password: string;
}
export declare class PasswordResetDTO {
    email: string;
}
export declare class PasswordResetConfirmDTO {
    token: string;
    newPassword: string;
}
export declare class ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}
export declare class ChangePasswordOnFirstLoginDTO {
    newPassword: string;
}
export declare class SetUserPasswordDTO {
    userId: string;
    newPassword: string;
}
//# sourceMappingURL=auth.dto.d.ts.map