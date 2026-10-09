"use client";

import { useEffect, useState } from "react";
import { Award, FilePlus2, Pencil, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/admin/section-card";
import {
  AdminField,
  adminButtonClass,
  adminInputClass,
} from "@/components/admin/admin-field";
import {
  BadgeFormDialog,
  type BadgeDraft,
} from "@/components/admin/badge-form-dialog";
import { useAdmin } from "@/components/admin/use-admin";
import type { Badge } from "@/lib/schemas/badge";
import BadgesService from "@/services/badges/badges-service";

/** Fills the badge form from a saved badge, for editing. */
const draftFromBadge = (badge: Badge): BadgeDraft => ({
  name: badge.name,
  description: badge.description,
  criteria: badge.criteria,
  imageFile: null,
  imagePreviewUrl: badge.imageurl,
});

const formatDateString = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "N/A";

/**
 * Formats a stored timestamp for a `datetime-local` input.
 *
 * NOTE: this preserves the page's existing behaviour exactly, which converts
 * to UTC. `datetime-local` actually expects *local* time, so editing an event
 * currently shows its UTC time rather than NZ time. Left as-is here because
 * this change is structural; fixing it changes saved data.
 */
const toDateTimeInputValue = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export default function AdminEventsPage() {
  const { events, loading, fetchData, adminFetch } = useAdmin();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [checkInOpen, setCheckInOpen] = useState("");
  const [checkInClose, setCheckInClose] = useState("");
  const [assignedEmailsText, setAssignedEmailsText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The badge only exists here until the event is saved; the server then
  // creates the event and badge together, or neither.
  const [badgeDraft, setBadgeDraft] = useState<BadgeDraft | null>(null);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  // Badges linked to an event, keyed by event id. badges.eventid is unique, so
  // an event has at most one.
  const [eventBadges, setEventBadges] = useState<Record<string, Badge>>({});
  const [badgesError, setBadgesError] = useState<string | null>(null);
  // The badge the event being edited already has, as saved.
  const [existingBadge, setExistingBadge] = useState<Badge | null>(null);
  // Set when the admin removes the existing badge: on save it is deleted,
  // along with every member's award of it.
  const [removeBadge, setRemoveBadge] = useState(false);

  // Badges are public, so they are read directly rather than through an
  // admin route. Reloaded whenever the event list is, i.e. after every save.
  useEffect(() => {
    let cancelled = false;

    new BadgesService()
      .getAllBadges()
      .then((badges) => {
        if (cancelled) return;

        const byEvent: Record<string, Badge> = {};
        for (const badge of badges) {
          if (badge.eventid) byEvent[badge.eventid] = badge;
        }
        setEventBadges(byEvent);
        setBadgesError(null);
      })
      .catch((error) => {
        console.error("Failed to load badges", error);
        if (!cancelled) {
          setBadgesError("Couldn't load existing badges. Refresh before editing one.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [events]);

  /** Clears every event field and leaves edit mode. Backs the Reset button. */
  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setCapacity("");
    setStartTime("");
    setEndTime("");
    setCheckInOpen("");
    setCheckInClose("");
    setAssignedEmailsText("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUrl(null);
    setBadgeDraft(null);
    setExistingBadge(null);
    setRemoveBadge(false);
  };

  const createEvent = async () => {
    setSaving(true);
    try {
      const event: Record<string, unknown> = {
        title,
        description,
        location: location.trim() || null,
        capacity: capacity.trim() ? Number(capacity) : null,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        // Keeps the current image when no new file is chosen. A new file is
        // sent as event_image below and replaces both URL and path.
        event_url: imageUrl,
      };

      if (editingId) event.id = editingId;

      if (checkInOpen)
        event.check_in_open_time = new Date(checkInOpen).toISOString();
      if (checkInClose)
        event.check_in_close_time = new Date(checkInClose).toISOString();

      const payload: Record<string, unknown> = { event };

      if (removeBadge) {
        payload.remove_badge = true;
      } else if (badgeDraft) {
        // Creates the event's badge, or updates the one it already has.
        payload.badge = {
          name: badgeDraft.name,
          description: badgeDraft.description,
          criteria: badgeDraft.criteria,
        };
      }

      const assigned = assignedEmailsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (assigned.length) payload.assignedEmails = assigned;

      // One request carries the event, the badge and both images, so the
      // server can save all of it or none of it.
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (imageFile) formData.append("event_image", imageFile);
      if (badgeDraft?.imageFile)
        formData.append("badge_image", badgeDraft.imageFile);

      const res = await adminFetch("/api/admin/events", {
        method: "PUT",
        body: formData,
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
      // The form is left as it was, badge included, so the admin can fix the
      // problem and try again. Nothing was saved.
      const message = err instanceof Error ? err.message : String(err);
      alert(message || "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const badge = eventBadges[eventId];
    const message = badge
      ? `Are you sure you want to delete this event? Its badge "${badge.name}" will also be deleted, and every member who earned it will lose it.`
      : "Are you sure you want to delete this event?";

    if (!confirm(message)) return;

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

          <AdminField label="Capacity">
            <input
              type="number"
              min="1"
              className={adminInputClass}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Leave blank for unlimited"
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

          <AdminField label="Check-in Open">
            <input
              type="datetime-local"
              className={adminInputClass}
              value={checkInOpen}
              onChange={(e) => setCheckInOpen(e.target.value)}
            />
          </AdminField>

          <AdminField label="Check-in Close">
            <input
              type="datetime-local"
              className={adminInputClass}
              value={checkInClose}
              onChange={(e) => setCheckInClose(e.target.value)}
            />
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div>
              <span className="block text-sm font-bold text-black dark:text-white">
                Event Badge (optional)
              </span>

              {badgeDraft ? (
                <div className="mt-2 flex flex-col items-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DAF2FB] dark:bg-[#3F58AA]">
                      {badgeDraft.imagePreviewUrl ? (
                        <img
                          src={badgeDraft.imagePreviewUrl}
                          alt={`${badgeDraft.name} badge`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Award className="size-7 text-web3" />
                      )}
                    </div>
                    <p className="font-bold break-words text-black dark:text-white">
                      {badgeDraft.name}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className={`${adminButtonClass} h-9 gap-1.5 px-3 text-sm`}
                      onClick={() => setBadgeDialogOpen(true)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className={`${adminButtonClass} h-9 gap-1.5 px-3 text-sm !bg-[#DAF2FB]/60 dark:!bg-[#405084]/60`}
                      onClick={() => {
                        setBadgeDraft(null);
                        // A saved badge is deleted on save; an unsaved one
                        // simply goes away.
                        if (existingBadge) setRemoveBadge(true);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : removeBadge && existingBadge ? (
                // Removing and adding a new badge can't happen in one save, so
                // Add Badge waits until this one has been saved.
                <div className="mt-2 flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-red-700 dark:text-red-200">
                    &ldquo;{existingBadge.name}&rdquo; will be deleted when you
                    save, and every member who earned it will lose it.
                  </p>
                  <Button
                    size="sm"
                    className={`${adminButtonClass} h-9 gap-1.5 px-3 text-sm`}
                    onClick={() => {
                      setRemoveBadge(false);
                      setBadgeDraft(draftFromBadge(existingBadge));
                    }}
                  >
                    <Undo2 className="size-3.5" />
                    Undo
                  </Button>
                </div>
              ) : (
                <Button
                  className={`${adminButtonClass} mt-2 h-10 gap-2 px-4 text-sm`}
                  onClick={() => setBadgeDialogOpen(true)}
                >
                  <Award className="size-4" />
                  Add Badge
                </Button>
              )}

              {badgesError && (
                <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-200">
                  {badgesError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {badgeDialogOpen && (
        <BadgeFormDialog
          initial={badgeDraft}
          onSave={(draft) => {
            setBadgeDraft(draft);
            setBadgeDialogOpen(false);
          }}
          onCancel={() => setBadgeDialogOpen(false)}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          onClick={createEvent}
          disabled={saving}
          className={adminButtonClass}
        >
          {saving ? "Saving..." : editingId ? "Save Event" : "Create Event"}
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
                    setCapacity(ev.capacity != null ? String(ev.capacity) : "");
                    setStartTime(toDateTimeInputValue(ev.start_time));
                    setEndTime(toDateTimeInputValue(ev.end_time));
                    setCheckInOpen(toDateTimeInputValue(ev.check_in_open_time));
                    setCheckInClose(
                      toDateTimeInputValue(ev.check_in_close_time),
                    );
                    setImageUrl(ev.event_url || null);
                    setImagePreviewUrl(ev.event_url || null);
                    // Load this event's saved badge, if any, replacing any
                    // draft left over from another event.
                    const savedBadge = eventBadges[ev.id] ?? null;
                    setExistingBadge(savedBadge);
                    setBadgeDraft(
                      savedBadge ? draftFromBadge(savedBadge) : null,
                    );
                    setRemoveBadge(false);
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
