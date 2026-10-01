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
exports.SalesVisit = void 0;
const typeorm_1 = require("typeorm");
const Account_1 = require("./Account");
const User_1 = require("./User");
const FollowupEntry_1 = require("./FollowupEntry");
// A logged sales visit or call. Powers the Sales Report.
let SalesVisit = class SalesVisit {
};
exports.SalesVisit = SalesVisit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SalesVisit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Account_1.Account, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'accountId' }),
    __metadata("design:type", Account_1.Account)
], SalesVisit.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesVisit.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesVisit.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Visit' }),
    __metadata("design:type", String)
], SalesVisit.prototype, "visitType", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], SalesVisit.prototype, "discussion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SalesVisit.prototype, "visitDate", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => FollowupEntry_1.FollowupEntry, (entry) => entry.visit, { cascade: true }),
    __metadata("design:type", Array)
], SalesVisit.prototype, "followups", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SalesVisit.prototype, "followupDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SalesVisit.prototype, "followupCompleted", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], SalesVisit.prototype, "followupNotes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'createdById' }),
    __metadata("design:type", User_1.User)
], SalesVisit.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesVisit.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SalesVisit.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SalesVisit.prototype, "updatedAt", void 0);
exports.SalesVisit = SalesVisit = __decorate([
    (0, typeorm_1.Entity)('sales_visits')
], SalesVisit);
//# sourceMappingURL=SalesVisit.js.map