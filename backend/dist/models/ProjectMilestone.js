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
exports.ProjectMilestone = void 0;
const typeorm_1 = require("typeorm");
const Project_1 = require("./Project");
const User_1 = require("./User");
let ProjectMilestone = class ProjectMilestone {
};
exports.ProjectMilestone = ProjectMilestone;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project_1.Project, (project) => project.milestones, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'projectId' }),
    __metadata("design:type", Project_1.Project)
], ProjectMilestone.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "milestoneType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "milestoneName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], ProjectMilestone.prototype, "completedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "completedTime", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'responsibleUserId' }),
    __metadata("design:type", User_1.User)
], ProjectMilestone.prototype, "responsibleUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "responsibleUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Pending' }),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "approvalStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProjectMilestone.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ProjectMilestone.prototype, "approvedDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProjectMilestone.prototype, "createdAt", void 0);
exports.ProjectMilestone = ProjectMilestone = __decorate([
    (0, typeorm_1.Entity)('project_milestones')
], ProjectMilestone);
//# sourceMappingURL=ProjectMilestone.js.map