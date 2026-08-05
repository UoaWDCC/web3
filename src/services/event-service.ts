import { getSupabase } from "@/services/supabase";

const EVENT_IMAGE_BUCKET = "events";
const EVENT_IMAGE_FOLDER = "events";

export const EventService = {
  getEventImagePath: (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension) {
      throw new Error("Event image must have a file extension.");
    }

    return `${EVENT_IMAGE_FOLDER}/${crypto.randomUUID()}.${fileExtension}`;
  },

  uploadEventImage: async (file: File) => {
    const supabase = getSupabase();
    const imagePath = EventService.getEventImagePath(file);

    const { error } = await supabase.storage
      .from(EVENT_IMAGE_BUCKET)
      .upload(imagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from(EVENT_IMAGE_BUCKET)
      .getPublicUrl(imagePath);

    return {
      imagePath,
      imageUrl: data.publicUrl,
    };
  },
};
