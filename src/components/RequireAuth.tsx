import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loading from "./Loading";
import { ApiError } from "../api/client";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data, isLoading, error } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    const status = (error as ApiError).status;
    if (status === 401) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center text-white/60 text-sm">
        Unable to verify access.
      </div>
    );
  }

  if (!data?.ok) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
