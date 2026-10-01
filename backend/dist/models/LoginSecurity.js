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
exports.LoginSecurity = void 0;
const typeorm_1 = require("typeorm");
// Brute-force protection state, kept separate from the users table so it can be
// owned/managed by the application DB role. Keyed by the user's id.
let LoginSecurity = class LoginSecurity {
};
exports.LoginSecurity = LoginSecurity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], LoginSecurity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], LoginSecurity.prototype, "failedAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], LoginSecurity.prototype, "lockoutUntil", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], LoginSecurity.prototype, "updatedAt", void 0);
exports.LoginSecurity = LoginSecurity = __decorate([
    (0, typeorm_1.Entity)('login_security')
], LoginSecurity);
//# sourceMappingURL=LoginSecurity.js.map