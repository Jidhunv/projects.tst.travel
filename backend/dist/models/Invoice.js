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
exports.Invoice = void 0;
const typeorm_1 = require("typeorm");
const Contract_1 = require("./Contract");
const Project_1 = require("./Project");
const Account_1 = require("./Account");
const Payment_1 = require("./Payment");
let Invoice = class Invoice {
};
exports.Invoice = Invoice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Invoice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Invoice.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contract_1.Contract),
    (0, typeorm_1.JoinColumn)({ name: 'contractId' }),
    __metadata("design:type", Contract_1.Contract)
], Invoice.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Invoice.prototype, "contractId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'projectId' }),
    __metadata("design:type", Project_1.Project)
], Invoice.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Invoice.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Account_1.Account),
    (0, typeorm_1.JoinColumn)({ name: 'accountId' }),
    __metadata("design:type", Account_1.Account)
], Invoice.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Invoice.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Invoice.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Invoice.prototype, "tax", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Invoice.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Invoice.prototype, "invoiceDate", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Invoice.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Draft' }),
    __metadata("design:type", String)
], Invoice.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Monthly' }),
    __metadata("design:type", String)
], Invoice.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Invoice.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Invoice.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Invoice.prototype, "documentPath", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Payment_1.Payment, (payment) => payment.invoice),
    __metadata("design:type", Array)
], Invoice.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Invoice.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Invoice.prototype, "updatedAt", void 0);
exports.Invoice = Invoice = __decorate([
    (0, typeorm_1.Entity)('invoices')
], Invoice);
//# sourceMappingURL=Invoice.js.map