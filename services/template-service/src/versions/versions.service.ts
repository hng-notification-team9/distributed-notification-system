import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterVersionsDto } from './dto/filter-versions.dto';

@Injectable()
export class VersionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(templateId: string, filterDto: FilterVersionsDto) {
    // Check if template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    const { page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      this.prisma.templateVersion.findMany({
        where: { template_id: templateId },
        skip,
        take: limit,
        orderBy: { version: 'desc' },
      }),
      this.prisma.templateVersion.count({
        where: { template_id: templateId },
      }),
    ]);

    return {
      versions,
      pagination: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(templateId: string, versionNumber: number) {
    // Check if template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    const version = await this.prisma.templateVersion.findUnique({
      where: {
        template_id_version: {
          template_id: templateId,
          version: versionNumber,
        },
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Version ${versionNumber} not found for template ${templateId}`,
      );
    }

    return version;
  }

  async getLatest(templateId: string) {
    // Check if template exists
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    const version = await this.prisma.templateVersion.findFirst({
      where: { template_id: templateId },
      orderBy: { version: 'desc' },
    });

    if (!version) {
      throw new NotFoundException(
        `No versions found for template ${templateId}`,
      );
    }

    return version;
  }

  async compare(templateId: string, version1: number, version2: number) {
    const [v1, v2] = await Promise.all([
      this.findOne(templateId, version1),
      this.findOne(templateId, version2),
    ]);

    return {
      version_1: {
        version: v1.version,
        subject: v1.subject,
        body: v1.body,
        created_at: v1.created_at,
      },
      version_2: {
        version: v2.version,
        subject: v2.subject,
        body: v2.body,
        created_at: v2.created_at,
      },
      differences: {
        subject_changed: v1.subject !== v2.subject,
        body_changed: v1.body !== v2.body,
      },
    };
  }
}
