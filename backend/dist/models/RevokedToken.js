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
exports.RevokedToken = void 0;
const typeorm_1 = require("typeorm");
// A revoked (blacklisted) JWT. On logout we store the SHA-256 hash of the token
// together with its natural expiry; verifyToken rejects any token whose hash is
// present and not yet expired. Rows past their expiry can be safely purged.
let RevokedToken = class RevokedToken {
};
exports.RevokedToken = RevokedToken;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RevokedToken.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RevokedToken.prototype, "tokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RevokedToken.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], RevokedToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RevokedToken.prototype, "revokedAt", void 0);
exports.RevokedToken = RevokedToken = __decorate([
    (0, typeorm_1.Entity)('revoked_tokens')
], RevokedToken);
//# sourceMappingURL=RevokedToken.js.map