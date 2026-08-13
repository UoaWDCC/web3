"use client";

import { SectionCard } from "@/components/admin/section-card";

export default function AdminAttendancePage() {
  return (
    <SectionCard title="Check Event Attendance">
      <p className="text-lg font-bold text-black dark:text-white">
        QR Code Scanner
      </p>
      <p className="mt-2 italic text-black/60 dark:text-white/70">
        QR code check-in is coming soon.
      </p>
    </SectionCard>
  );
}
