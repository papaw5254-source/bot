import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FeedbackReply } from '../../feedback/entities/feedback-reply.entity';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  RESTAURANT_ADMIN = 'restoran_admin',
}

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, name: 'telegram_id', nullable: true, type: 'bigint' })
  telegramId: number;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.RESTAURANT_ADMIN,
  })
  role: AdminRole;

  @Column({ nullable: true, name: 'restaurant_id' })
  restaurantId: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => FeedbackReply, (reply) => reply.admin)
  replies: FeedbackReply[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
