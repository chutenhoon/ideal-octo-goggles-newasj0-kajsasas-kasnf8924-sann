import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useIntersection } from "../hooks/useIntersection";
import { useMediaQuery } from "../hooks/useMediaQuery";

export type VideoItem = {
  id: string;
  slug: string;
  title: string;
  created_at: string;
  status: string;
  thumbnail_key?: string | null;
};

const posterSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0d1014" />
        <stop offset="1" stop-color="#121820" />
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#g)" />
  </svg>`
);

const poster = `data:image/svg+xml,${posterSvg}`;

export default function VideoCard({ video }: { video: VideoItem }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [fallbackFrameReady, setFallbackFrameReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const isVisible = useIntersection(cardRef, {
    rootMargin: "200px",
    threshold: 0.2
  });

  useEffect(() => {
    if (isVisible) {
      setShouldLoad(true);
    }
  }, [isVisible]);

  const src = useMemo(
    () => `/api/videos/${video.slug}/stream`,
    [video.slug]
  );

  const hasThumb = Boolean(video.thumbnail_key);
  const showVideoFallback = (!hasThumb || thumbError) && !isMobile;

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !previewActive || !shouldLoad) return;
    if (!element.src) {
      element.src = src;
    }
    element.play().catch(() => undefined);
  }, [previewActive, shouldLoad, src]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !shouldLoad) return;

    const onLoaded = () => {
      setDuration(element.duration || 0);
    };

    element.addEventListener("loadedmetadata", onLoaded);

    if (!element.src) {
      element.src = src;
    }
    if (element.preload !== "metadata") {
      element.preload = "metadata";
    }
    element.load();

    return () => {
      element.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [shouldLoad, src]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !shouldLoad || !showVideoFallback) return;
    if (!element.src) {
      element.src = src;
      element.load();
    }

    const onLoaded = () => {
      const target = Math.min(1, Math.max(0.1, element.duration * 0.05 || 0.1));
      if (element.currentTime < target) {
        try {
          element.currentTime = target;
        } catch {
          setFallbackFrameReady(true);
        }
      }
    };

    const onSeeked = () => {
      setFallbackFrameReady(true);
      element.pause();
    };

    element.addEventListener("loadedmetadata", onLoaded);
    element.addEventListener("seeked", onSeeked);

    return () => {
      element.removeEventListener("loadedmetadata", onLoaded);
      element.removeEventListener("seeked", onSeeked);
    };
  }, [shouldLoad, showVideoFallback, src]);

  const handlePreviewStart = () => {
    if (isMobile) return;
    if (!shouldLoad) setShouldLoad(true);
    setPreviewActive(true);
  };

  const handlePreviewStop = () => {
    if (isMobile) return;
    setPreviewActive(false);
    const element = videoRef.current;
    if (element) {
      element.pause();
      if (!showVideoFallback) {
        element.currentTime = 0;
      }
    }
  };

  const thumbSrc = `/api/videos/${video.slug}/thumb`;
  const videoVisible = previewActive || (showVideoFallback && fallbackFrameReady);
  const preloadMode =
    shouldLoad && (previewActive || showVideoFallback)
      ? "auto"
      : shouldLoad
        ? "metadata"
        : "none";

  const formatDuration = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "";
    const total = Math.floor(value);
    const seconds = total % 60;
    const minutes = Math.floor(total / 60);
    const hours = Math.floor(minutes / 60);
    const mm = hours > 0 ? minutes % 60 : minutes;
    if (hours > 0) {
      return `${hours}:${mm.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  const durationLabel = formatDuration(duration);

  return (
    <Link
      to={`/watch/${video.slug}`}
      className="block group"
      aria-label={`Open ${video.title}`}
    >
      <div
        ref={cardRef}
        className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform duration-300 group-hover:translate-y-[-2px] group-hover:ring-2 group-hover:ring-sky-400/40 group-hover:border-white/20"
        onMouseEnter={handlePreviewStart}
        onMouseLeave={handlePreviewStop}
        onFocus={handlePreviewStart}
        onBlur={handlePreviewStop}
      >
        {(!thumbError && hasThumb && !thumbLoaded) ||
        (showVideoFallback && !fallbackFrameReady) ? (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        ) : null}

        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />

        {hasThumb && !thumbError ? (
          <img
            src={thumbSrc}
            alt={video.title}
            loading="eager"
            onLoad={() => setThumbLoaded(true)}
            onError={() => {
              setThumbError(true);
              setThumbLoaded(true);
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              thumbLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}

        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload={preloadMode}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoVisible ? "opacity-100" : "opacity-0"
          }`}
        />

        {durationLabel ? (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white/90">
            {durationLabel}
          </div>
        ) : null}
      </div>
      <div className="mt-3">
        <div className="text-sm font-medium text-white/90 leading-5 max-h-10 overflow-hidden">
          {video.title}
        </div>
      </div>
    </Link>
  );
}
