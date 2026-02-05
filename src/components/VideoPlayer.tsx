import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import Hls from "hls.js";
import { useMediaQuery } from "../hooks/useMediaQuery";

const HIDE_DELAY = 2200;

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

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

function IconRewind() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 5a7 7 0 1 1-6.9 8h2.2A5 5 0 1 0 12 7V4l-4 4 4 4V8z" />
    </svg>
  );
}

function IconForward() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 5a7 7 0 1 0 6.9 8h-2.2A5 5 0 1 1 12 7V4l4 4-4 4V8z" />
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

function IconFullscreen() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M4 9V4h5v2H6v3H4zm14-3h-3V4h5v5h-2V6zM6 18h3v2H4v-5h2v3zm12-3h2v5h-5v-2h3v-3z" />
    </svg>
  );
}

function IconTheater() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <rect x="6.5" y="8.5" width="11" height="7" rx="1.5" fill="black" />
    </svg>
  );
}

function ControlButton({
  onClick,
  children,
  label
}: {
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center text-white/80 hover:text-white transition"
    >
      {children}
    </button>
  );
}

export default function VideoPlayer({
  src,
  hlsSrc,
  preferHls = false,
  poster,
  theaterMode = false,
  onToggleTheater
}: {
  src: string;
  hlsSrc?: string;
  preferHls?: boolean;
  poster?: string;
  theaterMode?: boolean;
  onToggleTheater?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const bufferWaitStart = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [pendingPlay, setPendingPlay] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const initialBufferAhead = isMobile
    ? duration
      ? Math.min(duration * 0.5, 120)
      : 30
    : 6;
  const resumeBufferAhead = isMobile
    ? Math.min(12, initialBufferAhead)
    : 4;
  const pendingTarget = useRef(0);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.setAttribute("playsinline", "");
    element.setAttribute("webkit-playsinline", "");
    element.playsInline = true;
    element.preload = "auto";
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    let hls: Hls | null = null;

    const useHls = Boolean(hlsSrc && preferHls);
    const handleNativeError = () => {
      if (useHls && hlsSrc && element.src === hlsSrc) {
        element.src = src;
        element.load();
      }
    };
    element.addEventListener("error", handleNativeError);

    if (useHls && hlsSrc) {
      const nativeSupport =
        element.canPlayType("application/vnd.apple.mpegurl") ||
        element.canPlayType("application/x-mpegURL");
      if (nativeSupport) {
        element.src = hlsSrc;
        element.load();
      } else if (Hls.isSupported()) {
        hls = new Hls();
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data?.fatal) {
            hls?.destroy();
            element.src = src;
            element.load();
          }
        });
        hls.loadSource(hlsSrc);
        hls.attachMedia(element);
      } else {
        element.src = src;
        element.load();
      }
    } else {
      element.src = src;
      element.load();
    }

    return () => {
      element.removeEventListener("error", handleNativeError);
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, hlsSrc, preferHls]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = muted;
  }, [volume, muted]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
    }
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    hideTimer.current = window.setTimeout(() => {
      setShowControls(false);
    }, HIDE_DELAY);
  }, [isPlaying]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const togglePlay = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      const bufferAhead = Math.max(0, buffered - element.currentTime);
      if (isMobile && bufferAhead < initialBufferAhead) {
        setPendingPlay(true);
        pendingTarget.current = initialBufferAhead;
        setIsBuffering(true);
        if (!bufferWaitStart.current) {
          bufferWaitStart.current = performance.now();
        }
        element.play().catch(() => undefined);
        revealControls();
        return;
      }
      element.play().catch(() => undefined);
    } else {
      element.pause();
      setPendingPlay(false);
      bufferWaitStart.current = null;
    }
    revealControls();
  }, [buffered, initialBufferAhead, isMobile, revealControls]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      bufferWaitStart.current = null;
      scheduleHide();
    };
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(element.currentTime || 0);
    const onDuration = () => setDuration(element.duration || 0);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onLoadStart = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onProgress = () => {
      try {
        const ranges = element.buffered;
        if (ranges.length > 0) {
          const current = element.currentTime || 0;
          let end = ranges.end(ranges.length - 1);
          for (let i = 0; i < ranges.length; i += 1) {
            if (current >= ranges.start(i) && current <= ranges.end(i)) {
              end = ranges.end(i);
              break;
            }
          }
          setBuffered(end);
        }
      } catch {
        setBuffered(0);
      }
    };

    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("timeupdate", onTime);
    element.addEventListener("loadedmetadata", onDuration);
    element.addEventListener("waiting", onWaiting);
    element.addEventListener("canplay", onCanPlay);
    element.addEventListener("loadstart", onLoadStart);
    element.addEventListener("playing", onPlaying);
    element.addEventListener("progress", onProgress);

    return () => {
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("timeupdate", onTime);
      element.removeEventListener("loadedmetadata", onDuration);
      element.removeEventListener("waiting", onWaiting);
      element.removeEventListener("canplay", onCanPlay);
      element.removeEventListener("loadstart", onLoadStart);
      element.removeEventListener("playing", onPlaying);
      element.removeEventListener("progress", onProgress);
    };
  }, [scheduleHide]);

  useEffect(() => {
    if (!pendingPlay) return;
    const bufferAhead = Math.max(0, buffered - currentTime);
    const waited = bufferWaitStart.current
      ? performance.now() - bufferWaitStart.current
      : 0;
    const target =
      pendingTarget.current || (isMobile ? 30 : 6);
    if (bufferAhead >= target || waited > 6000) {
      setPendingPlay(false);
      bufferWaitStart.current = null;
      pendingTarget.current = 0;
      videoRef.current?.play().catch(() => undefined);
    }
  }, [
    buffered,
    currentTime,
    duration,
    pendingPlay,
    isMobile
  ]);

  useEffect(() => {
    if (!isMobile || !isPlaying) return;
    const bufferAhead = Math.max(0, buffered - currentTime);
    if (bufferAhead < Math.max(3, resumeBufferAhead / 2) && !pendingPlay) {
      pendingTarget.current = resumeBufferAhead;
      setPendingPlay(true);
      setIsBuffering(true);
      bufferWaitStart.current = performance.now();
      videoRef.current?.pause();
    }
  }, [buffered, currentTime, isMobile, isPlaying, pendingPlay, resumeBufferAhead]);


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = () => revealControls();
    const onLeave = () => {
      if (isPlaying) {
        setShowControls(false);
      }
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("touchstart", onMove, { passive: true });
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("touchstart", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [isPlaying, revealControls]);

  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) {
        const orientation = screen.orientation;
        if (orientation?.unlock) {
          orientation.unlock();
        }
      }
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, []);

  const handleSeek = (value: number) => {
    const element = videoRef.current;
    if (!element || !Number.isFinite(value)) return;
    element.currentTime = value;
    setCurrentTime(value);
    revealControls();
  };

  const handleSkip = (delta: number) => {
    const element = videoRef.current;
    if (!element) return;
    element.currentTime = Math.min(
      Math.max(0, element.currentTime + delta),
      duration
    );
    revealControls();
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
    revealControls();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (!container || !video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      return;
    }

    if (isMobile && video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    const target = container.requestFullscreen ? container : video;
    target.requestFullscreen().catch(() => {
      if (video.requestFullscreen) {
        video.requestFullscreen().catch(() => undefined);
      }
    });

    const orientation = screen.orientation;
    if (orientation?.lock) {
      orientation.lock("landscape").catch(() => undefined);
    }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;
  const showBuffering = isBuffering || (pendingPlay && !isPlaying);
  const shouldShowControls = showControls || !isPlaying || showBuffering;
  const showLoadBar = !isMobile && (showBuffering || !isPlaying);

  return (
    <div
      ref={containerRef}
      className="glass-panel video-shell w-full mx-auto overflow-hidden"
    >
      <div
        className={`video-stage relative bg-black/80 aspect-video mx-auto ${
          theaterMode ? "w-full" : "max-h-[80vh]"
        }`}
        style={
          theaterMode
            ? { maxHeight: "calc(100vh - 260px)" }
            : undefined
        }
      >
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full object-contain"
          playsInline
          preload="auto"
          onClick={togglePlay}
        />

        {showLoadBar ? (
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-white/10">
            <div
              className="h-full bg-rose-400"
              style={{
                width: `${Math.max(bufferedPercent, progressPercent)}%`
              }}
            />
          </div>
        ) : null}

        {showBuffering ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loader-ring" />
          </div>
        ) : null}

        {!isPlaying && !showBuffering ? (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 m-auto h-14 w-14 md:h-16 md:w-16 rounded-full border border-white/40 text-white/90 flex items-center justify-center"
          >
            <IconPlay />
          </button>
        ) : null}

        <div
          className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 pointer-events-none ${
            shouldShowControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          <div className="relative px-4 pb-4 md:px-5 md:pb-5 space-y-3 text-xs md:text-sm pointer-events-auto">
            <div className="flex items-center justify-between text-white/70">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="relative h-1.5">
              <div className="h-full bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/25"
                  style={{ width: `${bufferedPercent}%` }}
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
              <div
                className="absolute top-0 left-0 h-1.5 bg-white/70 rounded-full pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-white/80">
              <div className="flex items-center gap-1">
                <ControlButton onClick={togglePlay} label="Play">
                  {isPlaying ? <IconPause /> : <IconPlay />}
                </ControlButton>
                <ControlButton onClick={() => handleSkip(-10)} label="Rewind 10">
                  <IconRewind />
                </ControlButton>
                <ControlButton onClick={() => handleSkip(10)} label="Forward 10">
                  <IconForward />
                </ControlButton>
              </div>

              <div className="flex items-center gap-1">
                <ControlButton onClick={toggleMute} label="Mute">
                  <IconVolume muted={muted} />
                </ControlButton>
                {!isMobile && onToggleTheater ? (
                  <ControlButton onClick={onToggleTheater} label="Theater mode">
                    <IconTheater />
                  </ControlButton>
                ) : null}
                <ControlButton onClick={toggleFullscreen} label="Fullscreen">
                  <IconFullscreen />
                </ControlButton>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
