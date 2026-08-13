"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";

export const dynamic = "force-dynamic";
type AdminClaim = {
  id: string;
  status: string;
  requestedName: string;
  walletAddress: string;
};

type ActiveName = {
  name: string;
  address: string;
};

type AdminEvent = {
  id: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  check_in_open_time?: string;
  check_in_close_time?: string;
  event_url?: string | null;
  event_path?: string | null;
  location?: string | null;
  capacity?: number | null;
};

type AdminHeaders = Record<string, string>;

export default function AdminPage() {
  const { address, isConnected, mounted } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const [authHeader, setAuthHeader] = useState<AdminHeaders | null>(null);

  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [activeNames, setActiveNames] = useState<ActiveName[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Event form state
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
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  const formatDateString = (value?: string) =>
    value ? new Date(value).toLocaleString() : "N/A";

  const authenticate = async () => {
    if (!address) return;
    try {
      const timestamp = Date.now().toString();
      const signature = await signMessageAsync({
        message: `Admin Auth ${timestamp}`,
      });

      const headers: AdminHeaders = {
        "x-admin-address": address,
        "x-admin-signature": signature,
        "x-admin-timestamp": timestamp,
      };

      setAuthHeader(headers);
      await fetchData(headers);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to authenticate");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const res = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { ...(authHeader || {}), "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId }),
        credentials: "include",
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

  const fetchData = async (headers?: AdminHeaders) => {
    const requestHeaders = headers ?? authHeader;
    setLoading(true);
    try {
      const [claimsRes, namesRes, eventsRes] = await Promise.all([
        fetch("/api/admin/claims", {
          ...(requestHeaders ? { headers: requestHeaders } : {}),
          credentials: "include",
        }),
        fetch("/api/admin/names", {
          ...(requestHeaders ? { headers: requestHeaders } : {}),
          credentials: "include",
        }),
        fetch("/api/admin/events", {
          ...(requestHeaders ? { headers: requestHeaders } : {}),
          credentials: "include",
        }),
      ]);

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims || []);
      }

      if (namesRes.ok) {
        const data = await namesRes.json();
        setActiveNames(data || []);
      } else {
        const err = await namesRes.json();
        if (err.error === "Unauthorized") {
          setAuthHeader(null); // Force re-auth
        }
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
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

      const res = await fetch("/api/admin/events/image", {
        method: "POST",
        headers: { ...(authHeader || {}) },
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to upload image");
      }

      const data = await res.json();
      return data;
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
        capacity: capacity.trim() ? Number(capacity) : null,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        event_url: uploadedImage?.event_url ?? imageUrl,
        event_path: uploadedImage?.event_path ?? undefined,
      };

      if (editingId) payload.id = editingId;

      if (checkInOpen)
        payload.check_in_open_time = new Date(checkInOpen).toISOString();
      if (checkInClose)
        payload.check_in_close_time = new Date(checkInClose).toISOString();

      const assigned = assignedEmailsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (assigned.length) payload.assignedEmails = assigned;

      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { ...(authHeader || {}), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create event");
      }

      // clear form and refresh
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

      // clear editing state
      setEditingId(null);
      setShowEventForm(false);

      fetchData();
      alert("Event created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || "Failed to create event");
    }
  };

  const handleApprove = async (claimId: string) => {
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { ...(authHeader || {}), "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Approval failed");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    }
  };

  const handleReject = async (claimId: string) => {
    try {
      const res = await fetch("/api/admin/claims", {
        method: "PUT",
        headers: { ...(authHeader || {}), "Content-Type": "application/json" },
        body: JSON.stringify({ id: claimId, status: "REJECTED" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Rejection failed");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    }
  };

  const handleRevoke = async (name: string) => {
    if (!confirm(`Are you sure you want to revoke ${name}.web3uoa.eth?`))
      return;

    try {
      const res = await fetch("/api/admin/revoke", {
        method: "POST",
        headers: { ...(authHeader || {}), "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Revoke failed");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    }
  };

  if (!mounted) {
    return (
      <div
        className="min-h-screen py-24 flex items-center justify-center container mx-auto px-4"
        suppressHydrationWarning
      >
        <p className="text-foreground/70">Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen py-24 flex items-center justify-center container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
          <p className="mb-6 text-foreground/70">
            Connect owner wallet to access.
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    );
  }

  if (!authHeader) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Admin Verification</h1>
        <p className="mb-6 text-foreground/70">
          Please sign a message to verify you are the admin.
        </p>
        <Button onClick={authenticate}>Sign Message</Button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24 container mx-auto px-4">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black">Admin Dashboard</h1>
        <Button onClick={() => fetchData()} variant="outline">
          Refresh
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-12">
        {/* Top row: Pending Requests (left) and Active Subnames (right) */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold mb-6 border-b border-border pb-4">
            Pending Requests
          </h2>
          {loading && <p>Loading...</p>}
          <div className="flex flex-col gap-4">
            {claims
              .filter((c) => c.status === "PENDING")
              .map((claim) => (
                <div
                  key={claim.id}
                  className="bg-secondary/30 p-4 rounded-xl border border-border flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-lg">
                      {claim.requestedName}.web3uoa.eth
                    </p>
                    <p className="text-xs text-foreground/60 break-all">
                      {claim.walletAddress}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(claim.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(claim.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            {claims.filter((c) => c.status === "PENDING").length === 0 &&
              !loading && (
                <p className="text-foreground/50 italic">
                  No pending requests.
                </p>
              )}
          </div>
        </div>

        {/* Active Names (right column) */}
        <div>
          <h2 className="text-2xl font-bold mb-6 border-b border-border pb-4">
            Active Subnames
          </h2>
          {loading && <p>Loading...</p>}
          <div className="flex flex-col gap-4">
            {activeNames.map((ens) => (
              <div
                key={ens.name}
                className="bg-secondary/30 p-4 rounded-xl border border-border flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-lg">{ens.name}.web3uoa.eth</p>
                  <p className="text-xs text-foreground/60 break-all">
                    {ens.address}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRevoke(ens.name)}
                >
                  Revoke
                </Button>
              </div>
            ))}
            {activeNames.length === 0 && !loading && (
              <p className="text-foreground/50 italic">
                No active subnames found.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Events section (collapsible form + list) */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Events</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEventForm((s) => !s)}
            >
              {showEventForm || editingId
                ? editingId
                  ? "Editing"
                  : "Hide Form"
                : "New Event"}
            </Button>
          </div>
        </div>

        {/** Collapsible form - shown when toggled or when editing */}
        {(showEventForm || editingId) && (
          <div className="mb-6 bg-secondary/10 p-6 rounded-xl border border-border">
            <h3 className="text-lg font-medium mb-2">
              {editingId ? "Edit Event" : "Create Event"}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input
                  className="mt-1 w-full p-2 rounded-md border"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <label className="block text-sm font-medium mt-4">
                  Description
                </label>
                <textarea
                  className="mt-1 w-full p-2 rounded-md border"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <label className="block text-sm font-medium mt-4">
                  Location
                </label>
                <input
                  className="mt-1 w-full p-2 rounded-md border"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sir Owen G Glenn Building"
                />

                <label className="block text-sm font-medium mt-4">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full p-2 rounded-md border"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Leave blank for unlimited"
                />

                <label className="block text-sm font-medium mt-4">
                  Assigned Emails (comma separated)
                </label>
                <input
                  className="mt-1 w-full p-2 rounded-md border"
                  value={assignedEmailsText}
                  onChange={(e) => setAssignedEmailsText(e.target.value)}
                  placeholder="alice@example.com, bob@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Start Time</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full p-2 rounded-md border"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />

                <label className="block text-sm font-medium mt-4">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full p-2 rounded-md border"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />

                <label className="block text-sm font-medium mt-4">
                  Check-in Open
                </label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full p-2 rounded-md border"
                  value={checkInOpen}
                  onChange={(e) => setCheckInOpen(e.target.value)}
                />

                <label className="block text-sm font-medium mt-4">
                  Check-in Close
                </label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full p-2 rounded-md border"
                  value={checkInClose}
                  onChange={(e) => setCheckInClose(e.target.value)}
                />

                <label className="block text-sm font-medium mt-4">
                  Event Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageFile(file);
                    setImageError(null);

                    if (file) {
                      const url = URL.createObjectURL(file);
                      setImagePreviewUrl(url);
                    } else {
                      setImagePreviewUrl(imageUrl);
                    }
                  }}
                />
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Event preview"
                    className="mt-3 h-40 w-full object-cover rounded-lg border"
                  />
                )}
                {imageError && (
                  <p className="text-sm text-red-500 mt-2">{imageError}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <Button onClick={createEvent} disabled={imageUploading}>
                  {imageUploading
                    ? "Uploading..."
                    : editingId
                      ? "Save Event"
                      : "Create Event"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // cancel edit / hide form
                    setEditingId(null);
                    setShowEventForm(false);
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
                    setImageError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {events.length === 0 && !loading && (
            <p className="text-foreground/50 italic">No events found.</p>
          )}
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-secondary/30 p-3 rounded-md border border-border"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-bold">{ev.title}</p>
                  <p className="text-xs text-foreground/60">
                    {formatDateString(ev.start_time)} -{" "}
                    {formatDateString(ev.end_time)}
                  </p>
                  {ev.event_url && (
                    <img
                      src={ev.event_url}
                      alt={ev.title || "Event image"}
                      className="mt-3 h-40 w-full max-w-sm object-cover rounded-lg border"
                    />
                  )}
                </div>
                <div className="flex gap-2 mt-3 md:mt-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      // populate form for editing
                      setEditingId(ev.id);
                      setShowEventForm(true);
                      setTitle(ev.title || "");
                      setDescription(ev.description || "");
                      setLocation(ev.location || "");
                      setCapacity(ev.capacity != null ? String(ev.capacity) : "");
                      setStartTime(
                        ev.start_time
                          ? new Date(ev.start_time).toISOString().slice(0, 16)
                          : "",
                      );
                      setEndTime(
                        ev.end_time
                          ? new Date(ev.end_time).toISOString().slice(0, 16)
                          : "",
                      );
                      setCheckInOpen(
                        ev.check_in_open_time
                          ? new Date(ev.check_in_open_time)
                              .toISOString()
                              .slice(0, 16)
                          : "",
                      );
                      setCheckInClose(
                        ev.check_in_close_time
                          ? new Date(ev.check_in_close_time)
                              .toISOString()
                              .slice(0, 16)
                          : "",
                      );
                      setImageUrl(ev.event_url || null);
                      setImagePreviewUrl(ev.event_url || null);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteEvent(ev.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
