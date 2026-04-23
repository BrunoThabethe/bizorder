import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, Search, Star } from "lucide-react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Input } from "@/components/ui/input";
import { fetchPublishedBusinesses } from "@/lib/customer/queries";
import { cn } from "@/lib/utils";

const BrowseBusinessesPage = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | "all">("all");

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["browse-businesses"],
    queryFn: fetchPublishedBusinesses,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    businesses.forEach((b) => b.category && set.add(b.category));
    return Array.from(set);
  }, [businesses]);

  const filtered = businesses.filter((b) => {
    const matchQuery = query.trim()
      ? `${b.name} ${b.tagline ?? ""} ${b.category ?? ""}`.toLowerCase().includes(query.toLowerCase())
      : true;
    const matchCategory = category === "all" ? true : b.category === category;
    return matchQuery && matchCategory;
  });

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="Marketplace"
        title="Browse businesses"
        description="Find verified local providers and start an order in minutes."
      />

      <div className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag, or category"
              className="h-11 rounded-2xl border-0 bg-muted pl-11"
              maxLength={120}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <CategoryChip active={category === "all"} onClick={() => setCategory("all")}>
              All
            </CategoryChip>
            {categories.map((c) => (
              <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </CategoryChip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-card shadow-card" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full grid place-items-center rounded-3xl bg-card p-10 text-center shadow-card">
            <Compass className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-display text-base font-bold">No businesses match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the category filter.</p>
          </div>
        ) : (
          filtered.map((b) => (
            <Link
              key={b.id}
              to={`/customer/business/${b.slug}`}
              className="group rounded-3xl bg-card p-5 shadow-card transition-transform hover:-translate-y-1"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-foreground text-sm font-bold text-background">
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.category ?? "Local provider"}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <Star className="h-3 w-3 fill-current" /> {Number(b.rating_avg).toFixed(1)}
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{b.tagline ?? b.description ?? "Tap to view services."}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{b.city ?? "Online"}</span>
                <span className="font-semibold text-foreground transition-transform group-hover:translate-x-1">View →</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </CustomerLayout>
  );
};

const CategoryChip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
      active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

export { BrowseBusinessesPage };
export default BrowseBusinessesPage;
