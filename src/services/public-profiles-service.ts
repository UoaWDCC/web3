import { getSupabase } from "./supabase";

export type PublicProfile = {
  id: string;
  display_name: string;
  unique_name: string | null;
  profile_picture_url: string | null;
  wallet_suffix: string | null;
  badges: string[];
  events_attended: string[];
  created_at: string;
  updated_at: string;
};

export type PublicProfileSearchResult = Omit<
  PublicProfile,
  "created_at" | "updated_at"
> & {
  match_score: number;
};

const PUBLIC_PROFILE_COLUMNS = [
  "id",
  "display_name",
  "unique_name",
  "profile_picture_url",
  "wallet_suffix",
  "badges",
  "events_attended",
  "created_at",
  "updated_at",
].join(",");

export const PublicProfilesService = {
  search: async (
    query: string,
    maxResults = 8,
  ): Promise<PublicProfileSearchResult[]> => {
    const cleanQuery = query.trim().replace(/\s+/g, " ");

    if (cleanQuery.length < 2 || cleanQuery.length > 64) {
      return [];
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("search_public_profiles", {
      search_query: cleanQuery,
      max_results: Math.min(Math.max(maxResults, 1), 8),
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as PublicProfileSearchResult[];
  },

  getById: async (profileId: string): Promise<PublicProfile | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("public_profiles")
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as PublicProfile | null;
  },
};
