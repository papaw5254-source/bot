import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Admin, AdminRole } from './entities/admin.entity';
import { CreateAdminDto, LoginAdminDto, UpdateAdminDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async yaratish(dto: CreateAdminDto): Promise<Omit<Admin, 'passwordHash'>> {
    const mavjud = await this.adminRepo.findOne({
      where: { username: dto.username },
    });
    if (mavjud) {
      throw new ConflictException('Bu login allaqachon mavjud');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = this.adminRepo.create({
      username: dto.username,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role || AdminRole.RESTAURANT_ADMIN,
      restaurantId: dto.restaurantId,
      telegramId: dto.telegramId,
    });

    const saqlangan = await this.adminRepo.save(admin);
    const { passwordHash: _, ...natija } = saqlangan;
    return natija;
  }

  async kirish(dto: LoginAdminDto): Promise<{ token: string; admin: any }> {
    const admin = await this.adminRepo.findOne({
      where: { username: dto.username, isActive: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }

    const parolTogri = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!parolTogri) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }

    const token = this.jwtService.sign({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });

    const { passwordHash: _, ...adminMalumot } = admin;
    return { token, admin: adminMalumot };
  }

  async idByTopish(id: number): Promise<Admin> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`Admin #${id} topilmadi`);
    }
    return admin;
  }

  async barchasiniTopish(): Promise<Omit<Admin, 'passwordHash'>[]> {
    const adminlar = await this.adminRepo.find({
      order: { createdAt: 'DESC' },
    });
    return adminlar.map(({ passwordHash: _, ...a }) => a);
  }

  async yangilash(
    id: number,
    dto: UpdateAdminDto,
  ): Promise<Omit<Admin, 'passwordHash'>> {
    const admin = await this.idByTopish(id);

    if (dto.password) {
      admin.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.fullName) admin.fullName = dto.fullName;
    if (dto.restaurantId !== undefined) admin.restaurantId = dto.restaurantId;

    const saqlangan = await this.adminRepo.save(admin);
    const { passwordHash: _, ...natija } = saqlangan;
    return natija;
  }

  async faollashtirish(id: number, holat: boolean): Promise<void> {
    await this.idByTopish(id);
    await this.adminRepo.update(id, { isActive: holat });
  }
}
