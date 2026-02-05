import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "../api/client";
import ImageCard, { ImageItem } from "../components/ImageCard";
import Loading from "../components/Loading";
import { useSearch } from "../contexts/SearchContext";

export default function Images() {
  const { query } = useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["images"],
    queryFn: () => apiFetch<ImageItem[]>("/api/images")
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((image) =>
      [image.title, image.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [data, query]);

  if (isLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang gom lại các tấm hình."
      />
    );
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-medium text-white">Hình ảnh</h1>
          <p className="text-sm text-white/50">
            Những khoảnh khắc được lưu lại.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
          {filtered.length === 0 ? (
            <div className="text-white/50 text-sm">
              {query ? "Không tìm thấy hình ảnh." : "Chưa có hình ảnh nào."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
