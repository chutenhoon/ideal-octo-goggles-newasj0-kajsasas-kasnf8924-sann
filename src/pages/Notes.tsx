import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "../api/client";
import Loading from "../components/Loading";
import NoteCard, { NoteItem } from "../components/NoteCard";
import { useSearch } from "../contexts/SearchContext";

export default function Notes() {
  const { query } = useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => apiFetch<NoteItem[]>("/api/notes")
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((note) =>
      [note.title, note.content].join(" ").toLowerCase().includes(needle)
    );
  }, [data, query]);

  if (isLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang gom lại các ghi chú."
      />
    );
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-medium text-white">Ghi chú</h1>
          <p className="text-sm text-white/50">
            Những dòng lưu lại cho riêng mình.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} href={`/notes/${note.id}`} />
          ))}
          {filtered.length === 0 ? (
            <div className="text-white/50 text-sm">
              {query ? "Không tìm thấy ghi chú." : "Chưa có ghi chú nào."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
