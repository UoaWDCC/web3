"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";
import QrScanner from "qr-scanner";
import Link from "next/link";

import { SectionCard } from "@/components/admin/section-card";
import { useAdmin } from "@/components/admin/use-admin";
import { isPastEvent } from "@/lib/events";
import { Section } from "lucide-react";

export const dynamic = "force-dynamic";

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
    return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl bg-white/40 p-6 transition-all hover:-translate-y-0.5 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20"
    >
      <span className="text-4xl font-black text-black dark:text-white">
        {value}
      </span>
      <span className="font-semibold text-black/70 dark:text-white/80">
        {label}
      </span>
    </Link>
  );
}

export default function AdminPage() {

  
  const { address, isConnected, mounted } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const [authHeader, setAuthHeader] = useState<any>(null);

  const [claims, setClaims] = useState<any[]>([]);
  const [activeNames, setActiveNames] = useState<any[]>([]);
  const [events, setEvents] = useState<
    { id: string; title: string; start_time: string }[]
  >([]);

  const pendingCount = claims.filter((c) => c.status === "PENDING").length;
  const upcomingCount = events.filter((ev) => !isPastEvent(ev)).length;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  {/* Check-in QR Scanner State */}
  const [checkinEventId, setCheckinEventId] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<"scanning" | "result">(
    "scanning",
  );
  const [eventsLoading, setEventsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    name: string;
    alreadyCheckedIn: boolean;
  } | null>(null);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const processingScanRef = useRef(false);


  const openScanner = () => {
    if (!checkinEventId.trim()) {
      setScanError("Enter an event id first");
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
    console.log("handleDecoded called", {
      qrSecret,
      hasAuthHeader: Boolean(authHeader),
      scanStatus,
      eventId: checkinEventId,
    });

    if (!authHeader || scanStatus !== "scanning" || processingScanRef.current) {
      return;
    }

    processingScanRef.current = true;
    setScanError("");
    setScanStatus("result");

    try {
      const verify = (headers: any) =>
        fetch("/api/admin/checkin/verify", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ qrSecret: qrSecret.trim(), eventId: checkinEventId.trim() }),
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

  // Starts the camera whenever the modal is showing the live scan view, and
  // tears it down whenever we leave that view (result shown, or closed).
  useEffect(() => {
    if (!scannerOpen || scanStatus !== "scanning" || !videoRef.current) return;

    setScanError("");
    processingScanRef.current = false;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        console.log("raw qr result", result);

        const decodedText =
          typeof result === "string"
            ? result
            : typeof result?.data === "string"
              ? result.data
              : "";

        console.log("decodedText", decodedText);

        if (!decodedText.trim()) {
          return;
        }

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
          console.error("Camera setup failed", err);
        }
      })
      .catch((err: any) => {
        console.error("Scanner start failed", err);
        setScanError(err?.message || "Failed to access camera");
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      qrScannerRef.current = null;
      processingScanRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen, scanStatus, checkinEventId]);


  // Signs a fresh "Admin Auth" message and stores it as the active auth
  // headers. Pulled out of authenticate() so handleDecoded can also call it
  // to silently re-sign and retry when a scan hits an expired signature.
  const signAdminAuth = async () => {
    if (!address) throw new Error("Wallet not connected");
    const timestamp = Date.now().toString();
    const signature = await signMessageAsync({
      message: `Admin Auth ${timestamp}`,
    });

    const headers = {
      "x-admin-address": address,
      "x-admin-signature": signature,
      "x-admin-timestamp": timestamp,
    };

    setAuthHeader(headers);
    return headers;
  };

  const authenticate = async () => {
    try {
      const headers = await signAdminAuth();
      await fetchData(headers);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    }
  };

  const fetchData = async (headers: any) => {
    setLoading(true);
    try {
      const [claimsRes, namesRes] = await Promise.all([
        fetch("/api/admin/claims", { headers }),
        fetch("/api/admin/names", { headers }),
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

      await fetchEvents(headers);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (headers: any) => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/admin/events", { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load events");
      }

      setEvents(data.events || []);
    } catch (err: any) {
      setEvents([]);
      setError(err.message || "Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  };

  const handleApprove = async (claimId: string) => {
    if (!authHeader) return;
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (!res.ok) throw new Error("Approval failed");
      fetchData(authHeader);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (claimId: string) => {
    if (!authHeader) return;
    try {
      const res = await fetch("/api/admin/claims", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ id: claimId, status: "REJECTED" }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      fetchData(authHeader);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevoke = async (name: string) => {
    if (!authHeader) return;
    if (!confirm(`Are you sure you want to revoke ${name}.web3uoa.eth?`))
      return;

    try {
      const res = await fetch("/api/admin/revoke", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      fetchData(authHeader);
    } catch (err: any) {
      alert(err.message);
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
    <SectionCard title="Overview">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile
          label="Pending requests"
          value={pendingCount}
          href="/admin/claims"
        />
        <StatTile
          label="Active subnames"
          value={activeNames.length}
          href="/admin/claims"
        />
        <StatTile
          label="Upcoming events"
          value={upcomingCount}
          href="/admin/events"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-12">
        {/* Pending Claims Queue */}
        <div>
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

        {/* Active Names */}
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
        {/* Check-in QR Scanner */}
        <div className="bg-sky-100 dark:bg-sky-950/40 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-1 text-sky-700 dark:text-sky-300">
            Check Event Attendance
          </h2>
          <p className="font-semibold mb-4">QR Code Scanner</p>
          <select
            value={checkinEventId}
            onChange={(e) => setCheckinEventId(e.target.value)}
            onFocus={() => {
              if (authHeader) {
                void fetchEvents(authHeader);
              }
            }}
            className="border border-border rounded px-2 py-1 mb-3 text-sm w-full max-w-80 block bg-white/70 dark:bg-black/20"
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
          <Button onClick={openScanner} className="bg-blue-600 hover:bg-blue-700">
            Scan Code
          </Button>
          {scanError && !scannerOpen && (
            <p className="text-red-500 mt-2 text-sm">{scanError}</p>
          )}
        </div>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-4 w-full max-w-sm flex flex-col items-center gap-4">
            {scanStatus === "scanning" && (
              <>
                <p className="font-semibold">
                  Scanning for{" "}
                  {events.find((event) => event.id === checkinEventId)
                    ?.title || "event"}
                </p>
                <video
                  ref={videoRef}
                  className="w-full aspect-square rounded-xl object-cover bg-black"
                  muted
                  playsInline
                  autoPlay
                />
                <p className="text-sm text-foreground/60 text-center">
                  Point the camera at the QR code to check in.
                </p>
                {scanError && (
                  <p className="text-red-500 text-sm">{scanError}</p>
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
      
      </SectionCard>

    
  );
}
