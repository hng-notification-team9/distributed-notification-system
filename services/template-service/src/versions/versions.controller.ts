import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { FilterVersionsDto } from './dto/filter-versions.dto';
import { ResponseFormatter } from '../common/interfaces/api-response.interface';

@ApiTags('Template Versions')
@ApiBearerAuth('JWT-auth')
@Controller('templates/:templateId/versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all versions of a template' })
  @ApiResponse({
    status: 200,
    description: 'Versions retrieved successfully',
  })
  async findAll(
    @Param('templateId') templateId: string,
    @Query() filterDto: FilterVersionsDto,
  ) {
    const result = await this.versionsService.findAll(templateId, filterDto);
    return ResponseFormatter.paginated(
      result.versions,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      'Versions retrieved successfully',
    );
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest version of a template' })
  @ApiResponse({
    status: 200,
    description: 'Latest version retrieved successfully',
  })
  async getLatest(@Param('templateId') templateId: string) {
    const version = await this.versionsService.getLatest(templateId);
    return ResponseFormatter.success(
      version,
      'Latest version retrieved successfully',
    );
  }

  @Get(':versionNumber')
  @ApiOperation({ summary: 'Get a specific version of a template' })
  @ApiResponse({
    status: 200,
    description: 'Version retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Version not found',
  })
  async findOne(
    @Param('templateId') templateId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    const version = await this.versionsService.findOne(
      templateId,
      versionNumber,
    );
    return ResponseFormatter.success(
      version,
      'Version retrieved successfully',
    );
  }

  @Get('compare/:version1/:version2')
  @ApiOperation({ summary: 'Compare two versions of a template' })
  @ApiResponse({
    status: 200,
    description: 'Versions compared successfully',
  })
  async compare(
    @Param('templateId') templateId: string,
    @Param('version1', ParseIntPipe) version1: number,
    @Param('version2', ParseIntPipe) version2: number,
  ) {
    const comparison = await this.versionsService.compare(
      templateId,
      version1,
      version2,
    );
    return ResponseFormatter.success(
      comparison,
      'Versions compared successfully',
    );
  }
}
