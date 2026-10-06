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
exports.KpiAuditTrail = void 0;
const typeorm_1 = require("typeorm");
// Append-only history of KPI entries and projections. No foreign keys on
// purpose: the trail must survive deletion of the thing it describes.
let KpiAuditTrail = class KpiAuditTrail {
};
exports.KpiAuditTrail = KpiAuditTrail;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], KpiAuditTrail.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], KpiAuditTrail.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KpiAuditTrail.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KpiAuditTrail.prototype, "subjectUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], KpiAuditTrail.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], KpiAuditTrail.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], KpiAuditTrail.prototype, "before", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], KpiAuditTrail.prototype, "after", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], KpiAuditTrail.prototype, "createdAt", void 0);
exports.KpiAuditTrail = KpiAuditTrail = __decorate([
    (0, typeorm_1.Entity)('kpi_audit_trail')
], KpiAuditTrail);
//# sourceMappingURL=KpiAuditTrail.js.map