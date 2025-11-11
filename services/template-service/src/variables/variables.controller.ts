import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VariablesService } from './variables.service';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { ResponseFormatter } from '../common/interfaces/api-response.interface';

@ApiTags('Template Variables')
@ApiBearerAuth('JWT-auth')
@Controller('templates/:templateId/variables')
export class VariablesController {
  constructor(private readonly variablesService: VariablesService) {}

  @Post()
  @ApiOperation({ summary: 'Add a variable to a template' })
  @ApiResponse({
    status: 201,
    description: 'Variable added successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Variable already exists',
  })
  async create(
    @Param('templateId') templateId: string,
    @Body() createVariableDto: CreateVariableDto,
  ) {
    const variable = await this.variablesService.create(
      templateId,
      createVariableDto,
    );
    return ResponseFormatter.success(variable, 'Variable added successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all variables for a template' })
  @ApiResponse({
    status: 200,
    description: 'Variables retrieved successfully',
  })
  async findAll(@Param('templateId') templateId: string) {
    const variables = await this.variablesService.findAll(templateId);
    return ResponseFormatter.success(
      variables,
      'Variables retrieved successfully',
    );
  }

  @Get(':variableId')
  @ApiOperation({ summary: 'Get a specific variable' })
  @ApiResponse({
    status: 200,
    description: 'Variable retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Variable not found',
  })
  async findOne(
    @Param('templateId') templateId: string,
    @Param('variableId') variableId: string,
  ) {
    const variable = await this.variablesService.findOne(
      templateId,
      variableId,
    );
    return ResponseFormatter.success(
      variable,
      'Variable retrieved successfully',
    );
  }

  @Put(':variableId')
  @ApiOperation({ summary: 'Update a variable' })
  @ApiResponse({
    status: 200,
    description: 'Variable updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Variable not found',
  })
  async update(
    @Param('templateId') templateId: string,
    @Param('variableId') variableId: string,
    @Body() updateVariableDto: UpdateVariableDto,
  ) {
    const variable = await this.variablesService.update(
      templateId,
      variableId,
      updateVariableDto,
    );
    return ResponseFormatter.success(variable, 'Variable updated successfully');
  }

  @Delete(':variableId')
  @ApiOperation({ summary: 'Delete a variable' })
  @ApiResponse({
    status: 200,
    description: 'Variable deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Variable not found',
  })
  async delete(
    @Param('templateId') templateId: string,
    @Param('variableId') variableId: string,
  ) {
    const result = await this.variablesService.delete(templateId, variableId);
    return ResponseFormatter.success(result, 'Variable deleted successfully');
  }
}
