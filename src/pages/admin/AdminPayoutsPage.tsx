import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAllPayouts, formatPrice, updatePayoutStatus, type Payout } from "@/lib/admin/queries";
import { useToast } from "@/hooks/use-toast";

const TONE: Record<string, string> = {
  pending: "bg-foreground/15 text-foreground",
  released: "bg-foreground/85 text-background",
  paid: "bg-foreground text-background",
};

const AdminPayoutsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "payouts"], queryFn: fetchAllPayouts });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; status: Payout["status"] }) => updatePayoutStatus(input.id, input.status),
    onSuccess: () => {
      toast({ title: "Payout updated" });
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
    },
  });

  const totals = (data ?? []).reduce(
    (acc, p) => {
      acc.total += Number(p.amount ?? 0);
      acc[p.status as keyof typeof acc] = (acc[p.status as keyof typeof acc] ?? 0) + Number(p.amount ?? 0);
      return acc;
    },
    { total: 0, pending: 0, released: 0, paid: 0 } as Record<string, number>,
  );

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Escrow & payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Release funds and reconcile provider payouts.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total volume", value: totals.total },
            { label: "Pending", value: totals.pending },
            { label: "Released", value: totals.released },
            { label: "Paid", value: totals.paid },
          ].map((s) => (
            <Card key={s.label} className="rounded-3xl border-0 shadow-card">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-display text-2xl font-bold">{formatPrice(s.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payouts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.business_id.slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs">{p.order_id?.slice(0, 8) ?? "—"}…</TableCell>
                      <TableCell className="font-semibold">{formatPrice(Number(p.amount), p.currency)}</TableCell>
                      <TableCell>
                        <Badge className={`${TONE[p.status]} border-0`}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {p.status === "pending" && (
                            <Button size="sm" onClick={() => updateMutation.mutate({ id: p.id, status: "released" })}>
                              Release
                            </Button>
                          )}
                          {p.status === "released" && (
                            <Button size="sm" onClick={() => updateMutation.mutate({ id: p.id, status: "paid" })}>
                              Mark paid
                            </Button>
                          )}
                        </div>
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

export default AdminPayoutsPage;
