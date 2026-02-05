import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { webMemories, webMemoryUrl } from "../data/webMemories";

export default function WebDetail() {
  const { slug } = useParams();
  const memory = webMemories.find((item) => item.slug === slug);

  if (!slug) {
    return (
      <div className="min-h-screen text-white/50 p-6">Not found.</div>
    );
  }

  if (!memory) {
    return (
      <div className="min-h-screen px-5 py-8 md:px-10">
        <div className="max-w-[1000px] mx-auto space-y-4">
          <Link
            to="/web"
            className="inline-flex self-start items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M14.7 5.3 9 11l5.7 5.7-1.4 1.4L6.2 11l7.1-7.1 1.4 1.4z" />
            </svg>
            Quay lại Web
          </Link>
          <div className="glass-panel p-6 text-sm text-white/60">
            Không tìm thấy trang web này.
          </div>
        </div>
      </div>
    );
  }

  const url = webMemoryUrl(memory.slug);

  if (!url) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang chuẩn bị web memory."
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Link
              to="/web"
              className="inline-flex self-start items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M14.7 5.3 9 11l5.7 5.7-1.4 1.4L6.2 11l7.1-7.1 1.4 1.4z" />
              </svg>
              Quay lại Web
            </Link>
            <div className="text-xl font-medium text-white">{memory.title}</div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
          >
            Mở trong tab mới
          </a>
        </div>

        <div className="glass-panel overflow-hidden border border-white/10">
          <iframe
            title={memory.title}
            src={url}
            className="w-full h-[75vh] md:h-[80vh] bg-black/30"
          />
        </div>
      </div>
    </div>
  );
}
