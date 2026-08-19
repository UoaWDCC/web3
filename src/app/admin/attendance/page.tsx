"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { useSignMessage } from "wagmi";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";
import { useWallet } from "@/hooks/use-wallet";

type AdminAuthHeaders = {
  "x-admin-address": string;
  "x-admin-signature": string;
  "x-admin-timestamp": string;
};

type AdminEventSummary = {
  id: string;
  title: string;
  start_time: string;
};

const ADMIN_AUTH_STORAGE_KEY = "web3uoa.adminAuth";

export default function AdminAttendancePage() {
  const { address, isConnected, mounted } = useWallet();
  const { signMessageAsync } = useSignMessage();

  const [authHeader, setAuthHeader] = useState<AdminAuthHeaders | null>(null);
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkinEventId, setCheckinEventId] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<"scanning" | "result">(
    "scanning",
  );
  const [scanResult, setScanResult] = useState<{
    name: string;
    alreadyCheckedIn: boolean;
  } | null>(null);
  const [scanError, setScanError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const processingScanRef = useRef(false);

  const isFreshAdminAuth = (headers: AdminAuthHeaders | null) => {
    if (!headers) return false;
    const timestamp = Number(headers["x-admin-timestamp"]);
    if (!Number.isFinite(timestamp)) return false;
    return Date.now() - timestamp <= 4 * 60 * 60 * 1000;
  };

  const saveAdminAuth = (headers: AdminAuthHeaders) => {
    setAuthHeader(headers);
    sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(headers));
  };

  const clearAdminAuth = () => {
    setAuthHeader(null);
    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    if (!mounted || !address) return;

    const raw = sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AdminAuthHeaders;
      const sameAddress =
        parsed["x-admin-address"]?.toLowerCase() === address.toLowerCase();

      if (sameAddress && isFreshAdminAuth(parsed)) {
        setAuthHeader(parsed);
      } else {
        sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    }
  }, [mounted, address]);

  useEffect(() => {
    if (!mounted) return;
    if (!isConnected || !address) {
      clearAdminAuth();
    }
  }, [mounted, isConnected, address]);

  const signAdminAuth = async () => {
    if (!address) throw new Error("Wallet not connected");

    const timestamp = Date.now().toString();
    const signature = await signMessageAsync({
      message: `Admin Auth ${timestamp}`,
    });

    const headers: AdminAuthHeaders = {
      "x-admin-address": address,
      "x-admin-signature": signature,
      "x-admin-timestamp": timestamp,
    };

    saveAdminAuth(headers);
    return headers;
  };

  const fetchEvents = async (headers: AdminAuthHeaders) => {
    setEventsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/events", { headers });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          clearAdminAuth();
        }
        throw new Error(data.error || "Failed to load events");
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setEvents([]);
      setError(err.message || "Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (!authHeader) return;
    void fetchEvents(authHeader);
  }, [authHeader]);

  const authenticate = async () => {
    try {
      const headers = await signAdminAuth();
      await fetchEvents(headers);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    }
  };

  const openScanner = () => {
    if (!checkinEventId.trim()) {
      setScanError("Select an event first");
      return;
    }

    setScanError("");
    setScanResult(null);
    setScanStatus("scanning");
    setScannerOpen(true);
  };

  const closeScanner = () => {
    processingScanRef.current = false;
    setScannerOpen(false);
    setScanStatus("scanning");
    setScanResult(null);
    setScanError("");
  };

  const handleDecoded = async (qrSecret: string) => {
    if (!authHeader || scanStatus !== "scanning" || processingScanRef.current) {
      return;
    }

    processingScanRef.current = true;
    setScanError("");
    setScanStatus("result");

    try {
      const verify = (headers: AdminAuthHeaders) =>
        fetch("/api/admin/checkin/verify", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            qrSecret: qrSecret.trim(),
            eventId: checkinEventId.trim(),
          }),
        });

      let res = await verify(authHeader);

      if (res.status === 401) {
        const freshHeaders = await signAdminAuth();
        res = await verify(freshHeaders);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");

      setScanResult({
        name: data.member.name,
        alreadyCheckedIn: data.alreadyCheckedIn,
      });
    } catch (err: any) {
      setScanError(err.message || "Check-in failed");
    } finally {
      processingScanRef.current = false;
    }
  };

  useEffect(() => {
    if (!scannerOpen || scanStatus !== "scanning" || !videoRef.current) return;

    setScanError("");
    processingScanRef.current = false;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const decodedText =
          typeof result === "string"
            ? result
            : typeof result?.data === "string"
              ? result.data
              : "";

        if (!decodedText.trim()) return;

        console.log("[scanner] decoded", decodedText);
        void handleDecoded(decodedText);
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: "environment",
        maxScansPerSecond: 5,
      },
    );

    qrScannerRef.current = scanner;

    scanner
      .start()
      .then(async () => {
        try {
          const cameras = await QrScanner.listCameras(true);
          const rearCamera =
            cameras.find((camera) =>
              /back|rear|environment/i.test(camera.label),
            ) || cameras[0];

          if (rearCamera?.id) {
            await scanner.setCamera(rearCamera.id);
          }

          await videoRef.current?.play();
        } catch (err) {
          console.error("[scanner] camera setup failed", err);
        }
      })
      .catch((err: any) => {
        console.error("[scanner] start failed", err);
        setScanError(err?.message || "Failed to access camera");
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      qrScannerRef.current = null;
      processingScanRef.current = false;
    };
  }, [scannerOpen, scanStatus, checkinEventId]);

  if (!mounted) {
    return (
      <SectionCard title="Check Event Attendance">
        <p className="text-foreground/70">Loading...</p>
      </SectionCard>
    );
  }

  if (!isConnected) {
    return (
      <SectionCard title="Check Event Attendance">
        <p className="mb-4 text-foreground/70">
          Connect owner wallet to access.
        </p>
        <WalletButton />
      </SectionCard>
    );
  }

  if (!authHeader) {
    return (
      <SectionCard title="Check Event Attendance">
        <p className="mb-4 text-foreground/70">
          Please sign a message to verify you are the admin.
        </p>
        <Button onClick={authenticate}>Sign Message</Button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard title="Check Event Attendance">
        <p className="text-lg font-bold text-black dark:text-white">
          QR Code Scanner
        </p>
        <p className="mt-2 text-black/60 dark:text-white/70">
          Select an event, then scan member QR codes.
        </p>

        <div className="mt-6 max-w-md">
          <select
            value={checkinEventId}
            onChange={(e) => setCheckinEventId(e.target.value)}
            disabled={eventsLoading}
            className="border border-border rounded px-3 py-2 mb-3 text-sm w-full bg-white/70 dark:bg-black/20"
          >
            <option value="">
              {eventsLoading ? "Loading events..." : "Select an event…"}
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({new Date(event.start_time).toLocaleDateString()})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button onClick={openScanner} className="bg-blue-600 hover:bg-blue-700">
              Scan Code
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (authHeader) void fetchEvents(authHeader);
              }}
              disabled={eventsLoading}
            >
              Refresh Events
            </Button>
          </div>

          {events.length === 0 && !eventsLoading && (
            <p className="text-sm text-foreground/60 mt-3">
              No events available.
            </p>
          )}

          {scanError && !scannerOpen && (
            <p className="text-red-500 mt-3 text-sm">{scanError}</p>
          )}

          {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
        </div>
      </SectionCard>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-4 w-full max-w-sm flex flex-col items-center gap-4">
            {scanStatus === "scanning" && (
              <>
                <p className="font-semibold text-center">
                  Scanning for{" "}
                  {events.find((event) => event.id === checkinEventId)?.title ||
                    "event"}
                </p>
                <video
                  ref={videoRef}
                  className="w-full aspect-square rounded-xl object-cover bg-black"
                  muted
                  playsInline
                  autoPlay
                />
                <p className="text-sm text-foreground/60 text-center">
                  Point the rear camera at the QR code. Scanning submits automatically.
                </p>
                {scanError && (
                  <p className="text-red-500 text-sm text-center">{scanError}</p>
                )}
              </>
            )}

            {scanStatus === "result" && (
              <div className="flex flex-col items-center gap-3 py-6">
                {scanResult ? (
                  <>
                    <p className="text-lg font-bold text-center">
                      {scanResult.name}
                    </p>
                    <p
                      className={
                        scanResult.alreadyCheckedIn
                          ? "text-amber-600"
                          : "text-green-600"
                      }
                    >
                      {scanResult.alreadyCheckedIn
                        ? "Already checked in"
                        : "Checked in successfully"}
                    </p>
                  </>
                ) : (
                  <p className="text-red-500 text-center">{scanError}</p>
                )}

                <Button
                  onClick={() => {
                    processingScanRef.current = false;
                    setScanResult(null);
                    setScanError("");
                    setScanStatus("scanning");
                  }}
                  variant="outline"
                >
                  Scan Next
                </Button>
              </div>
            )}

            <Button onClick={closeScanner} variant="ghost">
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}