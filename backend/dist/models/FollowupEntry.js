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
exports.FollowupEntry = void 0;
const typeorm_1 = require("typeorm");
const SalesVisit_1 = require("./SalesVisit");
const User_1 = require("./User");
// Each followup to a sales visit is recorded as a separate entry
// This allows tracking multiple followups over time for a single visit
let FollowupEntry = class FollowupEntry {
};
exports.FollowupEntry = FollowupEntry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FollowupEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SalesVisit_1.SalesVisit, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'visitId' }),
    __metadata("design:type", SalesVisit_1.SalesVisit)
], FollowupEntry.prototype, "visit", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", String)
], FollowupEntry.prototype, "visitId", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], FollowupEntry.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FollowupEntry.prototype, "followupDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], FollowupEntry.prototype, "completed", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'createdById' }),
    __metadata("design:type", User_1.User)
], FollowupEntry.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], FollowupEntry.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FollowupEntry.prototype, "createdAt", void 0);
exports.FollowupEntry = FollowupEntry = __decorate([
    (0, typeorm_1.Entity)('followup_entries')
], FollowupEntry);
//# sourceMappingURL=FollowupEntry.js.map