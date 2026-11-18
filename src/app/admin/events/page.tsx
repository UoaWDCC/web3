"use client";

import { useState } from "react";
import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/admin/section-card";
import {
  AdminField,
  adminButtonClass,
  adminInputClass,
} from "@/components/admin/admin-field";
import { useAdmin } from "@/components/admin/use-admin";
import { normalizeRegistrationUrl } from "@/lib/events";

const formatDateString = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "N/A";

/**
 * Formats a stored timestamp for a `datetime-local` input, which expects the
 * browser's local time. Saving parses the input as local time too, so editing
 * an event round-trips without shifting it by the UTC offset.
 */
const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export default function AdminEventsPage() {
  const { events, loading, fetchData, adminFetch } = useAdmin();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [assignedEmailsText, setAssignedEmailsText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  /** Clears every event field and leaves edit mode. Backs the Reset button. */
  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setRegistrationUrl("");
    setStartTime("");
    setEndTime("");
    setAssignedEmailsText("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUrl(null);
    setImageError(null);
  };

  const uploadImage = async (): Promise<{
    event_path: string;
    event_url: string;
  } | null> => {
    if (!imageFile) return null;
    setImageError(null);
    setImageUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await adminFetch("/api/admin/events/image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to upload image");
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setImageError(message || "Image upload failed");
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const createEvent = async () => {
    try {
      if (!title.trim() || !startTime || !endTime) {
        throw new Error("Title, start time and end time are required");
      }
      if (new Date(endTime) <= new Date(startTime)) {
        throw new Error("End time must be after start time");
      }
      const normalizedRegistrationUrl =
        normalizeRegistrationUrl(registrationUrl);

      let uploadedImage: { event_path: string; event_url: string } | null =
        null;
      if (imageFile) {
        uploadedImage = await uploadImage();
        if (!uploadedImage) {
          throw new Error("Unable to upload image before saving event");
        }
      }

      const payload: Record<string, unknown> = {
        title,
        description,
        location: location.trim() || null,
        registration_url: normalizedRegistrationUrl,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        event_url: uploadedImage?.event_url ?? imageUrl,
        event_path: uploadedImage?.event_path ?? undefined,
      };

      if (editingId) payload.id = editingId;

      const assigned = assignedEmailsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (assigned.length) payload.assignedEmails = assigned;

      const res = await adminFetch("/api/admin/events", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create event");
      }

      const wasEditing = Boolean(editingId);
      resetForm();

      fetchData();
      alert(wasEditing ? "Event saved" : "Event created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || "Failed to create event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const res = await adminFetch("/api/admin/events", {
        method: "DELETE",
        body: JSON.stringify({ id: eventId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to delete event");
      }

      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || "Failed to delete event");
    }
  };

  return (
    <SectionCard title={editingId ? "Edit Event" : "Create Event"}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: text and meta */}
        <div className="flex flex-col gap-4">
          <AdminField label="Title">
            <input
              className={adminInputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </AdminField>

          <AdminField label="Description">
            <textarea
              rows={6}
              className={`${adminInputClass} resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </AdminField>

          <AdminField label="Location">
            <input
              className={adminInputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Sir Owen G Glenn Building"
            />
          </AdminField>

          <AdminField label="Luma Registration Link">
            <input
              type="url"
              className={adminInputClass}
              value={registrationUrl}
              onChange={(e) => setRegistrationUrl(e.target.value)}
              placeholder="https://lu.ma/..."
            />
          </AdminField>

          <AdminField label="Assigned Emails (comma separated)">
            <input
              className={adminInputClass}
              value={assignedEmailsText}
              onChange={(e) => setAssignedEmailsText(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
            />
          </AdminField>
        </div>

        {/* Right column: times and media */}
        <div className="flex flex-col gap-4">
          <AdminField label="Start Time">
            <input
              type="datetime-local"
              className={adminInputClass}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </AdminField>

          <AdminField label="End Time">
            <input
              type="datetime-local"
              className={adminInputClass}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </AdminField>

          <div>
            <span className="block text-sm font-bold text-black dark:text-white">
              Event Image
            </span>
            {/* Native input is hidden; the label is the visible button. */}
            <label
              className={`${adminButtonClass} mt-2 inline-flex h-10 cursor-pointer items-center gap-2 px-4 text-sm`}
            >
              <FilePlus2 className="size-4" />
              {imageFile ? "Change File" : "Add File"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  setImageError(null);

                  if (file) {
                    setImagePreviewUrl(URL.createObjectURL(file));
                  } else {
                    setImagePreviewUrl(imageUrl);
                  }
                }}
              />
            </label>

            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Event preview"
                className="mt-3 h-40 w-full rounded-xl object-cover"
              />
            )}
            {imageError && (
              <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-200">
                {imageError}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          onClick={createEvent}
          disabled={imageUploading}
          className={adminButtonClass}
        >
          {imageUploading
            ? "Uploading..."
            : editingId
              ? "Save Event"
              : "Create Event"}
        </Button>
        <Button
          onClick={resetForm}
          className={`${adminButtonClass} !bg-[#DAF2FB]/60 dark:!bg-[#405084]/60`}
        >
          Reset
        </Button>
      </div>

      {/* ------------------------------------------------- Existing events */}
      <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/20">
        <h3 className="mb-4 text-lg font-bold text-black dark:text-white">
          Existing Events
        </h3>

        {events.length === 0 && !loading && (
          <p className="italic text-black/60 dark:text-white/70">
            No events found.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col gap-3 rounded-xl bg-white/40 p-4 md:flex-row md:items-center md:justify-between dark:bg-white/10"
            >
              <div className="flex items-center gap-4">
                {ev.event_url && (
                  <img
                    src={ev.event_url}
                    alt={ev.title || "Event image"}
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-bold text-black dark:text-white">
                    {ev.title}
                  </p>
                  <p className="text-xs text-black/60 dark:text-white/70">
                    {formatDateString(ev.start_time)} —{" "}
                    {formatDateString(ev.end_time)}
                  </p>
                  {ev.location && (
                    <p className="text-xs text-black/60 dark:text-white/70">
                      {ev.location}
                    </p>
                  )}
                  {ev.registration_url ? (
                    <a
                      href={ev.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#3F65E2] underline dark:text-[#D8B6F7]"
                    >
                      Luma link
                    </a>
                  ) : (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      No Luma link
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  className={`${adminButtonClass} h-9 px-4 text-sm`}
                  onClick={() => {
                    setEditingId(ev.id);
                    setTitle(ev.title || "");
                    setDescription(ev.description || "");
                    setLocation(ev.location || "");
                    setRegistrationUrl(ev.registration_url || "");
                    setStartTime(toDateTimeInputValue(ev.start_time));
                    setEndTime(toDateTimeInputValue(ev.end_time));
                    setImageUrl(ev.event_url || null);
                    setImagePreviewUrl(ev.event_url || null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9 px-4 text-sm"
                  onClick={() => handleDeleteEvent(ev.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
