import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';

@Injectable()
export class VariablesService {
  constructor(private prisma: PrismaService) {}

  async create(templateId: string, createVariableDto: CreateVariableDto) {
    // Check if template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    // Check if variable already exists for this template
    const existingVariable = await this.prisma.templateVariable.findUnique({
      where: {
        template_id_variable_key: {
          template_id: templateId,
          variable_key: createVariableDto.variable_key,
        },
      },
    });

    if (existingVariable) {
      throw new ConflictException(
        `Variable '${createVariableDto.variable_key}' already exists for this template`,
      );
    }

    const variable = await this.prisma.templateVariable.create({
      data: {
        template_id: templateId,
        ...createVariableDto,
      },
    });

    return variable;
  }

  async findAll(templateId: string) {
    // Check if template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    const variables = await this.prisma.templateVariable.findMany({
      where: { template_id: templateId },
      orderBy: { created_at: 'asc' },
    });

    return variables;
  }

  async findOne(templateId: string, variableId: string) {
    const variable = await this.prisma.templateVariable.findFirst({
      where: {
        id: variableId,
        template_id: templateId,
      },
    });

    if (!variable) {
      throw new NotFoundException(
        `Variable with ID ${variableId} not found for this template`,
      );
    }

    return variable;
  }

  async update(
    templateId: string,
    variableId: string,
    updateVariableDto: UpdateVariableDto,
  ) {
    // Check if variable exists
    await this.findOne(templateId, variableId);

    const variable = await this.prisma.templateVariable.update({
      where: { id: variableId },
      data: updateVariableDto,
    });

    return variable;
  }

  async delete(templateId: string, variableId: string) {
    // Check if variable exists
    await this.findOne(templateId, variableId);

    await this.prisma.templateVariable.delete({
      where: { id: variableId },
    });

    return { message: 'Variable deleted successfully' };
  }
}
