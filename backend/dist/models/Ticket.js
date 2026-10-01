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
exports.Ticket = void 0;
const typeorm_1 = require("typeorm");
const Account_1 = require("./Account");
const Contact_1 = require("./Contact");
const User_1 = require("./User");
const Activity_1 = require("./Activity");
let Ticket = class Ticket {
};
exports.Ticket = Ticket;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Ticket.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Ticket.prototype, "ticketNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Ticket.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Ticket.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium',
    }),
    __metadata("design:type", String)
], Ticket.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['Open', 'In Progress', 'Pending Customer', 'Resolved', 'Closed'],
        default: 'Open',
    }),
    __metadata("design:type", String)
], Ticket.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ticket.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ticket.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Account_1.Account),
    __metadata("design:type", Account_1.Account)
], Ticket.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ticket.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['Bug', 'Feature Request', 'Enhancement Suggestion'],
        nullable: true,
    }),
    __metadata("design:type", String)
], Ticket.prototype, "moduleType", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Ticket.prototype, "attachmentPaths", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contact_1.Contact, { nullable: true }),
    __metadata("design:type", Contact_1.Contact)
], Ticket.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    __metadata("design:type", User_1.User)
], Ticket.prototype, "reporter", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], Ticket.prototype, "assignee", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Ticket.prototype, "assigneeIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Ticket.prototype, "slaResponseHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Ticket.prototype, "slaResolutionHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamp' }),
    __metadata("design:type", Date)
], Ticket.prototype, "responseDeadline", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamp' }),
    __metadata("design:type", Date)
], Ticket.prototype, "resolutionDeadline", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamp' }),
    __metadata("design:type", Date)
], Ticket.prototype, "respondedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamp' }),
    __metadata("design:type", Date)
], Ticket.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ticket.prototype, "resolutionNotes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Activity_1.Activity, (activity) => activity.resourceId, { eager: false }),
    __metadata("design:type", Array)
], Ticket.prototype, "activities", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Ticket.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Ticket.prototype, "updatedAt", void 0);
exports.Ticket = Ticket = __decorate([
    (0, typeorm_1.Entity)('tickets')
], Ticket);
//# sourceMappingURL=Ticket.js.map