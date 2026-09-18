import { z } from "zod";

import { badgeSchema } from "./badge";

// As with `badge.ts`, field names mirror the `member_badges` columns verbatim.
// memberid is an int8 referencing registrations(id), via the existing
// member_badges_memberid_fkey. It is deliberately *not* public_profiles.id:
// that row is deleted when a member hides their profile, which would take
// their badges with it, whereas the registration outlives visibility changes.
const memberBadgeFieldsSchema = z.object({
  badgeid: z.uuid(),
  memberid: z.number().int().positive(),
  attendanceid: z.uuid().nullable().default(null),
});

const memberBadgeInsertSchema = memberBadgeFieldsSchema;

const memberBadgeSchema = memberBadgeFieldsSchema.extend({
  id: z.uuid(),
  awardedat: z.string(),
});

// Returned by the queries that embed the badge via PostgREST's foreign-key
// join, so callers get the badge's name and image without a second round trip.
const memberBadgeWithBadgeSchema = memberBadgeSchema.extend({
  badge: badgeSchema,
});

/** A member_badges row as it comes back from the database. */
export type MemberBadge = z.infer<typeof memberBadgeSchema>;
/** A member_badges row with its parent badge embedded. */
export type MemberBadgeWithBadge = z.infer<typeof memberBadgeWithBadgeSchema>;
/** The payload accepted by `awardBadge`. */
export type MemberBadgeInsert = z.input<typeof memberBadgeInsertSchema>;

export {
  memberBadgeSchema,
  memberBadgeInsertSchema,
  memberBadgeWithBadgeSchema,
};
