import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import VideoCard, { VideoItem } from "../components/VideoCard";
import Loading from "../components/Loading";
import VideoPlayer from "../components/VideoPlayer";

type VideoDetail = {
  id: string;
  slug: string;
  title: string;
  created_at: string;
  size_bytes: number;
  status: string;
  thumbnail_key?: string | null;
};

const posterSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0d1014" />
        <stop offset="1" stop-color="#121820" />
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#g)" />
  </svg>`
);

const fallbackPoster = `data:image/svg+xml,${posterSvg}`;

export default function Watch() {
  const { slug } = useParams();
  const [theaterMode, setTheaterMode] = useState(false);
  const [preferHls, setPreferHls] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["video", slug],
    queryFn: () => apiFetch<VideoDetail>(`/api/videos/${slug}`),
    enabled: Boolean(slug)
  });

  const { data: allVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => apiFetch<VideoItem[]>("/api/videos")
  });

  const recommendations =
    allVideos?.filter((video) => video.slug !== slug) || [];

  const sidebarVideos = useMemo(
    () => recommendations.slice(0, 10),
    [recommendations]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("vms_theater_mode");
    if (saved) {
      setTheaterMode(saved === "1");
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile =
      ua.includes("android") ||
      ua.includes("iphone") ||
      ua.includes("ipad") ||
      ua.includes("ipod") ||
      ua.includes("mobile");
    setPreferHls(isMobile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("vms_theater_mode", theaterMode ? "1" : "0");
  }, [theaterMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  if (isLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang tải video để phát mượt hơn."
      />
    );
  }

  if (!data) {
    return <div className="min-h-screen text-white/50 p-6">Not found.</div>;
  }

  const posterSrc = data.thumbnail_key
    ? `/api/videos/${data.slug}/thumb`
    : fallbackPoster;

  return (
    <div className="min-h-screen px-5 py-6 md:px-10">
      <div
        className={`mx-auto space-y-6 ${
          theaterMode ? "max-w-none" : "max-w-[1600px]"
        }`}
      >
        <div className="flex flex-col gap-2">
          <Link
            to="/"
            className="inline-flex self-start items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M14.7 5.3 9 11l5.7 5.7-1.4 1.4L6.2 11l7.1-7.1 1.4 1.4z" />
            </svg>
            Quay lại trang chính
          </Link>
        </div>

        {theaterMode ? (
          <div className="space-y-8">
            <div className="w-full">
              <VideoPlayer
                src={`/api/videos/${data.slug}/stream`}
                hlsSrc={`/api/videos/${data.slug}/hls/index.m3u8`}
                preferHls={preferHls}
                poster={posterSrc}
                theaterMode
                onToggleTheater={() => setTheaterMode((prev) => !prev)}
              />
            </div>
            <h1 className="text-xl md:text-2xl font-medium text-white">
              {data.title}
            </h1>

            {sidebarVideos.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Xem thêm
                  </h2>
                  <Link
                    to="/videos"
                    className="text-xs text-white/50 hover:text-white/80"
                  >
                    Xem tất cả
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sidebarVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="space-y-6">
              <VideoPlayer
                src={`/api/videos/${data.slug}/stream`}
                hlsSrc={`/api/videos/${data.slug}/hls/index.m3u8`}
                preferHls={preferHls}
                poster={posterSrc}
                theaterMode={false}
                onToggleTheater={() => setTheaterMode((prev) => !prev)}
              />
              <h1 className="text-xl md:text-2xl font-medium text-white">
                {data.title}
              </h1>
            </div>

            {sidebarVideos.length > 0 ? (
              <aside className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Xem thêm
                  </h2>
                  <Link
                    to="/videos"
                    className="text-xs text-white/50 hover:text-white/80"
                  >
                    Xem tất cả
                  </Link>
                </div>
                <div className="grid gap-4">
                  {sidebarVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
