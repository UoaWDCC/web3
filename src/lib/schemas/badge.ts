import { z } from "zod";

/** Values of the `badge_enum` Postgres type. */
export enum BadgeType {
  Event = "EVENT",
  Achievement = "ACHIEVEMENT",
  Special = "SPECIAL",
}

// Field names match the Supabase column names exactly (`imageurl`, `eventid`,
// `isactive`). PostgREST matches JSON keys to columns case-sensitively, so a
// camelCase `imageUrl` is rejected as an unknown column.
const badgeFieldsSchema = z.object({
  name: z.string().trim().min(1, "Badge name is required"),
  category: z.nativeEnum(BadgeType),
  description: z.string().trim().nullable(),
  imageurl: z.string().trim().nullable(),
  criteria: z.string().trim().nullable(),
  eventid: z.uuid().nullable(),
  isactive: z.boolean(),
});

// Defaults are layered on here rather than declared on the shared field schema,
// because `.partial()` makes a key optional but still applies its default — so
// a default on `badgeFieldsSchema` would leak into `badgeUpdateSchema` and make
// every patch silently overwrite the columns the caller never mentioned.
//
// The EVENT rule is early feedback only. A partial update can't check it in
// isolation, since a patch may change `category` alone while `eventid` is
// already set on the row, so the database constraint is the real guarantee.
const badgeInsertSchema = badgeFieldsSchema
  .extend({
    description: badgeFieldsSchema.shape.description.default(null),
    imageurl: badgeFieldsSchema.shape.imageurl.default(null),
    criteria: badgeFieldsSchema.shape.criteria.default(null),
    eventid: badgeFieldsSchema.shape.eventid.default(null),
    isactive: badgeFieldsSchema.shape.isactive.default(true),
  })
  .refine(
    (badge) => badge.category !== BadgeType.Event || badge.eventid !== null,
    { path: ["eventid"], message: "An EVENT badge must reference an event" },
  );

const badgeUpdateSchema = badgeFieldsSchema.partial();

const badgeSchema = badgeFieldsSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
});

/** A badge row as it comes back from the database. */
export type Badge = z.infer<typeof badgeSchema>;
/** The payload accepted by `createBadge` — defaulted fields may be omitted. */
export type BadgeInsert = z.input<typeof badgeInsertSchema>;
/** A partial patch accepted by `updateBadgeById`. */
export type BadgeUpdate = z.input<typeof badgeUpdateSchema>;

export { badgeSchema, badgeInsertSchema, badgeUpdateSchema };
