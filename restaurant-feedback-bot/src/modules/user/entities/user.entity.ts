import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Feedback } from '../../feedback/entities/feedback.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, name: 'telegram_id', type: 'bigint' })
  telegramId!: number;

  @Column({ nullable: true })
  username!: string;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ nullable: true, name: 'last_name' })
  lastName!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ default: false, name: 'is_blocked' })
  isBlocked!: boolean;

  @Column({ default: 'uz' })
  language!: string;

  @OneToMany(() => Feedback, (feedback) => feedback.user)
  feedbacks!: Feedback[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
