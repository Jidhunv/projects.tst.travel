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
exports.TaskFollowup = void 0;
const typeorm_1 = require("typeorm");
const Task_1 = require("./Task");
const User_1 = require("./User");
// One entry in the follow-up conversation of a task: what was discussed and when to follow up next.
let TaskFollowup = class TaskFollowup {
};
exports.TaskFollowup = TaskFollowup;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaskFollowup.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Task_1.Task, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'taskId' }),
    __metadata("design:type", Task_1.Task)
], TaskFollowup.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaskFollowup.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], TaskFollowup.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Object)
], TaskFollowup.prototype, "nextFollowupDate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'createdById' }),
    __metadata("design:type", User_1.User)
], TaskFollowup.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaskFollowup.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaskFollowup.prototype, "createdAt", void 0);
exports.TaskFollowup = TaskFollowup = __decorate([
    (0, typeorm_1.Entity)('task_followups')
], TaskFollowup);
//# sourceMappingURL=TaskFollowup.js.map