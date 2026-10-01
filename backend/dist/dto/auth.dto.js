"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetUserPasswordDTO = exports.ChangePasswordOnFirstLoginDTO = exports.ChangePasswordDTO = exports.PasswordResetConfirmDTO = exports.PasswordResetDTO = exports.LoginDTO = void 0;
const class_validator_1 = require("class-validator");
class LoginDTO {
}
exports.LoginDTO = LoginDTO;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Email must be a valid email address' }),
    __metadata("design:type", String)
], LoginDTO.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password must not exceed 128 characters' }),
    __metadata("design:type", String)
], LoginDTO.prototype, "password", void 0);
class PasswordResetDTO {
}
exports.PasswordResetDTO = PasswordResetDTO;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Email must be a valid email address' }),
    __metadata("design:type", String)
], PasswordResetDTO.prototype, "email", void 0);
class PasswordResetConfirmDTO {
}
exports.PasswordResetConfirmDTO = PasswordResetConfirmDTO;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(32, { message: 'Invalid reset token' }),
    __metadata("design:type", String)
], PasswordResetConfirmDTO.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password must not exceed 128 characters' }),
    (0, class_validator_1.Matches)(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' }),
    (0, class_validator_1.Matches)(/[a-z]/, { message: 'Password must contain at least one lowercase letter' }),
    (0, class_validator_1.Matches)(/[0-9]/, { message: 'Password must contain at least one number' }),
    (0, class_validator_1.Matches)(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
        message: 'Password must contain at least one special character',
    }),
    __metadata("design:type", String)
], PasswordResetConfirmDTO.prototype, "newPassword", void 0);
class ChangePasswordDTO {
}
exports.ChangePasswordDTO = ChangePasswordDTO;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    __metadata("design:type", String)
], ChangePasswordDTO.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128),
    (0, class_validator_1.Matches)(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' }),
    (0, class_validator_1.Matches)(/[a-z]/, { message: 'Password must contain at least one lowercase letter' }),
    (0, class_validator_1.Matches)(/[0-9]/, { message: 'Password must contain at least one number' }),
    (0, class_validator_1.Matches)(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
        message: 'Password must contain at least one special character',
    }),
    __metadata("design:type", String)
], ChangePasswordDTO.prototype, "newPassword", void 0);
class ChangePasswordOnFirstLoginDTO {
}
exports.ChangePasswordOnFirstLoginDTO = ChangePasswordOnFirstLoginDTO;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128),
    (0, class_validator_1.Matches)(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' }),
    (0, class_validator_1.Matches)(/[a-z]/, { message: 'Password must contain at least one lowercase letter' }),
    (0, class_validator_1.Matches)(/[0-9]/, { message: 'Password must contain at least one number' }),
    (0, class_validator_1.Matches)(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
        message: 'Password must contain at least one special character',
    }),
    __metadata("design:type", String)
], ChangePasswordOnFirstLoginDTO.prototype, "newPassword", void 0);
class SetUserPasswordDTO {
}
exports.SetUserPasswordDTO = SetUserPasswordDTO;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SetUserPasswordDTO.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(128),
    (0, class_validator_1.Matches)(/[A-Z]/),
    (0, class_validator_1.Matches)(/[a-z]/),
    (0, class_validator_1.Matches)(/[0-9]/),
    (0, class_validator_1.Matches)(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/),
    __metadata("design:type", String)
], SetUserPasswordDTO.prototype, "newPassword", void 0);
//# sourceMappingURL=auth.dto.js.map