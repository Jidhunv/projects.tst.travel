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
exports.KpiEntry = void 0;
const typeorm_1 = require("typeorm");
const KpiDefinition_1 = require("./KpiDefinition");
// One dated answer to a KpiDefinition, optionally tied to a prospect/account.
let KpiEntry = class KpiEntry {
};
exports.KpiEntry = KpiEntry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], KpiEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => KpiDefinition_1.KpiDefinition, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'kpiId' }),
    __metadata("design:type", KpiDefinition_1.KpiDefinition)
], KpiEntry.prototype, "kpi", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KpiEntry.prototype, "kpiId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], KpiEntry.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], KpiEntry.prototype, "entryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], KpiEntry.prototype, "numberValue", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", Object)
], KpiEntry.prototype, "textValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], KpiEntry.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], KpiEntry.prototype, "createdAt", void 0);
exports.KpiEntry = KpiEntry = __decorate([
    (0, typeorm_1.Entity)('kpi_entries')
], KpiEntry);
//# sourceMappingURL=KpiEntry.js.map