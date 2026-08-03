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
  description: z.string().trim().nullable().default(null),
  imageurl: z.string().trim().nullable().default(null),
  criteria: z.string().trim().nullable().default(null),
  eventid: z.uuid().nullable().default(null),
  isactive: z.boolean().default(true),
});

// An EVENT badge is meaningless without the event it belongs to. Updates can't
// check this rule in isolation — a patch may change only `category` while
// `eventid` is already set on the row — so the authoritative check lives in the
// `badges_event_requires_eventid` constraint. This is just the early feedback.
const badgeInsertSchema = badgeFieldsSchema.refine(
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
