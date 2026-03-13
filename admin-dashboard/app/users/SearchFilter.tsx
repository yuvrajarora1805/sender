"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/users?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by username..."
        className="input-ring text-sm py-1.5 pr-3 pl-[34px] w-[220px]"
      />
    </form>
  );
}
