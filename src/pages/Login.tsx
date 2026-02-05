import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetchVoid, ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useAuth();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (data?.ok) {
      navigate("/", { replace: true });
    }
  }, [data, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetchVoid("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ key })
      });
      const destination =
        (location.state as { from?: { pathname: string } })?.from?.pathname ||
        "/";
      navigate(destination, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to unlock this vault.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel w-full max-w-sm p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-medium text-white">Memory Locked</h1>
          <p className="text-sm text-white/50">Enter your VMS key.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="Access key"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 focus:outline-none focus:ring-1 focus:ring-white/20"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-white/10 text-white/90 py-3 text-sm font-medium hover:bg-white/20 transition disabled:opacity-50"
          >
            {isSubmitting ? "Unlocking…" : "Unlock"}
          </button>
        </form>

        {error ? <p className="text-sm text-white/60">{error}</p> : null}
      </div>
    </div>
  );
}
