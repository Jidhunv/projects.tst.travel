import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEmailSettings1719705600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
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
          new TableForeignKey({
            columnNames: ['updatedById'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_settings');
  }
}
