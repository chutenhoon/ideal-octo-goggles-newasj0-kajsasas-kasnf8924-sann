import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import Loading from "../components/Loading";
import AudioCard from "../components/AudioCard";

type AudioItem = {
  id: string;
  title: string;
  note_system_error?: number | null;
  description?: string | null;
  audio_key: string;
  thumb_key?: string | null;
  created_at: string;
};

export default function Audio() {
  const { data, isLoading } = useQuery({
    queryKey: ["audios"],
    queryFn: () => apiFetch<AudioItem[]>("/api/audio")
  });

  if (isLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang gom lại các đoạn ghi âm."
      />
    );
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-medium text-white">Âm thanh</h1>
          <p className="text-sm text-white/50">
            Các đoạn ghi âm từ ký ức.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map((audio) => (
            <AudioCard key={audio.id} audio={audio} />
          ))}
          {(data || []).length === 0 ? (
            <div className="text-white/50 text-sm">
              Chưa có âm thanh nào.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
