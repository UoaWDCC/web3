import { SupabaseClient } from "@supabase/supabase-js";

import {
  Badge,
  BadgeInsert,
  BadgeUpdate,
  badgeInsertSchema,
  badgeUpdateSchema,
} from "../../lib/schemas/badge";
import { getSupabase } from "../supabase";

const TABLE = "badges";

/** Drops keys the caller left undefined so a patch never clears a column by accident. */
function definedFields<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export default class BadgesService {
  /**
   * @param client Supabase client to use. Defaults to the shared anon client.
   * Injecting one lets unit tests pass a stub, and lets the integration tests
   * pass a service-role client that can write past RLS.
   */
  constructor(private readonly client?: SupabaseClient) {}

  private get db(): SupabaseClient {
    return this.client ?? getSupabase();
  }

  /**
   * Creates a new {@link Badge} in the database.
   * @param badge The badge to create. `id` and `created_at` are set by the database.
   * @returns The created badge.
   */
  public async createBadge(badge: BadgeInsert): Promise<Badge> {
    const payload = badgeInsertSchema.parse(badge);

    const { data, error } = await this.db
      .from(TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Badge;
  }

  /**
   * Retrieves a {@link Badge} by its ID.
   * @param id The ID of the badge to retrieve.
   * @returns The matching badge, or `null` if no badge has that ID.
   */
  public async getBadgeById(id: string): Promise<Badge | null> {
    const { data, error } = await this.db
      .from(TABLE)
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as Badge | null;
  }

  /**
   * Retrieves all {@link Badge}s from the database.
   * @returns An array of all badges, newest first.
   */
  public async getAllBadges(): Promise<Badge[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select()
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Badge[];
  }

  /**
   * Retrieves all {@link Badge}s with the given name.
   * @param name The exact name to match.
   * @returns An array of badges with that name.
   */
  public async getAllBadgesByName(name: string): Promise<Badge[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select()
      .eq("name", name.trim());

    if (error) throw error;
    return (data ?? []) as Badge[];
  }

  /**
   * Updates a {@link Badge} by its ID.
   * @param id The ID of the badge to update.
   * @param patch The fields to change. Omitted fields are left untouched.
   * @returns The updated badge.
   */
  public async updateBadgeById(id: string, patch: BadgeUpdate): Promise<Badge> {
    const payload = definedFields(badgeUpdateSchema.parse(patch));

    if (Object.keys(payload).length === 0) {
      throw new Error("updateBadgeById was called with no fields to update");
    }

    const { data, error } = await this.db
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Badge;
  }

  /**
   * Deletes a {@link Badge} by its ID. Any member_badges rows referencing it
   * are removed too, via the foreign key's ON DELETE CASCADE.
   * @param id The ID of the badge to delete.
   */
  public async deleteBadgeById(id: string): Promise<void> {
    const { error } = await this.db.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  }
}
