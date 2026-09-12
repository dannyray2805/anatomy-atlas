import { z } from "zod";

export const AnatomyLayerSchema = z.enum([
  "skin",
  "fascia",
  "muscle",
  "skeleton",
  "joint",
  "organ",
  "vessel",
  "nerve",
  "lymphatic",
  "tissue",
  "unknown",
]);
export type AnatomyLayer = z.infer<typeof AnatomyLayerSchema>;

export const StructureSourceSchema = z.object({
  source_id: z.string().min(1),
  asset: z.string().min(1),
  note: z.string().min(1),
});
export type StructureSource = z.infer<typeof StructureSourceSchema>;

export const StructureSchema = z
  .object({
    id: z.string().min(1),
    uberon: z.string().nullable(),
    fma: z.string().nullable(),
    label: z.string().min(1),
    layer: AnatomyLayerSchema,
    part_of: z.string().nullable(),
    sources: z.array(StructureSourceSchema),
    voxel_size_um: z.number().nullable(),
    hoa_dataset_doi: z.string().nullable(),
    facts_id: z.string().nullable(),
    reviewed: z.boolean(),
    mesh_names: z.array(z.string().min(1)).optional(),
  })
  .superRefine((s, ctx) => {
    if (s.reviewed && s.sources.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: `${s.id}: reviewed structures need sources`,
      });
    }
    if (s.layer === "tissue") {
      if (!s.hoa_dataset_doi) {
        ctx.addIssue({
          code: "custom",
          path: ["hoa_dataset_doi"],
          message: `${s.id}: tissue needs hoa_dataset_doi`,
        });
      }
      if (s.voxel_size_um == null) {
        ctx.addIssue({
          code: "custom",
          path: ["voxel_size_um"],
          message: `${s.id}: tissue needs voxel_size_um`,
        });
      }
    }
  });
export type Structure = z.infer<typeof StructureSchema>;

export const FactCardFrontmatterSchema = z.object({
  id: z.string().min(1),
  uberon: z.string().nullable(),
  reviewed: z.boolean(),
  reviewer: z.string().nullable(),
  date: z.string().nullable(),
  citations: z.array(z.string().min(1)).min(1),
});
export type FactCardFrontmatter = z.infer<typeof FactCardFrontmatterSchema>;

/** Validate an unknown value against StructureSchema; returns human-readable messages. */
export function structureErrors(value: unknown): string[] {
  const result = StructureSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

/** Thin wrapper over structureErrors kept for existing callers. */
export function assertStructure(value: Structure): string[] {
  return structureErrors(value);
}
