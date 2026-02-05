import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

export type ImageItem = {
  id: string;
  title: string;
  description?: string | null;
  image_key?: string | null;
  thumb_key?: string | null;
  created_at: string;
  type?: "single" | "album";
  count?: number;
};

type AlbumDetail = {
  type: "album";
  images: Array<{
    id: string;
    image_key: string;
    thumb_key?: string | null;
    sort_order?: number | null;
  }>;
};

export default function ImageCard({
  image,
  className = ""
}: {
  image: ImageItem;
  className?: string;
}) {
  const isAlbum = image.type === "album";
  const baseCount = Math.max(1, image.count || 1);
  const canNavigate = isAlbum && baseCount > 1;
  const [albumImages, setAlbumImages] = useState<AlbumDetail["images"] | null>(
    null
  );
  const [index, setIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(0);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const outRef = useRef<number | null>(null);
  const inRef = useRef<number | null>(null);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const animationMs = 260;

  useEffect(() => {
    setIndex(0);
    setAlbumImages(null);
  }, [image.id]);

  useEffect(() => {
    return () => {
      if (outRef.current) {
        window.clearTimeout(outRef.current);
      }
      if (inRef.current) {
        window.clearTimeout(inRef.current);
      }
    };
  }, []);

  const loadAlbumImages = async () => {
    if (!canNavigate || albumImages || loadingAlbum) return albumImages;
    setLoadingAlbum(true);
    try {
      const detail = await apiFetch<AlbumDetail>(`/api/images/${image.id}`);
      if (detail?.type === "album" && Array.isArray(detail.images)) {
        setAlbumImages(detail.images);
        return detail.images;
      }
    } catch {
      // ignore
    } finally {
      setLoadingAlbum(false);
    }
    return albumImages;
  };

  const handleNavigate = async (dir: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canNavigate || phase !== "idle") return;
    const items = albumImages || (await loadAlbumImages()) || [];
    const total = items.length || baseCount;
    if (!total) return;
    const next = (index + dir + total) % total;
    setSlideDir(dir);
    setPhase("out");
    if (outRef.current) {
      window.clearTimeout(outRef.current);
    }
    if (inRef.current) {
      window.clearTimeout(inRef.current);
    }
    outRef.current = window.setTimeout(() => {
      setIndex(next);
      setPhase("in");
      inRef.current = window.setTimeout(() => {
        setPhase("idle");
      }, animationMs);
    }, animationMs);
  };

  const activeItem = albumImages?.[index];
  const previewKey =
    activeItem?.thumb_key ||
    activeItem?.image_key ||
    image.thumb_key ||
    image.image_key;
  const previewSrc = previewKey ? `/media/${previewKey}` : "";
  const resolvedTotal = albumImages?.length || baseCount;
  const displayIndex = canNavigate ? Math.min(index + 1, resolvedTotal) : 1;
  const slideOffset = slideDir >= 0 ? 24 : -24;
  const animStyle =
    phase === "idle"
      ? { opacity: 1, transform: "translateX(0) scale(1)" }
      : phase === "out"
        ? {
            opacity: 0,
            transform: `translateX(${slideOffset * -1}px) scale(0.985)`
          }
        : {
            opacity: 0,
            transform: `translateX(${slideOffset}px) scale(0.985)`
          };

  return (
    <Link
      to={`/images/${image.id}`}
      className={`group block glass-card overflow-hidden transition-shadow duration-200 ${className}`}
    >
      <div className="relative aspect-[3/4] bg-black/20">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={image.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transform-gpu transition-[transform,opacity] ease-out"
            style={{
              ...animStyle,
              transitionDuration: `${animationMs}ms`,
              transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
              willChange: "transform, opacity"
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
            No preview
          </div>
        )}

        <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white/90">
          {isAlbum ? "Album" : "Ảnh"}
        </div>

        {canNavigate ? (
          <>
            <button
              type="button"
              onClick={(event) => handleNavigate(-1, event)}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white/80 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
              aria-label="Previous image"
            >
              <span aria-hidden>&lt;</span>
            </button>
            <button
              type="button"
              onClick={(event) => handleNavigate(1, event)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white/80 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
              aria-label="Next image"
            >
              <span aria-hidden>&gt;</span>
            </button>
            <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white/90">
              {displayIndex}/{resolvedTotal}
            </div>
          </>
        ) : null}
      </div>
      <div className="p-4 space-y-1">
        <div className="text-sm font-medium text-white/90 truncate">
          {image.title}
        </div>
        {image.description ? (
          <div className="text-xs text-white/50 truncate">
            {image.description}
          </div>
        ) : null}
        <div className="text-xs text-white/40">
          {isAlbum ? `Album · ${resolvedTotal} ảnh` : "Ảnh"}
        </div>
      </div>
    </Link>
  );
}
