/**
 * OneForm API — Form Template Service
 * Manages form templates for government portals
 */
import { prisma } from '../lib/prisma.js';

/**
 * Create a new form template
 */
export async function createFormTemplate(data: {
  tenantId: string;
  portalName: string;
  portalUrl: string;
  description?: string;
  fieldMappings: Record<string, unknown>;
  costInPaisa: number;
  skyvern_script?: string;
}) {
  const template = await prisma.formTemplate.create({
    data: {
      tenant_id: data.tenantId,
      portal_name: data.portalName,
      portal_url: data.portalUrl,
      description: data.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      field_mappings: data.fieldMappings as any,
      cost_in_paisa: data.costInPaisa,
      skyvern_script: data.skyvern_script,
    },
  });

  return template;
}

/**
 * List form templates
 */
export async function listFormTemplates(tenantId: string, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [templates, total] = await Promise.all([
    prisma.formTemplate.findMany({
      where: { tenant_id: tenantId },
      skip,
      take: limit,
      select: {
        id: true,
        portal_name: true,
        portal_url: true,
        description: true,
        cost_in_paisa: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        portal_name: 'asc',
      },
    }),
    prisma.formTemplate.count({ where: { tenant_id: tenantId } }),
  ]);

  return {
    templates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get form template by ID
 */
export async function getFormTemplate(id: string, tenantId: string) {
  const template = await prisma.formTemplate.findFirst({
    where: {
      id,
      tenant_id: tenantId,
    },
  });

  if (!template) {
    throw new Error('Form template not found');
  }

  return template;
}

/**
 * Update form template
 */
export async function updateFormTemplate(
  id: string,
  tenantId: string,
  data: {
    portalName?: string;
    portalUrl?: string;
    description?: string;
    fieldMappings?: Record<string, unknown>;
    costInPaisa?: number;
    skyvern_script?: string;
  }
) {
  const template = await prisma.formTemplate.update({
    where: { id },
    data: {
      ...(data.portalName !== undefined && { portal_name: data.portalName }),
      ...(data.portalUrl !== undefined && { portal_url: data.portalUrl }),
      ...(data.description !== undefined && { description: data.description }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(data.fieldMappings !== undefined && { field_mappings: data.fieldMappings as any }),
      ...(data.costInPaisa !== undefined && { cost_in_paisa: data.costInPaisa }),
      ...(data.skyvern_script !== undefined && { skyvern_script: data.skyvern_script }),
    },
  });

  return template;
}

/**
 * Delete form template
 */
export async function deleteFormTemplate(id: string, tenantId: string) {
  await prisma.formTemplate.delete({
    where: {
      id,
      tenant_id: tenantId,
    },
  });

  return { success: true, message: 'Form template deleted' };
}
