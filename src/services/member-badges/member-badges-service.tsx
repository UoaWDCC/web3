import { SupabaseClient } from "@supabase/supabase-js";

import {
  MemberBadge,
  MemberBadgeInsert,
  MemberBadgeWithBadge,
  memberBadgeInsertSchema,
} from "../../lib/schemas/member-badge";
import { getSupabase } from "../supabase";

const TABLE = "member_badges";

// Raised by Postgres when the unique(badgeid, memberid) constraint is violated.
const UNIQUE_VIOLATION = "23505";

// Pulls the parent badge in with the join row, via the badgeid foreign key.
const WITH_BADGE = "*, badge:badges(*)";

export default class MemberBadgesService {
  /**
   * @param client Supabase client to use. Defaults to the shared anon client.
   * @see BadgesService for why this is injectable.
   */
  constructor(private readonly client?: SupabaseClient) {}

  private get db(): SupabaseClient {
    return this.client ?? getSupabase();
  }

  /**
   * Awards a badge to a member. Idempotent: awarding a badge the member
   * already holds returns the existing row rather than throwing.
   * @param award The badge, member, and optionally the attendance that earned it.
   * @returns The member_badges row.
   */
  public async awardBadge(award: MemberBadgeInsert): Promise<MemberBadge> {
    const payload = memberBadgeInsertSchema.parse(award);

    const { data, error } = await this.db
      .from(TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        const existing = await this.getAward(payload.badgeid, payload.memberid);
        if (existing) return existing;
      }
      throw error;
    }

    return data as MemberBadge;
  }

  /**
   * Retrieves the award linking a badge to a member.
   * @returns The member_badges row, or `null` if the member doesn't hold the badge.
   */
  public async getAward(
    badgeId: string,
    memberId: string,
  ): Promise<MemberBadge | null> {
    const { data, error } = await this.db
      .from(TABLE)
      .select()
      .eq("badgeid", badgeId)
      .eq("memberid", memberId)
      .maybeSingle();

    if (error) throw error;
    return data as MemberBadge | null;
  }

  /**
   * Checks whether a member holds a badge.
   */
  public async hasBadge(badgeId: string, memberId: string): Promise<boolean> {
    return (await this.getAward(badgeId, memberId)) !== null;
  }

  /**
   * Retrieves every badge a member holds, with the badge details embedded.
   * @param memberId The public_profiles.id of the member.
   */
  public async getBadgesForMember(
    memberId: string,
  ): Promise<MemberBadgeWithBadge[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select(WITH_BADGE)
      .eq("memberid", memberId)
      .order("awardedat", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as MemberBadgeWithBadge[];
  }

  /**
   * Retrieves every award of a given badge, i.e. everyone who holds it.
   */
  public async getMembersWithBadge(badgeId: string): Promise<MemberBadge[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select()
      .eq("badgeid", badgeId)
      .order("awardedat", { ascending: false });

    if (error) throw error;
    return (data ?? []) as MemberBadge[];
  }

  /**
   * Takes a badge away from a member by deleting the join row. Deleting a badge
   * the member doesn't hold is a no-op.
   *
   * This is a hard delete — the table's `revokedat`/`revokedby` columns are
   * deliberately unused until the admin model exists to populate them.
   */
  public async revokeBadge(badgeId: string, memberId: string): Promise<void> {
    const { error } = await this.db
      .from(TABLE)
      .delete()
      .eq("badgeid", badgeId)
      .eq("memberid", memberId);

    if (error) throw error;
  }

  /**
   * Deletes a member_badges row by its own ID.
   */
  public async revokeAwardById(id: string): Promise<void> {
    const { error } = await this.db.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  }
}
