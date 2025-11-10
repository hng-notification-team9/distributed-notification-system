import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PushTokensService } from './push-tokens.service';
import { CreatePushTokenDto } from './dto/create-push-token.dto';
import { ResponseFormatter } from '../common/interfaces/api-response.interface';

@ApiTags('Push Tokens')
@ApiBearerAuth('JWT-auth')
@Controller('users/:userId/push-tokens')
export class PushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new push notification token' })
  @ApiResponse({
    status: 201,
    description: 'Push token added successfully',
  })
  async create(
    @Param('userId') userId: string,
    @Body() createPushTokenDto: CreatePushTokenDto,
    @Req() req: any,
  ) {
    const token = await this.pushTokensService.create(
      userId,
      createPushTokenDto,
      req.user.id,
    );
    return ResponseFormatter.success(token, 'Push token added successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all active push tokens for user' })
  @ApiResponse({
    status: 200,
    description: 'Push tokens retrieved successfully',
  })
  async findAll(@Param('userId') userId: string, @Req() req: any) {
    const tokens = await this.pushTokensService.findAll(userId, req.user.id);
    return ResponseFormatter.success(
      tokens,
      'Push tokens retrieved successfully',
    );
  }

  @Delete(':tokenId')
  @ApiOperation({ summary: 'Delete a push notification token' })
  @ApiResponse({
    status: 200,
    description: 'Push token deleted successfully',
  })
  async delete(
    @Param('userId') userId: string,
    @Param('tokenId') tokenId: string,
    @Req() req: any,
  ) {
    const result = await this.pushTokensService.delete(
      userId,
      tokenId,
      req.user.id,
    );
    return ResponseFormatter.success(result, 'Push token deleted successfully');
  }
}
