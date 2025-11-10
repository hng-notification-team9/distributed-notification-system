import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string, requestUserId: string) {
    if (userId !== requestUserId) {
      throw new ForbiddenException(
        'You can only view your own preferences',
      );
    }

    const preferences = await this.prisma.userPreferences.findUnique({
      where: { user_id: userId },
    });

    if (!preferences) {
      throw new NotFoundException('Preferences not found for this user');
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
    requestUserId: string,
  ) {
    if (userId !== requestUserId) {
      throw new ForbiddenException(
        'You can only update your own preferences',
      );
    }

    const existingPreferences = await this.prisma.userPreferences.findUnique({
      where: { user_id: userId },
    });

    if (!existingPreferences) {
      throw new NotFoundException('Preferences not found for this user');
    }

    const updatedPreferences = await this.prisma.userPreferences.update({
      where: { user_id: userId },
      data: updatePreferencesDto,
    });

    return updatedPreferences;
  }
}
