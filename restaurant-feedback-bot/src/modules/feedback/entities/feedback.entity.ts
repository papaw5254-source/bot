import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { FeedbackReply } from './feedback-reply.entity';

export enum FeedbackStatus {
  PENDING = 'kutilmoqda',
  REVIEWED = 'korib_chiqildi',
  RESOLVED = 'hal_etildi',
}

export enum FeedbackCategory {
  FOOD = 'taom',
  SERVICE = 'xizmat',
  AMBIANCE = 'muhit',
  PRICE = 'narx',
}

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ nullable: true, type: 'text' })
  comment: string;

  @Column({
    type: 'enum',
    enum: FeedbackCategory,
    default: FeedbackCategory.FOOD,
  })
  category: FeedbackCategory;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  // Faqat Xizmat kategoriyasi uchun
  @Column({ nullable: true, name: 'waiter_name' })
  waiterName: string;

  @Column({ nullable: true, name: 'image_url' })
  imageUrl: string;

  @ManyToOne(() => User, (user) => user.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.feedbacks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @OneToMany(() => FeedbackReply, (reply) => reply.feedback)
  replies: FeedbackReply[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
