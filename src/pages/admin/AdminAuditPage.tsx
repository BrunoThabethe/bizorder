import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAuditLogs } from "@/lib/admin/queries";

const TONE: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-foreground/15 text-foreground",
  critical: "bg-destructive/15 text-destructive",
};

const AdminAuditPage = () => {
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  const { data, isLoading } = useQuery({ queryKey: ["admin", "audit"], queryFn: fetchAuditLogs });

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((l) => {
      if (severity !== "all" && l.severity !== severity) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return (
        l.action.toLowerCase().includes(term) ||
        (l.entity_type ?? "").toLowerCase().includes(term) ||
        (l.entity_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, q, severity]);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Audit logs & security events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every administrative action and security signal.</p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input placeholder="Search by action, entity…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-2xl" />
              <div className="flex flex-wrap gap-2">
                {["all", "info", "warning", "critical"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${severity === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No audit events yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("en-GB")}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{l.action}</TableCell>
                      <TableCell className="text-xs">
                        {l.entity_type ?? "—"}
                        {l.entity_id && <span className="ml-1 font-mono text-muted-foreground">{l.entity_id.slice(0, 8)}…</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.actor_id?.slice(0, 8) ?? "—"}…</TableCell>
                      <TableCell>
                        <Badge className={`${TONE[l.severity]} border-0`}>{l.severity}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAuditPage;
