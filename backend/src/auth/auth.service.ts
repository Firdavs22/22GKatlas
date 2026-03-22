import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async acceptInvite(token: string, password: string, name: string) {
    // Decode invite token (simple JWT)
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BadRequestException('Неверный или просроченный токен');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new NotFoundException();

    const hashed = await bcrypt.hash(password, 10);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, name },
    });

    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  generateInviteToken(userId: string): string {
    return this.jwt.sign({ sub: userId, type: 'invite' }, { expiresIn: '7d' });
  }
}
