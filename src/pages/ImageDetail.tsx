import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import Loading from "../components/Loading";

type AlbumImage = {
  id: string;
  image_key: string;
  thumb_key?: string | null;
  sort_order?: number | null;
};

type ImageDetail =
  | {
      type: "single";
      id: string;
      title: string;
      description?: string | null;
      image_key: string;
      thumb_key?: string | null;
      created_at: string;
    }
  | {
      type: "album";
      id: string;
      title: string;
      description?: string | null;
      created_at: string;
      images: AlbumImage[];
      count?: number;
      active_image_id?: string;
    };

export default function ImageDetail() {
  const { id } = useParams();
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["image", id],
    queryFn: () => apiFetch<ImageDetail>(`/api/images/${id}`),
    enabled: Boolean(id)
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [data?.id]);

  useEffect(() => {
    if (!data || data.type !== "album") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index") || 0);
            setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.6 }
    );
    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [data]);

  useEffect(() => {
    if (!data || data.type !== "album" || !data.active_image_id) return;
    const idx = data.images.findIndex((img) => img.id === data.active_image_id);
    if (idx >= 0) {
      itemRefs.current[idx]?.scrollIntoView({ block: "start" });
      setActiveIndex(idx);
    }
  }, [data]);

  if (isLoading) {
    return (
      <Loading
        title="Đợi xíu nha"
        subtitle="Đang tải hình ảnh."
      />
    );
  }

  if (!data) {
    return <div className="min-h-screen text-white/50 p-6">Not found.</div>;
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[1100px] mx-auto space-y-6">
        <Link
          to="/images"
          className="inline-flex self-start items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M14.7 5.3 9 11l5.7 5.7-1.4 1.4L6.2 11l7.1-7.1 1.4 1.4z" />
          </svg>
          Quay lại hình ảnh
        </Link>

        {data.type === "single" ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-medium text-white">{data.title}</h1>
              {data.description ? (
                <p className="text-sm text-white/50 mt-1">
                  {data.description}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center">
              <img
                src={`/media/${data.image_key}`}
                alt={data.title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <h1 className="text-2xl font-medium text-white">
                  {data.title}
                </h1>
                {data.description ? (
                  <p className="text-sm text-white/50 mt-1">
                    {data.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="sticky top-24 z-20 flex justify-end">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70 shadow-glass backdrop-blur">
                <div>
                  {Math.min(activeIndex + 1, data.images.length || 1)}/
                  {data.images.length || 1}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(0, activeIndex - 1);
                    itemRefs.current[next]?.scrollIntoView({
                      block: "start",
                      behavior: "smooth"
                    });
                  }}
                  className="h-8 w-8 rounded-full bg-white/10 text-white/80 hover:bg-white/20"
                  aria-label="Previous image"
                >
                  <span aria-hidden>{"‹"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(
                      data.images.length - 1,
                      activeIndex + 1
                    );
                    itemRefs.current[next]?.scrollIntoView({
                      block: "start",
                      behavior: "smooth"
                    });
                  }}
                  className="h-8 w-8 rounded-full bg-white/10 text-white/80 hover:bg-white/20"
                  aria-label="Next image"
                >
                  <span aria-hidden>{"›"}</span>
                </button>
              </div>
            </div>

            <div id="album-scroll" className="space-y-6">
              {data.images.map((image, index) => (
                <div
                  key={image.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  data-index={index}
                  className="flex justify-center scroll-mt-24"
                >
                  <img
                    src={`/media/${image.image_key}`}
                    alt={`${data.title} ${index + 1}`}
                    loading="lazy"
                    className="w-auto max-w-full max-h-[75vh] object-contain rounded-2xl"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
