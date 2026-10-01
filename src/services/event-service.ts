import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "./supabase";
import BadgesService from "./badges/badges-service";
import type { ClubEvent } from "../lib/events";
import type { Badge, EventBadge } from "../lib/schemas/badge";

const EVENT_IMAGE_BUCKET = "events";
const EVENT_IMAGE_FOLDER = "events";

/** What {@link EventService.saveEventWithBadge} needs, already validated. */
export type SaveEventWithBadgeInput = {
  /**
   * Event columns. With an `id` the event is updated, and any column left
   * out keeps its current value; without one, a new event is created.
   */
  event: Partial<ClubEvent>;
  /** Create or update the event's badge. Omit to leave it as it is. */
  badge?: EventBadge | null;
  /** Detach the event's current badge without deleting it. */
  unlinkBadge?: boolean;
  /** A new event image, replacing any current one. */
  eventImage?: File | null;
  /** A new badge image, replacing any current one. Requires `badge`. */
  badgeImage?: File | null;
};

/** The jsonb returned by the save_event_with_badge database function. */
type SaveEventWithBadgeResult = {
  event: ClubEvent;
  badge: Badge | null;
  replaced_event_path: string | null;
  replaced_badge_imageurl: string | null;
};

/**
 * Runs storage cleanups without letting a failure escape: by the time they
 * run, the outcome of the save is already decided, and a leftover file is
 * better than reporting a save that succeeded as failed (or masking the error
 * that made it fail).
 */
async function cleanUpQuietly(
  cleanups: Array<() => Promise<void>>,
  context: string,
) {
  const results = await Promise.allSettled(cleanups.map((cleanup) => cleanup()));
  for (const result of results) {
    if (result.status === "rejected") console.error(context, result.reason);
  }
}

export const EventService = {
  /** Public read used by the events page. Relies on anon SELECT being allowed. */
  listEvents: async (): Promise<ClubEvent[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as ClubEvent[];
  },

  getEventById: async (id: string): Promise<ClubEvent | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as ClubEvent | null) ?? null;
  },

  getEventImagePath: (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension) {
      throw new Error("Event image must have a file extension.");
    }

    return `${EVENT_IMAGE_FOLDER}/${crypto.randomUUID()}.${fileExtension}`;
  },

  /**
   * @param client Supabase client to use. Defaults to the shared anon client;
   * server routes pass the service-role client.
   */
  uploadEventImage: async (
    file: File,
    client: SupabaseClient = getSupabase(),
  ) => {
    const imagePath = EventService.getEventImagePath(file);

    const { error } = await client.storage
      .from(EVENT_IMAGE_BUCKET)
      .upload(imagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw error;
    }

    const { data } = client.storage
      .from(EVENT_IMAGE_BUCKET)
      .getPublicUrl(imagePath);

    return {
      imagePath,
      imageUrl: data.publicUrl,
    };
  },

  /**
   * Deletes an event image from storage.
   * @param imagePath The storage path, as stored in `events.event_path`.
   * @param client Supabase client to use. Defaults to the shared anon client.
   */
  deleteEventImage: async (
    imagePath: string,
    client: SupabaseClient = getSupabase(),
  ) => {
    const { error } = await client.storage
      .from(EVENT_IMAGE_BUCKET)
      .remove([imagePath]);

    if (error) {
      throw error;
    }
  },

  /**
   * Creates or updates an event and, optionally, its badge, all or nothing.
   *
   * Images are uploaded first, since the rows store their URLs. If anything
   * after that fails, the files uploaded here are deleted again, so a failed
   * save leaves nothing behind. After a successful save, any image this save
   * replaced is deleted too.
   *
   * @param client A client allowed to call save_event_with_badge, i.e. the
   * service-role client. The function is not executable by anon.
   */
  saveEventWithBadge: async (
    client: SupabaseClient,
    {
      event,
      badge = null,
      unlinkBadge = false,
      eventImage = null,
      badgeImage = null,
    }: SaveEventWithBadgeInput,
  ): Promise<{ event: ClubEvent; badge: Badge | null }> => {
    if (badgeImage && !badge) {
      throw new Error("A badge image was given without a badge.");
    }

    const badges = new BadgesService(client);
    const eventPayload: Record<string, unknown> = { ...event };
    const badgePayload: Record<string, unknown> | null = badge
      ? { ...badge }
      : null;
    const uploadedCleanups: Array<() => Promise<void>> = [];

    let result: SaveEventWithBadgeResult;

    try {
      if (eventImage) {
        const uploaded = await EventService.uploadEventImage(eventImage, client);
        uploadedCleanups.push(() =>
          EventService.deleteEventImage(uploaded.imagePath, client),
        );
        eventPayload.event_path = uploaded.imagePath;
        eventPayload.event_url = uploaded.imageUrl;
      }

      if (badgeImage && badgePayload) {
        const uploaded = await badges.uploadBadgeImage(badgeImage);
        uploadedCleanups.push(() => badges.deleteBadgeImage(uploaded.imagePath));
        badgePayload.imageurl = uploaded.imageUrl;
      }

      const { data, error } = await client.rpc("save_event_with_badge", {
        p_event: eventPayload,
        p_badge: badgePayload,
        p_unlink_badge: unlinkBadge,
      });

      if (error) throw error;
      result = data as SaveEventWithBadgeResult;
    } catch (error) {
      await cleanUpQuietly(
        uploadedCleanups,
        "Failed to delete an image uploaded for an event save that failed",
      );
      throw error;
    }

    const replacedCleanups: Array<() => Promise<void>> = [];

    // Only delete paths inside the folder uploads go to, in case an older row
    // points somewhere else in the bucket.
    const replacedEventPath = result.replaced_event_path;
    if (replacedEventPath?.startsWith(`${EVENT_IMAGE_FOLDER}/`)) {
      replacedCleanups.push(() =>
        EventService.deleteEventImage(replacedEventPath, client),
      );
    }

    const replacedBadgePath = badges.getBadgeImagePath(
      result.replaced_badge_imageurl,
    );
    if (replacedBadgePath) {
      replacedCleanups.push(() => badges.deleteBadgeImage(replacedBadgePath));
    }

    await cleanUpQuietly(
      replacedCleanups,
      "Failed to delete an image replaced by an event save",
    );

    return { event: result.event, badge: result.badge };
  },
};
