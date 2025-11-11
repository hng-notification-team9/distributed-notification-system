import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { FilterTemplatesDto } from './dto/filter-templates.dto';
import { RenderTemplateDto } from './dto/render-template.dto';
import { ResponseFormatter } from '../common/interfaces/api-response.interface';

@ApiTags('Templates')
@ApiBearerAuth('JWT-auth')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Template with this name already exists',
  })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    const template = await this.templatesService.create(createTemplateDto);
    return ResponseFormatter.success(template, 'Template created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates (with filters)' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  async findAll(@Query() filterDto: FilterTemplatesDto) {
    const result = await this.templatesService.findAll(filterDto);
    return ResponseFormatter.paginated(
      result.templates,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      'Templates retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async findOne(@Param('id') id: string) {
    const template = await this.templatesService.findOne(id);
    return ResponseFormatter.success(
      template,
      'Template retrieved successfully',
    );
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Get template by name' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async findByName(@Param('name') name: string) {
    const template = await this.templatesService.findByName(name);
    return ResponseFormatter.success(
      template,
      'Template retrieved successfully',
    );
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Render template with variables' })
  @ApiResponse({
    status: 200,
    description: 'Template rendered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required variables',
  })
  async render(
    @Param('id') id: string,
    @Body() renderDto: RenderTemplateDto,
  ) {
    const rendered = await this.templatesService.render(id, renderDto);
    return ResponseFormatter.success(
      rendered,
      'Template rendered successfully',
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    const template = await this.templatesService.update(id, updateTemplateDto);
    return ResponseFormatter.success(template, 'Template updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({
    status: 200,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async delete(@Param('id') id: string) {
    const result = await this.templatesService.delete(id);
    return ResponseFormatter.success(result, 'Template deleted successfully');
  }
}
