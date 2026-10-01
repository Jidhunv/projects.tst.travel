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
exports.AccountStakeholder = void 0;
const typeorm_1 = require("typeorm");
const Account_1 = require("./Account");
const Designation_1 = require("./Designation");
// One row per (account, buying-committee role) - see STAKEHOLDER_ROLES in
// utils/constants.ts for the fixed set of 8 roles. An account's "onboarding"
// is complete once it has a row for every role, each with a name and a
// designation. Enforced before a lead can be created against the account
// (see lead.controller.ts#createLead).
let AccountStakeholder = class AccountStakeholder {
};
exports.AccountStakeholder = AccountStakeholder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AccountStakeholder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Account_1.Account),
    (0, typeorm_1.JoinColumn)({ name: 'accountId' }),
    __metadata("design:type", Account_1.Account)
], AccountStakeholder.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AccountStakeholder.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AccountStakeholder.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AccountStakeholder.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Designation_1.Designation),
    (0, typeorm_1.JoinColumn)({ name: 'designationId' }),
    __metadata("design:type", Designation_1.Designation)
], AccountStakeholder.prototype, "designation", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AccountStakeholder.prototype, "designationId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AccountStakeholder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AccountStakeholder.prototype, "updatedAt", void 0);
exports.AccountStakeholder = AccountStakeholder = __decorate([
    (0, typeorm_1.Entity)('account_stakeholders'),
    (0, typeorm_1.Unique)(['accountId', 'role'])
], AccountStakeholder);
//# sourceMappingURL=AccountStakeholder.js.map