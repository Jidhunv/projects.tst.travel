import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// A team/group in the org hierarchy. Teams form a tree via parentTeamId:
// a top-level team (parentTeamId = null) sits above sub-teams. Visibility is
// "whole sub-tree" -- a member of a team sees records for their team and every
// descendant team, so a travel manager over several sub-teams sees all of them
// while a rep in a leaf team sees only their own team.
@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Parent team in the hierarchy; null for a top-level team.
  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentTeamId' })
  parent: Team;

  @Column({ nullable: true })
  parentTeamId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
