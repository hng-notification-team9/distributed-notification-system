import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { FilterTemplatesDto } from './dto/filter-templates.dto';
import { RenderTemplateDto } from './dto/render-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(createTemplateDto: CreateTemplateDto) {
    const { name, type, subject, body, language, is_active } =
      createTemplateDto;

    // Validate email template has subject
    if (type === 'email' && !subject) {
      throw new BadRequestException('Email templates must have a subject');
    }

    // Check if template name already exists
    const existingTemplate = await this.prisma.template.findUnique({
      where: { name },
    });

    if (existingTemplate) {
      throw new ConflictException('Template with this name already exists');
    }

    // Extract variables from template body and subject
    const variables = this.extractVariables(body, subject);

    // Create template with initial version
    const template = await this.prisma.$transaction(async (prisma) => {
      const newTemplate = await prisma.template.create({
        data: {
          name,
          type,
          subject,
          body,
          language: language || 'en',
          is_active: is_active !== undefined ? is_active : true,
        },
        include: {
          variables: true,
        },
      });

      // Create initial version
      await prisma.templateVersion.create({
        data: {
          template_id: newTemplate.id,
          version: 1,
          subject: subject || null,
          body,
          change_note: 'Initial version',
        },
      });

      // Create template variables
      if (variables.length > 0) {
        await prisma.templateVariable.createMany({
          data: variables.map((varKey) => ({
            template_id: newTemplate.id,
            variable_key: varKey,
            is_required: true,
          })),
        });
      }

      return prisma.template.findUnique({
        where: { id: newTemplate.id },
        include: {
          variables: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });
    });

    return template;
  }

  async findAll(filterDto: FilterTemplatesDto) {
    const { type, language, is_active, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (language) where.language = language;
    if (is_active !== undefined) where.is_active = is_active;

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        include: {
          variables: true,
          _count: {
            select: { versions: true },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      templates,
      pagination: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: {
        variables: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async findByName(name: string) {
    const template = await this.prisma.template.findUnique({
      where: { name },
      include: {
        variables: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with name ${name} not found`);
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    const { subject, body, is_active } = updateTemplateDto;

    // If body is being updated, create new version
    if (body) {
      const newVariables = this.extractVariables(body, subject);

      return this.prisma.$transaction(async (prisma) => {
        // Get latest version number
        const latestVersion = await prisma.templateVersion.findFirst({
          where: { template_id: id },
          orderBy: { version: 'desc' },
        });

        const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

        // Create new version
        await prisma.templateVersion.create({
          data: {
            template_id: id,
            version: nextVersion,
            subject: subject || template.subject,
            body,
            change_note: `Updated to version ${nextVersion}`,
          },
        });

        // Update template
        const updatedTemplate = await prisma.template.update({
          where: { id },
          data: {
            subject: subject !== undefined ? subject : template.subject,
            body,
            is_active: is_active !== undefined ? is_active : template.is_active,
          },
        });

        // Update variables
        if (newVariables.length > 0) {
          await prisma.templateVariable.deleteMany({
            where: { template_id: id },
          });

          await prisma.templateVariable.createMany({
            data: newVariables.map((varKey) => ({
              template_id: id,
              variable_key: varKey,
              is_required: true,
            })),
          });
        }

        return prisma.template.findUnique({
          where: { id },
          include: {
            variables: true,
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        });
      });
    }

    // If only updating active status or subject
    const updatedTemplate = await this.prisma.template.update({
      where: { id },
      data: updateTemplateDto,
      include: {
        variables: true,
      },
    });

    return updatedTemplate;
  }

  async delete(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    await this.prisma.template.delete({
      where: { id },
    });

    return { message: 'Template deleted successfully' };
  }

  async render(id: string, renderDto: RenderTemplateDto) {
    const template = await this.findOne(id);

    if (!template.is_active) {
      throw new BadRequestException('Template is not active');
    }

    const { variables } = renderDto;

    // Check if all required variables are provided
    const requiredVars = template.variables
      .filter((v) => v.is_required)
      .map((v) => v.variable_key);

    const missingVars = requiredVars.filter((key) => !(key in variables));

    if (missingVars.length > 0) {
      throw new BadRequestException(
        `Missing required variables: ${missingVars.join(', ')}`,
      );
    }

    // Render template
    let renderedSubject = template.subject || '';
    let renderedBody = template.body;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedSubject = renderedSubject.replace(regex, variables[key]);
      renderedBody = renderedBody.replace(regex, variables[key]);
    });

    return {
      template_id: template.id,
      template_name: template.name,
      type: template.type,
      subject: template.type === 'email' ? renderedSubject : null,
      body: renderedBody,
      language: template.language,
    };
  }

  private extractVariables(body: string, subject?: string): string[] {
    const regex = /{{(\w+)}}/g;
    const variables = new Set<string>();

    let match;
    while ((match = regex.exec(body)) !== null) {
      variables.add(match[1]);
    }

    if (subject) {
      regex.lastIndex = 0;
      while ((match = regex.exec(subject)) !== null) {
        variables.add(match[1]);
      }
    }

    return Array.from(variables);
  }
}
