type LoadingProps = {
  title?: string;
  subtitle?: string;
};

export default function Loading({
  title = "Doi xi nha",
  subtitle = "He thong dang load de dam bao trai nghiem muot ma."
}: LoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel relative w-full max-w-md overflow-hidden p-6 md:p-8 text-center">
        <div className="glass-shimmer" aria-hidden="true" />
        <div className="relative space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-glass">
            <div className="loader-ring" />
          </div>
          <div className="space-y-1">
            <div className="text-sm uppercase tracking-[0.35em] text-white/40">
              {title}
            </div>
            <div className="text-sm text-white/70">
              {subtitle}
              <span className="loading-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 bg-white/30 loader-bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
