"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Menu, User, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileNav } from "./MobileNav";

interface SearchContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  caseNumber: string | null;
}

interface SearchDeal {
  id: string;
  title: string;
  contactName: string | null;
  stageName: string | null;
  stageColor: string | null;
}

interface SearchResults {
  contacts: SearchContact[];
  deals: SearchDeal[];
}

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResults = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(value), 250);
  };

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(path);
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const hasContacts = results && results.contacts.length > 0;
  const hasDeals = results && results.deals.length > 0;
  const hasResults = hasContacts || hasDeals;

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b bg-card px-3 md:px-6">
      <div className="flex-1 flex items-center gap-2 md:gap-4">
        <div ref={containerRef} className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results && query.length >= 2 && setOpen(true)}
            className="pl-9 bg-muted/50 h-9 md:h-10 text-sm"
          />

          {open && results && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg overflow-hidden z-50 max-h-[400px] overflow-y-auto">
              {loading && (
                <div className="p-3 text-sm text-muted-foreground text-center">Buscando...</div>
              )}

              {!loading && !hasResults && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No se encontraron resultados para &ldquo;{query}&rdquo;
                </div>
              )}

              {hasContacts && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    Clientes
                  </div>
                  {results!.contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(`/contacts/${c.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="rounded-full bg-blue-100 p-1.5 shrink-0">
                        <User className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.email || c.phone || (c.caseNumber ? `Exp. ${c.caseNumber}` : "Sin datos")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {hasDeals && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    Casos
                  </div>
                  {results!.deals.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelect(`/deals/${d.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="rounded-full bg-purple-100 p-1.5 shrink-0">
                        <Briefcase className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {d.contactName || "Sin cliente"}
                          {d.stageName && ` — ${d.stageName}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Button variant="ghost" size="icon" className="relative cursor-pointer hidden md:inline-flex">
        <Bell className="h-5 w-5" />
      </Button>
    </header>
  );
}
