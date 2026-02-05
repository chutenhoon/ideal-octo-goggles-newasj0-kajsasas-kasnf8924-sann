import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import Loading from "../components/Loading";

type AudioDetail = {
  id: string;
  title: string;
  note_system_error?: number | null;
  description?: string | null;
  audio_key: string;
  thumb_key?: string | null;
  created_at: string;
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AudioDetail() {
  const { id } = useParams();
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTick = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);

  const { data, isLoading } = useQuery({
    queryKey: ["audio", id],
    queryFn: () => apiFetch<AudioDetail>(`/api/audio/${id}`),
    enabled: Boolean(id)
  });

  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    element.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

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

  const handlePlay = () => {
    setIsPlaying(true);
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const togglePlay = async () => {
    const element = audioRef.current;
    if (!element) return;
    if (element.paused) {
      await element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  };

  const handleSeek = (value: number) => {
    const element = audioRef.current;
    if (!element) return;
    element.currentTime = value;
    setCurrentTime(value);
  };

  if (isLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang tải âm thanh."
      />
    );
  }

  if (!data) {
    return <div className="min-h-screen text-white/50 p-6">Not found.</div>;
  }

  const audioSrc = `/media/${data.audio_key}`;
  const noteText = data.note_system_error
    ? "Do lỗi hệ thống không ghi lại được hình ảnh"
    : data.description || null;
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[960px] mx-auto space-y-6">
        <Link
          to="/audio"
          className="inline-flex self-start items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M14.7 5.3 9 11l5.7 5.7-1.4 1.4L6.2 11l7.1-7.1 1.4 1.4z" />
          </svg>
          Quay lại âm thanh
        </Link>

        <div className="glass-panel p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-medium text-white">{data.title}</h1>
            {noteText ? (
              <div className="text-sm text-white/50">{noteText}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className="h-12 w-12 rounded-full bg-white/10 text-white/80 flex items-center justify-center"
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="relative h-2">
                <div className="h-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/50 transition-[width] duration-150 motion-reduce:transition-none"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-white/50">
              <span>Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-24"
              />
            </div>
          </div>

        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handlePause}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration || 0);
          }}
          className="hidden"
        />
        </div>
      </div>
    </div>
  );
}
