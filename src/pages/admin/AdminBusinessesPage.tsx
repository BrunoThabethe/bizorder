import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAllBusinesses,
  logAdminAction,
  purgeBusiness,
  restoreBusiness,
  setBusinessPublished,
  softDeleteBusiness,
  type Business,
} from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | "live" | "hidden" | "deleted";

const AdminBusinessesPage = () => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [softTarget, setSoftTarget] = useState<Business | null>(null);
  const [softReason, setSoftReason] = useState("");
  const [purgeTarget, setPurgeTarget] = useState<Business | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "businesses"], queryFn: fetchAllBusinesses });

  const publishMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      await setBusinessPublished(id, value);
      if (user) {
        await logAdminAction(user.id, value ? "business.published" : "business.hidden", "business", id, { value });
      }
    },
    onSuccess: () => {
      toast({ title: "Visibility updated" });
      queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
    },
  });

  const softMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await softDeleteBusiness(id, reason);
    },
    onSuccess: () => {
      toast({ title: "Business removed", description: "Hidden from customers. You can restore or purge it later." });
      setSoftTarget(null);
      setSoftReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
    },
    onError: (e: Error) => toast({ title: "Couldn't remove", description: e.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await restoreBusiness(id);
    },
    onSuccess: () => {
      toast({ title: "Business restored", description: "Re-publish it from the actions menu when ready." });
      queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
    },
    onError: (e: Error) => toast({ title: "Couldn't restore", description: e.message, variant: "destructive" }),
  });

  const purgeMutation = useMutation({
    mutationFn: async (id: string) => {
      await purgeBusiness(id);
    },
    onSuccess: () => {
      toast({ title: "Permanently deleted", description: "All data was wiped." });
      setPurgeTarget(null);
      setPurgeConfirm("");
      queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
    },
    onError: (e: Error) => toast({ title: "Couldn't purge", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = q.toLowerCase();
    return list.filter((b) => {
      if (filter === "deleted" && !b.deleted_at) return false;
      if (filter !== "deleted" && b.deleted_at) return false;
      if (filter === "live" && !b.is_published) return false;
      if (filter === "hidden" && b.is_published) return false;
      if (!term) return true;
      return (
        b.name.toLowerCase().includes(term) ||
        b.slug.toLowerCase().includes(term) ||
        (b.city ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, q, filter]);

  const filterChips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "hidden", label: "Hidden" },
    { key: "deleted", label: "Deleted" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Businesses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse providers, control visibility, and remove problem accounts. Verify a business in the{" "}
            <Link to="/admin/verifications" className="font-semibold underline underline-offset-4">verification center</Link>.
          </p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              {filterChips.map((c) => (
                <Button
                  key={c.key}
                  size="sm"
                  variant={filter === c.key ? "default" : "secondary"}
                  onClick={() => setFilter(c.key)}
                  className="rounded-full"
                >
                  {c.label}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Search by name, slug or city…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 rounded-2xl"
            />

            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No businesses found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((b) => {
                      const deleted = !!b.deleted_at;
                      return (
                        <TableRow key={b.id} className={deleted ? "opacity-70" : ""}>
                          <TableCell>
                            <p className="text-sm font-semibold">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.slug}</p>
                          </TableCell>
                          <TableCell className="text-sm">{b.city ?? "—"}</TableCell>
                          <TableCell className="text-sm">
                            {Number(b.rating_avg).toFixed(1)}{" "}
                            <span className="text-muted-foreground">({b.rating_count})</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {deleted && (
                                <Badge className="border-0 bg-destructive text-destructive-foreground">Deleted</Badge>
                              )}
                              {!deleted && b.is_verified && (
                                <Badge className="border-0 bg-foreground text-background">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                                </Badge>
                              )}
                              {!deleted &&
                                (b.is_published ? (
                                  <Badge className="border-0 bg-foreground/15 text-foreground">Live</Badge>
                                ) : (
                                  <Badge className="border-0 bg-muted text-muted-foreground">Hidden</Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {!deleted ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant={b.is_published ? "secondary" : "default"}
                                    onClick={() =>
                                      publishMutation.mutate({ id: b.id, value: !b.is_published })
                                    }
                                  >
                                    {b.is_published ? "Hide" : "Publish"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSoftTarget(b);
                                      setSoftReason("");
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => restoreMutation.mutate(b.id)}
                                    disabled={restoreMutation.isPending}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setPurgeTarget(b);
                                      setPurgeConfirm("");
                                    }}
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" /> Permanently delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Soft delete dialog */}
      <Dialog
        open={!!softTarget}
        onOpenChange={(v) => {
          if (!v) {
            setSoftTarget(null);
            setSoftReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {softTarget?.name}?</DialogTitle>
            <DialogDescription>
              The business will be hidden from customers and search. You can restore it any time. Records and orders are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (visible to the owner)</Label>
            <Textarea
              id="reason"
              rows={3}
              value={softReason}
              onChange={(e) => setSoftReason(e.target.value)}
              placeholder="e.g. Repeated unresolved disputes"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSoftTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => softTarget && softMutation.mutate({ id: softTarget.id, reason: softReason.trim() })}
              disabled={softMutation.isPending || softReason.trim().length < 3}
            >
              {softMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge dialog */}
      <Dialog
        open={!!purgeTarget}
        onOpenChange={(v) => {
          if (!v) {
            setPurgeTarget(null);
            setPurgeConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Permanently delete {purgeTarget?.name}?
            </DialogTitle>
            <DialogDescription>
              This wipes the business, all of its services, orders, messages, payouts, reviews, verification documents, and uploads.{" "}
              <span className="font-semibold text-destructive">This cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={purgeConfirm}
              onChange={(e) => setPurgeConfirm(e.target.value)}
              placeholder="DELETE"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPurgeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => purgeTarget && purgeMutation.mutate(purgeTarget.id)}
              disabled={purgeMutation.isPending || purgeConfirm !== "DELETE"}
            >
              {purgeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBusinessesPage;
