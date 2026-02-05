import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { SearchProvider } from "../contexts/SearchContext";

export default function MainLayout() {
  const [query, setQuery] = useState("");

  return (
    <SearchProvider value={{ query, setQuery }}>
      <div className="min-h-screen">
        <Navbar />
        <Outlet />
      </div>
    </SearchProvider>
  );
}
