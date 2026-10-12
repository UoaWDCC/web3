"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AdminField,
  adminButtonClass,
  adminInputClass,
} from "@/components/admin/admin-field";

/**
 * A badge the admin has filled in but not yet saved. It only reaches the
 * database when the event form is submitted, together with the event.
 */
export type BadgeDraft = {
  name: string;
  description: string | null;
  criteria: string | null;
  /** A newly chosen image, uploaded on submit. */
  imageFile: File | null;
  /** What to show in the preview: the chosen file, or the saved image. */
  imagePreviewUrl: string | null;
};

type BadgeFormDialogProps = {
  /** The draft to edit, or null to start a new badge. */
  initial: BadgeDraft | null;
  onSave: (draft: BadgeDraft) => void;
  onCancel: () => void;
};

export function BadgeFormDialog({
  initial,
  onSave,
  onCancel,
}: BadgeFormDialogProps) {
  const titleId = useId();
  const [isMounted, setIsMounted] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [criteria, setCriteria] = useState(initial?.criteria ?? "");
  const [imageFile, setImageFile] = useState<File | null>(
    initial?.imageFile ?? null,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initial?.imagePreviewUrl ?? null,
  );
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onCancel]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Badge name is required");
      return;
    }

    onSave({
      name: trimmedName,
      description: description.trim() || null,
      criteria: criteria.trim() || null,
      imageFile,
      imagePreviewUrl,
    });
  };

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/50"
        onClick={onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-[28px] bg-[#A3DEF4] p-6 text-black shadow-2xl md:p-8 dark:bg-[#3F65E2] dark:text-white"
      >
        <h2 id={titleId} className="text-2xl font-bold text-web3">
          {initial ? "Edit Badge" : "Add Badge"}
        </h2>

        <AdminField label="Badge Name *">
          <input
            autoFocus
            className={adminInputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            placeholder="Launch Night 2026"
          />
        </AdminField>
        {nameError && (
          <p className="-mt-2 text-sm font-medium text-red-700 dark:text-red-200">
            {nameError}
          </p>
        )}

        <AdminField label="Description">
          <textarea
            rows={3}
            className={`${adminInputClass} resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shown when members hover over the badge"
          />
        </AdminField>

        <AdminField label="Criteria">
          <input
            className={adminInputClass}
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="Attend Launch Night 2026"
          />
        </AdminField>

        <div>
          <span className="block text-sm font-bold text-black dark:text-white">
            Badge Image
          </span>
          <div className="mt-2 flex items-center gap-4">
            {/* Round like the badge on the profile page, so the admin sees
                how the image will be cropped. */}
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DAF2FB] dark:bg-[#3F58AA]">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Badge preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-black/50 dark:text-white/60">
                  No image
                </span>
              )}
            </div>

            {/* Native input is hidden; the label is the visible button. */}
            <label
              className={`${adminButtonClass} inline-flex h-10 cursor-pointer items-center gap-2 px-4 text-sm`}
            >
              <FilePlus2 className="size-4" />
              {imagePreviewUrl ? "Change Image" : "Add Image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) return;

                  setImageFile(file);
                  setImagePreviewUrl(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} className={adminButtonClass}>
            Save Badge
          </Button>
          <Button
            onClick={onCancel}
            className={`${adminButtonClass} !bg-[#DAF2FB]/60 dark:!bg-[#405084]/60`}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  if (!isMounted) {
    return null;
  }

  return createPortal(overlay, document.body);
}
