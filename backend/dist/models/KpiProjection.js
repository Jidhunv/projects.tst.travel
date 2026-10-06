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
exports.KpiProjection = void 0;
const typeorm_1 = require("typeorm");
// A staff member's projected figure for one month and metric. `month` is the
// first day of the month (YYYY-MM-01). Every change is also appended to
// kpi_audit_trail, so revisions are never lost.
let KpiProjection = class KpiProjection {
};
exports.KpiProjection = KpiProjection;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], KpiProjection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KpiProjection.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], KpiProjection.prototype, "month", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], KpiProjection.prototype, "metric", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], KpiProjection.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", Object)
], KpiProjection.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], KpiProjection.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], KpiProjection.prototype, "updatedAt", void 0);
exports.KpiProjection = KpiProjection = __decorate([
    (0, typeorm_1.Entity)('kpi_projections'),
    (0, typeorm_1.Unique)(['userId', 'month', 'metric'])
], KpiProjection);
//# sourceMappingURL=KpiProjection.js.map