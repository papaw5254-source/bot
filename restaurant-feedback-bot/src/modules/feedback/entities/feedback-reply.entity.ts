import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Feedback } from './feedback.entity';
import { Admin } from '../../admin/entities/admin.entity';

@Entity('feedback_replies')
export class FeedbackReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'feedback_id' })
  feedbackId: number;

  @Column({ name: 'admin_id' })
  adminId: number;

  @Column({ type: 'text' })
  message: string;

  @ManyToOne(() => Feedback, (feedback) => feedback.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  @ManyToOne(() => Admin, (admin) => admin.replies, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
