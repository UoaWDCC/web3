import { z } from "zod";

export enum BadgeType {
  Event = "EVENT",
  Achievement = "ACHIEVEMENT",
  Special = "SPECIAL",
}

const badgeSchema = z.object({
  name: z.string(),
  category: z.nativeEnum(BadgeType),
  description: z.string(),
  imageUrl: z.string(),
  criteria: z.string(),
  eventid: z.int(), // check wether this event id is present
  isactive: z.boolean(),
});

export type Badge = z.infer<typeof badgeSchema>;
export { badgeSchema };
