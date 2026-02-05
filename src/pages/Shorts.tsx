import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Hls from "hls.js";
import { apiFetch } from "../api/client";
import Loading from "../components/Loading";
import type { ShortItem } from "../components/ShortCard";

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <polygon points="5,3 20,12 5,21" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <rect x="5" y="4" width="5" height="16" rx="1" />
      <rect x="14" y="4" width="5" height="16" rx="1" />
    </svg>
  );
}

function IconVolume({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path
        d="M16 8a4 4 0 0 1 0 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ShortSlide({
  short,
  active
}: {
  short: ShortItem;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.playsInline = true;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const mp4Src = `/api/shorts/${short.slug}/stream`;
    const hlsSrc = `/api/shorts/${short.slug}/hls/index.m3u8`;

    if (!active) {
      video.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute("src");
      video.load();
      return;
    }

    const canNative =
      video.canPlayType("application/vnd.apple.mpegurl") ||
      video.canPlayType("application/x-mpegURL");

    if (canNative) {
      video.src = hlsSrc;
      video.load();
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
    } else {
      video.src = mp4Src;
      video.load();
    }

    video
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setIsPlaying(false);
        if (!video.muted) {
          video.muted = true;
          setMuted(true);
          video.play().then(() => setIsPlaying(true)).catch(() => undefined);
        }
      });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [active, short.slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (!seeking) setCurrentTime(video.currentTime || 0);
    };
    const onLoaded = () => setDuration(video.duration || 0);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("durationchange", onLoaded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("durationchange", onLoaded);
    };
  }, [seeking]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  const handleVolumeChange = (value: number) => {
    const next = Math.max(0, Math.min(1, value));
    setVolume(next);
    setMuted(next === 0);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    setCurrentTime(value);
    if (video) {
      video.currentTime = value;
    }
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center">
      <div className="relative h-full w-full max-w-[420px] md:max-w-[460px] rounded-3xl overflow-hidden bg-black shadow-[0_20px_60px_rgba(0,0,0,0.45)] border border-white/10">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          loop
          muted={muted}
          poster={
            short.thumbnail_key ? `/api/shorts/${short.slug}/thumb` : undefined
          }
          onClick={togglePlay}
        />

        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
          <div className="flex items-center justify-between text-white/90 text-xs mb-3">
            <div className="max-w-[70%] text-sm font-medium">
              {short.title}
            </div>
            <button
              onClick={togglePlay}
              className="h-9 w-9 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Play or pause"
            >
              {isPlaying ? <IconPause /> : <IconPlay />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-white/70 text-[11px]">
            <span className="tabular-nums w-10">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(event) => handleSeek(Number(event.target.value))}
              onPointerDown={() => setSeeking(true)}
              onPointerUp={() => setSeeking(false)}
              className="flex-1"
            />
            <span className="tabular-nums w-10 text-right">
              {formatTime(duration)}
            </span>

            <div
              className="relative"
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button
                onClick={() => setShowVolume((prev) => !prev)}
                className="ml-1 h-8 w-8 rounded-full bg-white/15 text-white flex items-center justify-center"
                aria-label="Mute"
              >
                <IconVolume muted={muted} />
              </button>
              <div
                className={`absolute bottom-full mb-2 right-0 w-24 rounded-full bg-black/70 px-2 py-2 transition ${
                  showVolume
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(event) =>
                    handleVolumeChange(Number(event.target.value))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Shorts() {
  const { slug } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    initialScrollDone.current = false;
  }, [slug]);

  const { data: shorts, isLoading } = useQuery({
    queryKey: ["shorts"],
    queryFn: () => apiFetch<ShortItem[]>("/api/shorts")
  });

  const initialIndex = useMemo(() => {
    if (!shorts || !shorts.length) return 0;
    const idx = shorts.findIndex((item) => item.slug === slug);
    return idx >= 0 ? idx : 0;
  }, [shorts, slug]);

  useEffect(() => {
    if (!shorts || shorts.length === 0) return;
    if (initialScrollDone.current) return;
    const target = itemRefs.current[initialIndex];
    if (target) {
      target.scrollIntoView({ block: "start" });
      setActiveIndex(initialIndex);
      initialScrollDone.current = true;
    }
  }, [shorts, initialIndex]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !shorts || shorts.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index") || 0);
            setActiveIndex(index);
          }
        });
      },
      { root, threshold: 0.75 }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [shorts]);

  if (isLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang tải Shorts."
      />
    );
  }

  if (!shorts || shorts.length === 0) {
    return (
      <div className="min-h-screen px-5 py-8 md:px-10">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <Link
            to="/videos"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80"
          >
            <span aria-hidden>{"←"}</span>
            Quay lại video
          </Link>
          <div className="glass-panel p-6 text-sm text-white/60">
            Chưa có Shorts nào.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6 md:px-10">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80"
        >
          <span aria-hidden>{"←"}</span>
          Quay lại video
        </Link>
        <div
          ref={containerRef}
          className="shorts-scroll h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] overflow-y-auto snap-y snap-mandatory scroll-smooth overscroll-contain touch-pan-y"
        >
          {shorts.map((short, index) => (
            <div
              key={short.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              data-index={index}
              className="snap-start snap-always h-full"
            >
              <ShortSlide short={short} active={index === activeIndex} />
            </div>
          ))}
          <div className="snap-start h-full flex items-center justify-center text-white/60">
            Đã hết video.
          </div>
        </div>
      </div>
    </div>
  );
}
