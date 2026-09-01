import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { IconPhoto, IconTrash, IconUpload } from "@/components/organizer-console/orgIcons";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/mediaUrl";
import { getApiErrorMessage, isOrganizerEventAccessError } from "@/lib/apiError";
import {
  GALLERY_ACCEPT,
  deleteOrganizerEventImage,
  listOrganizerEventImages,
  uploadOrganizerEventImage,
  validateGalleryFile,
  type OrganizerEventImage,
} from "@/services/organizerEvents";

type Props = {
  eventId: number;
  images: OrganizerEventImage[];
  onImagesChange: (images: OrganizerEventImage[]) => void;
  onDenied?: () => void;
};

export default function EventGalleryPanel({ eventId, images, onImagesChange, onDenied }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listOrganizerEventImages(eventId)
      .then((next) => {
        if (!cancelled) onImagesChange(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isOrganizerEventAccessError(err)) onDenied?.();
      });
    return () => { cancelled = true; };
    // Intentionally eventId-only so parent setState does not refetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const refresh = async () => {
    const next = await listOrganizerEventImages(eventId);
    onImagesChange(next);
  };

  const handleFiles = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    const invalid = validateGalleryFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setUploading(true);
    try {
      await uploadOrganizerEventImage(eventId, file);
      await refresh();
      toast.success("Image uploaded");
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (image: OrganizerEventImage) => {
    try {
      await deleteOrganizerEventImage(eventId, image.id);
      onImagesChange(images.filter((row) => row.id !== image.id));
      toast.success("Image removed");
    } catch (err) {
      if (isOrganizerEventAccessError(err)) {
        onDenied?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Couldn't delete image"));
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">Gallery</h3>
          <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, GIF, or WebP · max 4 MB each</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <IconUpload className="w-4 h-4 mr-2" />}
          Upload
        </Button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        }`}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        ) : (
          <>
            <IconPhoto className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Drop images here or use Upload</p>
          </>
        )}
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image) => {
            const src = getMediaUrl(image.path);
            return (
              <div key={image.id} className="relative group aspect-[16/10] rounded-xl overflow-hidden bg-muted">
                {src ? (
                  <img src={src} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <IconPhoto className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => void handleDelete(image)}
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No gallery images yet.</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={GALLERY_ACCEPT}
        className="hidden"
        onChange={(e) => e.target.files && void handleFiles(e.target.files)}
      />
    </div>
  );
}
