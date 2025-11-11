import { Controller, Get, Put, Body, Param, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { ResponseFormatter } from '../common/interfaces/api-response.interface';

@ApiTags('Preferences')
@ApiBearerAuth('JWT-auth')
@Controller('users/:userId/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  async getPreferences(@Param('userId') userId: string, @Req() req: any) {
    const preferences = await this.preferencesService.getPreferences(
      userId,
      req.user.id,
    );
    return ResponseFormatter.success(
      preferences,
      'Preferences retrieved successfully',
    );
  }

  @Put()
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
    @Req() req: any,
  ) {
    const preferences = await this.preferencesService.updatePreferences(
      userId,
      updatePreferencesDto,
      req.user.id,
    );
    return ResponseFormatter.success(
      preferences,
      'Preferences updated successfully',
    );
  }
}
