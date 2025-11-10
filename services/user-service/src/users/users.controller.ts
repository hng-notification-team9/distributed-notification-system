import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { ResponseFormatter } from '../common/interfaces/api-response.interface';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.usersService.findAll(query);
    return ResponseFormatter.paginated(
      result.users,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      'Users retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return ResponseFormatter.success(user, 'User retrieved successfully');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    const user = await this.usersService.update(id, updateUserDto, req.user.id);
    return ResponseFormatter.success(user, 'User updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  async delete(@Param('id') id: string, @Req() req: any) {
    const result = await this.usersService.delete(id, req.user.id);
    return ResponseFormatter.success(result, 'User account deactivated');
  }
}
