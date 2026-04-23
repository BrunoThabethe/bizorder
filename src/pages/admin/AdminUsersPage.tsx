import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAllProfiles } from "@/lib/admin/queries";

const AdminUsersPage = () => {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("all");
  const { data, isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: fetchAllProfiles });

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((p) => {
      if (role !== "all" && !p.roles.includes(role as never)) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return (p.full_name ?? "").toLowerCase().includes(term) || p.email.toLowerCase().includes(term);
    });
  }, [data, q, role]);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Users & roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customers, providers, crew and admins on the platform.</p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-2xl" />
              <div className="flex flex-wrap gap-2">
                {["all", "customer", "business", "crew", "admin"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${role === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No users match these filters.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const initials = (p.full_name ?? p.email)
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-foreground text-xs text-background">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold">{p.full_name ?? "—"}</p>
                              {p.business_name && <p className="text-xs text-muted-foreground">{p.business_name}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.roles.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              p.roles.map((r) => (
                                <Badge key={r} className="border-0 bg-muted text-foreground">
                                  {r}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("en-GB")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
