import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useIntersection } from "../hooks/useIntersection";

type AudioItem = {
  id: string;
  title: string;
  note_system_error?: number | null;
  description?: string | null;
  audio_key: string;
  thumb_key?: string | null;
};

const fallbackIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/70" fill="currentColor">
    <path d="M12 4a7 7 0 1 0 7 7h-2a5 5 0 1 1-5-5V4zm1 4h-2v6l4 2 1-1.7-3-1.5V8z" />
  </svg>
);

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AudioCard({ audio }: { audio: AudioItem }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTick = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shouldLoad, setShouldLoad] = useState(false);

  const audioSrc = `/media/${audio.audio_key}`;
  const hasThumb = Boolean(audio.thumb_key);
  const noteText = audio.note_system_error
    ? "Do lỗi hệ thống không ghi lại được hình ảnh"
    : audio.description || null;

  const isVisible = useIntersection(cardRef, {
    rootMargin: "200px",
    threshold: 0.15
  });

  useEffect(() => {
    if (isVisible) {
      setShouldLoad(true);
    }
  }, [isVisible]);

  const stopRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tick = (time: number) => {
    const element = audioRef.current;
    if (!element) return;
    if (time - lastTick.current > 80) {
      lastTick.current = time;
      setCurrentTime(element.currentTime || 0);
      setDuration(element.duration || 0);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => stopRaf();
  }, []);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !shouldLoad) return;
    if (!element.src) {
      element.src = audioSrc;
      element.load();
    }
  }, [audioSrc, shouldLoad]);

  const togglePlay = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const element = audioRef.current;
    if (!element) return;
    if (!element.src) {
      element.src = audioSrc;
    }
    if (element.paused) {
      await element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    stopRaf();
  };

  const handleLoaded = () => {
    const element = audioRef.current;
    if (!element) return;
    setDuration(element.duration || 0);
  };

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <Link
      ref={cardRef}
      to={`/audio/${audio.id}`}
      className="block glass-card overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            {hasThumb ? (
              <img
                src={`/media/${audio.thumb_key}`}
                alt=""
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              fallbackIcon
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white/90 truncate">
              {audio.title}
            </div>
            <div className="text-xs text-white/40">
              {formatTime(duration)}
            </div>
          </div>
          <button
            type="button"
            onClick={togglePlay}
            className="h-9 w-9 rounded-full bg-white/10 text-white/80 flex items-center justify-center"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            )}
          </button>
        </div>

        {noteText ? (
          <div className="text-xs text-white/50">{noteText}</div>
        ) : null}

        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-white/40 transition-[width] duration-150 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        <audio
          ref={audioRef}
          src={shouldLoad ? audioSrc : undefined}
          preload="metadata"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handlePause}
          onLoadedMetadata={handleLoaded}
          onDurationChange={handleLoaded}
        />
      </div>
    </Link>
  );
}
