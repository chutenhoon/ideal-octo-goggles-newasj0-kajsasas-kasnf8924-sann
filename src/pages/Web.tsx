import { useMemo } from "react";
import WebCard from "../components/WebCard";
import { useSearch } from "../contexts/SearchContext";
import { webMemories } from "../data/webMemories";

export default function Web() {
  const { query } = useSearch();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return webMemories;
    return webMemories.filter((memory) =>
      [memory.title, memory.subtitle || ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query]);

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-medium text-white">Web</h1>
          <p className="text-sm text-white/50">
            Những trang web kỷ niệm đã lưu lại.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((memory) => (
            <WebCard key={memory.slug} memory={memory} />
          ))}
          {filtered.length === 0 ? (
            <div className="text-white/50 text-sm">
              {query ? "Không tìm thấy web nào." : "Chưa có web nào."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
