import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import {
  CreateRestaurantDto,
  UpdateRestaurantDto,
} from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async yaratish(dto: CreateRestaurantDto): Promise<Restaurant> {
    const restoran = this.restaurantRepo.create(dto);
    return this.restaurantRepo.save(restoran);
  }

  async barchasiniTopish(faqatFaol = false): Promise<Restaurant[]> {
    const shart: any = {};
    if (faqatFaol) shart.isActive = true;
    return this.restaurantRepo.find({
      where: shart,
      order: { createdAt: 'DESC' },
    });
  }

  async idByTopish(id: number): Promise<Restaurant> {
    const restoran = await this.restaurantRepo.findOne({ where: { id } });
    if (!restoran) {
      throw new NotFoundException(`Restoran #${id} topilmadi`);
    }
    return restoran;
  }

  async yangilash(id: number, dto: UpdateRestaurantDto): Promise<Restaurant> {
    const restoran = await this.idByTopish(id);
    Object.assign(restoran, dto);
    return this.restaurantRepo.save(restoran);
  }

  async ochirish(id: number): Promise<void> {
    const restoran = await this.idByTopish(id);
    await this.restaurantRepo.remove(restoran);
  }

  async faollashtirish(id: number, holat: boolean): Promise<Restaurant> {
    const restoran = await this.idByTopish(id);
    restoran.isActive = holat;
    return this.restaurantRepo.save(restoran);
  }

  async asosiyRestoranTayyorla(): Promise<void> {
    const bor = await this.restaurantRepo.findOne({ where: { id: 1 } });
    if (!bor) {
      await this.restaurantRepo.save(
        this.restaurantRepo.create({
          name: 'Marvarid Restaurant',
          address: 'Toshkent',
          phone: '+998901234567',
          isActive: true,
        }),
      );
    }
  }

  async statistikaTopish(id: number): Promise<{
    jamiFeedback: number;
    ortachaReyting: number;
    bugunFeedback: number;
  }> {
    const restoran = await this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoin('r.feedbacks', 'f')
      .addSelect('COUNT(f.id)', 'jami')
      .addSelect('AVG(f.rating)', 'ortacha')
      .where('r.id = :id', { id })
      .getRawOne();

    const bugunBoshi = new Date();
    bugunBoshi.setHours(0, 0, 0, 0);

    const bugun = await this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoin('r.feedbacks', 'f')
      .where('r.id = :id', { id })
      .andWhere('f.created_at >= :bugun', { bugun: bugunBoshi })
      .getCount();

    return {
      jamiFeedback: parseInt(restoran?.jami || '0'),
      ortachaReyting: parseFloat(restoran?.ortacha || '0'),
      bugunFeedback: bugun,
    };
  }
}
