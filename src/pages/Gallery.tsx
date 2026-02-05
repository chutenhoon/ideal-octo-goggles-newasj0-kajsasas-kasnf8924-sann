import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "../api/client";
import ShortCard, { ShortItem } from "../components/ShortCard";
import VideoCard, { VideoItem } from "../components/VideoCard";
import Loading from "../components/Loading";
import { useSearch } from "../contexts/SearchContext";

export default function Gallery() {
  const { query } = useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => apiFetch<VideoItem[]>("/api/videos")
  });

  const { data: shorts, isLoading: shortsLoading } = useQuery({
    queryKey: ["shorts"],
    queryFn: () => apiFetch<ShortItem[]>("/api/shorts")
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((video) =>
      video.title.toLowerCase().includes(needle)
    );
  }, [data, query]);

  const filteredShorts = useMemo(() => {
    if (!shorts) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return shorts;
    return shorts.filter((short) =>
      short.title.toLowerCase().includes(needle)
    );
  }, [shorts, query]);

  if (isLoading || shortsLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang gom lại các ký ức để hiển thị."
      />
    );
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-medium text-white">Video</h1>
          <p className="text-sm text-white/50">
            Những đoạn video kỷ niệm.
          </p>
        </div>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : filteredShorts.length === 0 ? (
          <div className="text-white/50 text-sm">
            {query ? "Không tìm thấy nội dung phù hợp." : "Chưa có video nào."}
          </div>
        ) : null}

        {filteredShorts.length > 0 ? (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.4em] text-white/35">
              Shorts
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredShorts.map((short) => (
                <ShortCard key={short.id} short={short} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
