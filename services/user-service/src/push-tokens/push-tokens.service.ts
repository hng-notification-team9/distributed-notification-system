import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePushTokenDto } from './dto/create-push-token.dto';

@Injectable()
export class PushTokensService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPushTokenDto: CreatePushTokenDto, requestUserId: string) {
    if (userId !== requestUserId) {
      throw new ForbiddenException(
        'You can only add tokens to your own account',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingToken = await this.prisma.pushToken.findFirst({
      where: {
        user_id: userId,
        token: createPushTokenDto.token,
      },
    });

    if (existingToken) {
      if (!existingToken.is_active) {
        const reactivatedToken = await this.prisma.pushToken.update({
          where: { id: existingToken.id },
          data: {
            is_active: true,
            device_name: createPushTokenDto.device_name || existingToken.device_name,
          },
        });
        return reactivatedToken;
      }

      throw new ConflictException('This push token already exists for this user');
    }

    const pushToken = await this.prisma.pushToken.create({
      data: {
        user_id: userId,
        ...createPushTokenDto,
      },
    });

    return pushToken;
  }

  async findAll(userId: string, requestUserId: string) {
    if (userId !== requestUserId) {
      throw new ForbiddenException(
        'You can only view your own push tokens',
      );
    }

    const tokens = await this.prisma.pushToken.findMany({
      where: {
        user_id: userId,
        is_active: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tokens;
  }

  async delete(userId: string, tokenId: string, requestUserId: string) {
    if (userId !== requestUserId) {
      throw new ForbiddenException(
        'You can only delete your own push tokens',
      );
    }

    const token = await this.prisma.pushToken.findFirst({
      where: {
        id: tokenId,
        user_id: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Push token not found');
    }

    await this.prisma.pushToken.update({
      where: { id: tokenId },
      data: { is_active: false },
    });

    return { message: 'Push token deleted successfully' };
  }
}
