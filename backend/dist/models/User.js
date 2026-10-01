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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const Role_1 = require("./Role");
const Lead_1 = require("./Lead");
const Account_1 = require("./Account");
const Opportunity_1 = require("./Opportunity");
const Activity_1 = require("./Activity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "resetToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "resetTokenExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "hasChangedPasswordOnFirstLogin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "passwordChangedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "emailNotificationsEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', default: '{}' }),
    __metadata("design:type", Object)
], User.prototype, "emailNotificationPreferences", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Role_1.Role, (role) => role.users),
    (0, typeorm_1.JoinColumn)({ name: 'roleId' }),
    __metadata("design:type", Role_1.Role)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Lead_1.Lead, (lead) => lead.owner),
    __metadata("design:type", Array)
], User.prototype, "leads", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Account_1.Account, (account) => account.owner),
    __metadata("design:type", Array)
], User.prototype, "accounts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Opportunity_1.Opportunity, (opp) => opp.owner),
    __metadata("design:type", Array)
], User.prototype, "opportunities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Activity_1.Activity, (activity) => activity.createdBy),
    __metadata("design:type", Array)
], User.prototype, "activities", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=User.js.map