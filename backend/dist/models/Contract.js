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
exports.Contract = void 0;
const typeorm_1 = require("typeorm");
const Account_1 = require("./Account");
const Opportunity_1 = require("./Opportunity");
const Project_1 = require("./Project");
const Invoice_1 = require("./Invoice");
const User_1 = require("./User");
let Contract = class Contract {
};
exports.Contract = Contract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Contract.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Contract.prototype, "contractNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Contract.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Contract.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Contract.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Contract.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Contract.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Contract.prototype, "renewalDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "paymentTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Contract.prototype, "slaTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Draft' }),
    __metadata("design:type", String)
], Contract.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Contract.prototype, "approvedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "documentPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Contract.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Account_1.Account, (account) => account.contracts),
    (0, typeorm_1.JoinColumn)({ name: 'accountId' }),
    __metadata("design:type", Account_1.Account)
], Contract.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Contract.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Opportunity_1.Opportunity, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'opportunityId' }),
    __metadata("design:type", Opportunity_1.Opportunity)
], Contract.prototype, "opportunity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "opportunityId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Project_1.Project, (project) => project.contract),
    __metadata("design:type", Array)
], Contract.prototype, "projects", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Invoice_1.Invoice, (invoice) => invoice.contract),
    __metadata("design:type", Array)
], Contract.prototype, "invoices", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'createdById' }),
    __metadata("design:type", User_1.User)
], Contract.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Contract.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Contract.prototype, "updatedAt", void 0);
exports.Contract = Contract = __decorate([
    (0, typeorm_1.Entity)('contracts')
], Contract);
//# sourceMappingURL=Contract.js.map