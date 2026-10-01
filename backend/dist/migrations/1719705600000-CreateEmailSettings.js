"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEmailSettings1719705600000 = void 0;
const typeorm_1 = require("typeorm");
class CreateEmailSettings1719705600000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'email_settings',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'smtpHost',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'smtpPort',
                    type: 'integer',
                },
                {
                    name: 'smtpUser',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'smtpPassword',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'fromEmail',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'fromName',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'isConfigured',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'enableNotifications',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedById',
                    type: 'uuid',
                    isNullable: true,
                },
            ],
            foreignKeys: [
                new typeorm_1.TableForeignKey({
                    columnNames: ['updatedById'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'users',
                    onDelete: 'SET NULL',
                }),
            ],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('email_settings');
    }
}
exports.CreateEmailSettings1719705600000 = CreateEmailSettings1719705600000;
//# sourceMappingURL=1719705600000-CreateEmailSettings.js.map