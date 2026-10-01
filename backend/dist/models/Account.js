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
exports.Account = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Contact_1 = require("./Contact");
const Opportunity_1 = require("./Opportunity");
const Contract_1 = require("./Contract");
const Project_1 = require("./Project");
let Account = class Account {
};
exports.Account = Account;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Account.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Account.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "industry", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "contactPerson", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "region", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "alternatePhoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Prospect' }),
    __metadata("design:type", String)
], Account.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Prospect' }),
    __metadata("design:type", String)
], Account.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.accounts),
    (0, typeorm_1.JoinColumn)({ name: 'ownerId' }),
    __metadata("design:type", User_1.User)
], Account.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Account.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", User_1.User)
], Account.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "teamId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "billingStreet", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "billingCity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "billingState", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "billingZip", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "billingCountry", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "shippingStreet", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "shippingCity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "shippingState", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "shippingZip", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "shippingCountry", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Not Started' }),
    __metadata("design:type", String)
], Account.prototype, "onboardingStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Account.prototype, "onboardingDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Account.prototype, "onboardingCompletedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "onboardingNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Account.prototype, "contractSignedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Account.prototype, "goLiveDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "accountManager", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "billingContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "technicalContact", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Contact_1.Contact, (contact) => contact.account, { cascade: true }),
    __metadata("design:type", Array)
], Account.prototype, "contacts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Opportunity_1.Opportunity, (opp) => opp.account),
    __metadata("design:type", Array)
], Account.prototype, "opportunities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Contract_1.Contract, (contract) => contract.account),
    __metadata("design:type", Array)
], Account.prototype, "contracts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Project_1.Project, (project) => project.account),
    __metadata("design:type", Array)
], Account.prototype, "projects", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Account.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Account.prototype, "assigneeIds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Account.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Account.prototype, "updatedAt", void 0);
exports.Account = Account = __decorate([
    (0, typeorm_1.Entity)('accounts')
], Account);
//# sourceMappingURL=Account.js.map