import { Link } from "react-router-dom";
import type { WebMemory } from "../data/webMemories";

export default function WebCard({
  memory
}: {
  memory: WebMemory;
}) {
  return (
    <Link
      to={`/web/${memory.slug}`}
      className="block glass-card overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="p-4 bg-white/5 border-b border-white/10">
        <div className="text-base font-medium text-white/90">
          {memory.title}
        </div>
        {memory.subtitle ? (
          <div className="mt-2 text-sm text-white/60">
            {memory.subtitle}
          </div>
        ) : null}
      </div>
      <div className="px-4 py-3 text-xs text-white/50">
        Nhấn để mở
      </div>
    </Link>
  );
}
