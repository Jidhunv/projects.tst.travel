import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 2 })
  code: string; // ISO 3166-1 alpha-2 code (e.g., 'US', 'IN', 'GB')

  @Column({ unique: true })
  name: string; // Country name (e.g., 'United States', 'India')

  @Column({ nullable: true })
  region: string; // Geographic region (e.g., 'North America', 'Asia')
}
