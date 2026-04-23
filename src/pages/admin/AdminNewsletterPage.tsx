import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchSubscribers, formatNumber, toggleSubscriber } from "@/lib/admin/queries";
import { useToast } from "@/hooks/use-toast";

const AdminNewsletterPage = () => {
  const [q, setQ] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "subscribers"], queryFn: fetchSubscribers });

  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) => toggleSubscriber(input.id, input.isActive),
    onSuccess: () => {
      toast({ title: "Subscriber updated" });
      queryClient.invalidateQueries({ queryKey: ["admin", "subscribers"] });
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q) return list;
    const term = q.toLowerCase();
    return list.filter((s) => s.email.toLowerCase().includes(term) || (s.full_name ?? "").toLowerCase().includes(term));
  }, [data, q]);

  const active = (data ?? []).filter((s) => s.is_active).length;

  const exportCsv = () => {
    const rows = [["email", "full_name", "source", "is_active", "created_at"]];
    (data ?? []).forEach((s) =>
      rows.push([s.email, s.full_name ?? "", s.source ?? "", String(s.is_active), s.created_at]),
    );
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Newsletter list</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatNumber(active)} active · {formatNumber(data?.length ?? 0)} total
            </p>
          </div>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <Input placeholder="Search by email or name…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-2xl" />

            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No subscribers yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-semibold">{s.email}</TableCell>
                      <TableCell className="text-sm">{s.full_name ?? "—"}</TableCell>
                      <TableCell>
                        {s.source ? <Badge className="border-0 bg-muted text-foreground">{s.source}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: s.id, isActive: v })}
                        />
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

export default AdminNewsletterPage;
