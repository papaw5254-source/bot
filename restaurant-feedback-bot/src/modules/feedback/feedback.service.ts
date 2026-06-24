import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackStatus } from './entities/feedback.entity';
import { FeedbackReply } from './entities/feedback-reply.entity';
import {
  CreateFeedbackDto,
  UpdateFeedbackStatusDto,
  CreateFeedbackReplyDto,
  FeedbackFilterDto,
} from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(FeedbackReply)
    private readonly replyRepo: Repository<FeedbackReply>,
  ) {}

  async yaratish(dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = this.feedbackRepo.create(dto);
    return this.feedbackRepo.save(feedback);
  }

  async barchasiniTopish(filter: FeedbackFilterDto): Promise<{
    malumot: Feedback[];
    jami: number;
    sahifa: number;
    limit: number;
  }> {
    const sahifa = filter.page || 1;
    const limit = filter.limit || 10;

    const qb = this.feedbackRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.user', 'user')
      .leftJoinAndSelect('f.restaurant', 'restaurant')
      .leftJoinAndSelect('f.replies', 'replies')
      .orderBy('f.created_at', 'DESC');

    if (filter.restaurantId) {
      qb.andWhere('f.restaurant_id = :restId', {
        restId: filter.restaurantId,
      });
    }

    if (filter.status) {
      qb.andWhere('f.status = :holat', { holat: filter.status });
    }

    if (filter.category) {
      qb.andWhere('f.category = :kategoriya', {
        kategoriya: filter.category,
      });
    }

    if (filter.minRating) {
      qb.andWhere('f.rating >= :minReyting', {
        minReyting: filter.minRating,
      });
    }

    const [malumot, jami] = await qb
      .skip((sahifa - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { malumot, jami, sahifa, limit };
  }

  async idByTopish(id: number): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: { user: true, restaurant: true, replies: { admin: true } },
    });
    if (!feedback) {
      throw new NotFoundException(`Fikr #${id} topilmadi`);
    }
    return feedback;
  }

  async holatYangilash(
    id: number,
    dto: UpdateFeedbackStatusDto,
  ): Promise<Feedback> {
    const feedback = await this.idByTopish(id);
    feedback.status = dto.status;
    return this.feedbackRepo.save(feedback);
  }

  async javobBerish(
    feedbackId: number,
    adminId: number,
    dto: CreateFeedbackReplyDto,
  ): Promise<FeedbackReply> {
    await this.idByTopish(feedbackId);

    const javob = this.replyRepo.create({
      feedbackId,
      adminId,
      message: dto.message,
    });

    const saqlangan = await this.replyRepo.save(javob);

    await this.feedbackRepo.update(feedbackId, {
      status: FeedbackStatus.REVIEWED,
    });

    return saqlangan;
  }

  async ochirish(id: number): Promise<void> {
    const feedback = await this.idByTopish(id);
    await this.feedbackRepo.remove(feedback);
  }

  async statistika(restaurantId?: number): Promise<{
    jami: number;
    kutilmoqda: number;
    koribChiqildi: number;
    halEtildi: number;
    ortachaReyting: number;
    reytinglarTaqsimoti: { reyting: number; soni: number }[];
  }> {
    const qb = this.feedbackRepo.createQueryBuilder('f');
    if (restaurantId) {
      qb.where('f.restaurant_id = :id', { id: restaurantId });
    }

    const [jami, kutilmoqda, koribChiqildi, halEtildi] = await Promise.all([
      qb.getCount(),
      qb
        .clone()
        .andWhere('f.status = :s', { s: FeedbackStatus.PENDING })
        .getCount(),
      qb
        .clone()
        .andWhere('f.status = :s', { s: FeedbackStatus.REVIEWED })
        .getCount(),
      qb
        .clone()
        .andWhere('f.status = :s', { s: FeedbackStatus.RESOLVED })
        .getCount(),
    ]);

    const ortachaResult = await qb
      .clone()
      .select('AVG(f.rating)', 'ortacha')
      .getRawOne();

    const taqsimot = await qb
      .clone()
      .select('f.rating', 'reyting')
      .addSelect('COUNT(*)', 'soni')
      .groupBy('f.rating')
      .orderBy('f.rating', 'ASC')
      .getRawMany();

    return {
      jami,
      kutilmoqda,
      koribChiqildi,
      halEtildi,
      ortachaReyting: parseFloat(ortachaResult?.ortacha || '0'),
      reytinglarTaqsimoti: taqsimot.map((r) => ({
        reyting: parseInt(r.reyting),
        soni: parseInt(r.soni),
      })),
    };
  }
}
