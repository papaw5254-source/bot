import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async topOrCreate(dto: CreateUserDto): Promise<User> {
    await this.userRepo.upsert(
      {
        telegramId: dto.telegramId,
        username: dto.username ?? undefined,
        firstName: dto.firstName,
        lastName: dto.lastName ?? undefined,
      },
      { conflictPaths: ['telegramId'], skipUpdateIfNoValuesChanged: true },
    );
    return (await this.userRepo.findOne({
      where: { telegramId: dto.telegramId },
    }))!;
  }

  async telegramIdByTopish(telegramId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { telegramId } });
  }

  async idByTopish(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Foydalanuvchi #${id} topilmadi`);
    }
    return user;
  }

  async barchasiniTopish(sahifa = 1, limit = 20): Promise<[User[], number]> {
    return this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (sahifa - 1) * limit,
      take: limit,
    });
  }

  async yangilash(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.idByTopish(id);
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async bloklash(id: number, holat: boolean): Promise<User> {
    const user = await this.idByTopish(id);
    user.isBlocked = holat;
    return this.userRepo.save(user);
  }

  async statistika(): Promise<{
    jami: number;
    bloklangan: number;
    bugun: number;
  }> {
    const jami = await this.userRepo.count();
    const bloklangan = await this.userRepo.count({
      where: { isBlocked: true },
    });

    const bugunBoshi = new Date();
    bugunBoshi.setHours(0, 0, 0, 0);

    const bugun = await this.userRepo
      .createQueryBuilder('user')
      .where('user.created_at >= :bugun', { bugun: bugunBoshi })
      .getCount();

    return { jami, bloklangan, bugun };
  }
}
