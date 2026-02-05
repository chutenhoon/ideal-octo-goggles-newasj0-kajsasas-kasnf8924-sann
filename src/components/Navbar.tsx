import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetchVoid } from "../api/client";
import { useSearch } from "../contexts/SearchContext";

type MenuItem = {
  label: string;
  to: string;
};

const menuItems: MenuItem[] = [
  { label: "Video", to: "/videos" },
  { label: "Hình ảnh", to: "/images" },
  { label: "Âm thanh", to: "/audio" },
  { label: "Ghi chú", to: "/notes" },
  { label: "Web", to: "/web" }
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { query, setQuery } = useSearch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [drawerOpen]);

  useEffect(() => {
    setDrawerOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await apiFetchVoid("/api/auth/logout", { method: "POST" });
    navigate("/login", { replace: true });
  };

  const drawerItems = useMemo(
    () =>
      menuItems.map((item) => {
        const isActive =
          location.pathname.startsWith(item.to) ||
          (item.to === "/videos" &&
            (location.pathname.startsWith("/watch") ||
              location.pathname.startsWith("/shorts")));
        const base =
          "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition";
        const active = isActive
          ? "bg-white/15 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10";

        return (
          <Link
            key={item.label}
            to={item.to}
            className={`${base} ${active}`}
          >
            <span>{item.label}</span>
          </Link>
        );
      }),
    [location.pathname]
  );

  const brand = (
    <Link to="/" className="flex flex-col items-start">
      <span className="text-base md:text-lg font-medium text-white">
        Memory 168
      </span>
      <span className="text-xs text-white/50 hidden md:block">
        Anniversary Bank
      </span>
    </Link>
  );

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10">
          <div className="hidden md:flex items-center gap-4 py-4">
            <div className="flex items-center gap-3 flex-none">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="h-10 w-10 rounded-full bg-white/10 text-white/80 flex items-center justify-center transition hover:bg-white/15"
                aria-label="Open menu"
              >
                <div className="space-y-1">
                  <span className="block h-0.5 w-4 bg-current" />
                  <span className="block h-0.5 w-4 bg-current opacity-80" />
                  <span className="block h-0.5 w-4 bg-current opacity-60" />
                </div>
              </button>
              {brand}
            </div>

            <div className="flex-1 hidden md:flex justify-center">
              <div className="relative w-full max-w-md">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm kiếm"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <div className="absolute right-1 top-1 bottom-1 px-3 rounded-full bg-white/10 text-white/70 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M10 4a6 6 0 1 0 3.7 10.7l4 4 1.4-1.4-4-4A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 flex-none">
              <button
                onClick={handleLogout}
                className="text-sm text-white/60 hover:text-white/90 transition"
              >
                Khóa
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-3 md:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="h-10 w-10 rounded-full bg-white/10 text-white/80 flex items-center justify-center transition hover:bg-white/15"
                aria-label="Open menu"
              >
                <div className="space-y-1">
                  <span className="block h-0.5 w-4 bg-current" />
                  <span className="block h-0.5 w-4 bg-current opacity-80" />
                  <span className="block h-0.5 w-4 bg-current opacity-60" />
                </div>
              </button>
              {brand}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className="h-9 w-9 rounded-full bg-white/10 text-white/70 flex items-center justify-center"
                aria-label="Search"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M10 4a6 6 0 1 0 3.7 10.7l4 4 1.4-1.4-4-4A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="h-9 w-9 rounded-full bg-white/10 text-white/70 flex items-center justify-center"
                aria-label="Lock"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h1zm2 0h8V8a4 4 0 1 0-8 0v2z" />
                </svg>
              </button>
            </div>
          </div>

          {mobileSearchOpen ? (
            <div className="pb-4 md:hidden">
              <div className="relative w-full">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm kiếm"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <div className="absolute right-1 top-1 bottom-1 px-3 rounded-full bg-white/10 text-white/70 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M10 4a6 6 0 1 0 3.7 10.7l4 4 1.4-1.4-4-4A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 motion-reduce:transition-none ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-ink/95 border-r border-white/10 shadow-2xl transition-transform duration-200 motion-reduce:transition-none ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm text-white/70">Menu</div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="h-8 w-8 rounded-full bg-white/10 text-white/70 flex items-center justify-center"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M6.4 5l12.6 12.6-1.4 1.4L5 6.4 6.4 5zm12.6 1.4L6.4 19l-1.4-1.4L17.6 5l1.4 1.4z" />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-2">
            {drawerItems}
          </div>
        </aside>
      </div>
    </>
  );
}
