import { useEffect } from "react";

export default function WebRedirect() {
  useEffect(() => {
    window.location.href = "/webmemory/index.html";
  }, []);

  return (
    <div className="min-h-screen px-5 py-8 md:px-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="glass-panel p-6 text-sm text-white/60">
          Dang chuyen den Web Memory...
        </div>
      </div>
    </div>
  );
}
