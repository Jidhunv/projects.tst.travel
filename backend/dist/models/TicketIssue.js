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
exports.TicketIssue = void 0;
const typeorm_1 = require("typeorm");
const Ticket_1 = require("./Ticket");
// One issue inside a client ticket. It moves through the stages in
// utils/issueWorkflow.ts; the ticket closes when all of its issues are closed.
let TicketIssue = class TicketIssue {
};
exports.TicketIssue = TicketIssue;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TicketIssue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Ticket_1.Ticket, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'ticketId' }),
    __metadata("design:type", Ticket_1.Ticket)
], TicketIssue.prototype, "ticket", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TicketIssue.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], TicketIssue.prototype, "issueNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TicketIssue.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", Object)
], TicketIssue.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Medium' }),
    __metadata("design:type", String)
], TicketIssue.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Logged' }),
    __metadata("design:type", String)
], TicketIssue.prototype, "stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], TicketIssue.prototype, "assigneeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], TicketIssue.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], TicketIssue.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TicketIssue.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TicketIssue.prototype, "updatedAt", void 0);
exports.TicketIssue = TicketIssue = __decorate([
    (0, typeorm_1.Entity)('ticket_issues'),
    (0, typeorm_1.Unique)(['ticketId', 'issueNumber'])
], TicketIssue);
//# sourceMappingURL=TicketIssue.js.map