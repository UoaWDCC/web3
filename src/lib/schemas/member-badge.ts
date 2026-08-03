import { z } from "zod";

import { badgeSchema } from "./badge";

// As with `badge.ts`, field names mirror the `member_badges` columns verbatim.
// memberid is a uuid referencing public_profiles(id), via the existing
// member_badges_memberid_fkey. Note it is *not* registrations.id, which is a
// bigint — these are two different notions of "member".
const memberBadgeFieldsSchema = z.object({
  badgeid: z.uuid(),
  memberid: z.uuid(),
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
