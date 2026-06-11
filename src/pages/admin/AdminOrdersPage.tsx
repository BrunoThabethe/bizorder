import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAllOrders, formatPrice } from "@/lib/admin/queries";

const STATUS_TONE: Record<string, string> = {
  awaiting_payment: "bg-accent/20 text-foreground",
  pending: "bg-foreground text-background",
  accepted: "bg-foreground/15 text-foreground",
  in_progress: "bg-foreground/85 text-background",
  ready: "bg-foreground/20 text-foreground",
  out_for_delivery: "bg-foreground/30 text-foreground",
  ready_for_review: "bg-foreground text-background",
  completed: "bg-foreground/10 text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

const AdminOrdersPage = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "orders"], queryFn: fetchAllOrders });

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return (
        o.id.toLowerCase().includes(term) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o as any).businesses?.name?.toLowerCase().includes(term) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o as any).profiles?.email?.toLowerCase().includes(term)
      );
    });
  }, [data, q, status]);

  const statusOptions = ["all", "awaiting_payment", "pending", "accepted", "in_progress", "ready", "out_for_delivery", "ready_for_review", "completed", "cancelled"];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders monitor</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live view of every order on the platform.</p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input placeholder="Search by order ID, business or customer email…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-2xl" />
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${status === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders match these filters.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const oa = o as any;
                    return (
                      <TableRow
                        key={o.id}
                        onClick={() => navigate(`/admin/orders/${o.id}`)}
                        className="cursor-pointer transition-colors hover:bg-muted/60"
                      >
                        <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold">{oa.profiles?.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{oa.profiles?.email ?? "—"}</p>
                        </TableCell>
                        <TableCell className="text-sm">{oa.businesses?.name ?? "—"}</TableCell>
                        <TableCell className="font-semibold">{formatPrice(Number(o.total ?? 0), o.currency)}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_TONE[o.status] ?? ""} border-0`}>{o.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("en-GB")}
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

export default AdminOrdersPage;
