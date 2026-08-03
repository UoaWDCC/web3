import { Badge } from "../../lib/schemas/badge";
import { getSupabase } from "../supabase";

export default class BadgesService {
  /**
   * Creates a new {@link Badge} in the database.
   * @param badge The badge to create.
   * @returns The created badge.
   */
  public async createBadge(badge: Badge): Promise<Badge> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("badges")
      .insert([badge])
      .select();
    if (error) throw error;
    return data[0];
  }

  /**
   * Retrieves a {@link Badge} by its ID.
   * @param id The ID of the badge to retrieve.
   * @returns The badge with the specified ID.
   */
  public async getBadgeById(id: string): Promise<Badge> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from("badges").select().eq("id", id);
    if (error) throw error;
    return data[0];
  }

  /**
   * Retrieves all {@link Badge}s from the database.
   * @returns An array of all badges.
   */
  public async getAllBadges(): Promise<Badge[]> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from("badges").select();
    if (error) throw error;
    return data;
  }

  /**
   * Retrieves all {@link Badge}s by their name.
   * @param name The name of the badges to retrieve.
   * @returns An array of {@link Badge} with the specified name.
   */
  public async getAllBadgesByName(name: string): Promise<Badge[]> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("badges")
      .select()
      .eq("name", name);
    if (error) throw error;
    return data;
  }

  /**
   * Deletes a {@link Badge} by its ID.
   * @param id The ID of the badge to delete.
   */
  public async deleteBadgeById(id: string): Promise<void> {
    const supabase = await getSupabase();
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) throw error;
  }
}
