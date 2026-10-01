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
exports.Opportunity = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Account_1 = require("./Account");
const Contact_1 = require("./Contact");
const LineItem_1 = require("./LineItem");
let Opportunity = class Opportunity {
};
exports.Opportunity = Opportunity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Opportunity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Opportunity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Opportunity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        default: 'Qualification',
    }),
    __metadata("design:type", String)
], Opportunity.prototype, "stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Open' }),
    __metadata("design:type", String)
], Opportunity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Opportunity.prototype, "forecastedCloseDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Opportunity.prototype, "probability", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Account_1.Account, (account) => account.opportunities),
    (0, typeorm_1.JoinColumn)({ name: 'accountId' }),
    __metadata("design:type", Account_1.Account)
], Opportunity.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Opportunity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contact_1.Contact, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'primaryContactId' }),
    __metadata("design:type", Contact_1.Contact)
], Opportunity.prototype, "primaryContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "primaryContactId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.opportunities),
    (0, typeorm_1.JoinColumn)({ name: 'ownerId' }),
    __metadata("design:type", User_1.User)
], Opportunity.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Opportunity.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => LineItem_1.LineItem, (item) => item.opportunity, { cascade: true }),
    __metadata("design:type", Array)
], Opportunity.prototype, "lineItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Opportunity.prototype, "businessVolume", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Opportunity.prototype, "supplierList", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "region", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "contactPerson", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "contactEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "jobTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "convertedFromLeadId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Opportunity.prototype, "assigneeIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Opportunity.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "closedReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "expectedCloseMonth", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Opportunity.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Opportunity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Opportunity.prototype, "updatedAt", void 0);
exports.Opportunity = Opportunity = __decorate([
    (0, typeorm_1.Entity)('opportunities')
], Opportunity);
//# sourceMappingURL=Opportunity.js.map