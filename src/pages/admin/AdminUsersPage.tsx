import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminDeleteUser, fetchAllProfiles, fetchUserDetail, logAdminAction } from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const AdminUsersPage = () => {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("all");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: fetchAllProfiles });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin", "user-detail", detailUserId],
    queryFn: () => fetchUserDetail(detailUserId!),
    enabled: !!detailUserId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await adminDeleteUser(userId);
      if (currentUser) {
        await logAdminAction(currentUser.id, "user.deleted", "user", userId, {}, "critical");
      }
    },
    onSuccess: () => {
      toast({ title: "User permanently deleted", description: "They will need to sign up again to return." });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setConfirmDeleteId(null);
      setDetailUserId(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not delete user";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    },
  });

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
                    <TableHead className="text-right">Actions</TableHead>
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
                    const isSelf = currentUser?.id === p.id;
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
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setDetailUserId(p.id)}>
                              <Eye className="h-4 w-4" /> View
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isSelf}
                              title={isSelf ? "You cannot delete your own account" : "Permanently delete user"}
                              onClick={() => setConfirmDeleteId(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* User detail dialog */}
      <Dialog open={!!detailUserId} onOpenChange={(open) => !open && setDetailUserId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>Everything we know about this account.</DialogDescription>
          </DialogHeader>
          {loadingDetail || !detail ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5 text-sm">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h3>
                <div className="grid gap-2 rounded-2xl bg-muted/40 p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Full name</span>
                    <span className="font-medium">{detail.profile.full_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium break-all">{detail.profile.email}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Business name</span>
                    <span className="font-medium">{detail.profile.business_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono text-xs">{detail.profile.id}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Joined</span>
                    <span>{new Date(detail.profile.created_at).toLocaleString("en-GB")}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roles</h3>
                <div className="flex flex-wrap gap-1">
                  {detail.roles.length === 0 ? (
                    <span className="text-muted-foreground">No roles assigned</span>
                  ) : (
                    detail.roles.map((r) => (
                      <Badge key={r} className="border-0 bg-foreground text-background">
                        {r}
                      </Badge>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved addresses & phone</h3>
                {detail.addresses.length === 0 ? (
                  <p className="text-muted-foreground">No saved addresses.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.addresses.map((a) => (
                      <div key={a.id} className="rounded-2xl bg-muted/40 p-4">
                        <p className="font-semibold">{a.label} — {a.recipient}</p>
                        <p className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postal_code ?? ""}, {a.country}</p>
                        {a.phone && <p className="mt-1 text-xs">📞 {a.phone}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {detail.ownedBusinesses.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owned businesses</h3>
                  <div className="space-y-2">
                    {detail.ownedBusinesses.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
                        <div>
                          <p className="font-semibold">{b.name}</p>
                          <p className="text-xs text-muted-foreground">/{b.slug}</p>
                        </div>
                        <div className="flex gap-1">
                          {b.is_verified && <Badge className="border-0 bg-foreground text-background">Verified</Badge>}
                          {b.is_published ? (
                            <Badge className="border-0 bg-foreground/15 text-foreground">Live</Badge>
                          ) : (
                            <Badge className="border-0 bg-muted text-muted-foreground">Hidden</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</h3>
                <p className="mt-1">Total orders placed: <span className="font-semibold">{detail.orderCount}</span></p>
              </section>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDetailUserId(null)}>Close</Button>
            {detail && currentUser?.id !== detail.profile.id && (
              <Button variant="destructive" onClick={() => setConfirmDeleteId(detail.profile.id)}>
                <Trash2 className="h-4 w-4" /> Delete user
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This wipes the profile, roles, addresses and notifications, and removes the auth account. They will need to sign up again from scratch. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Yes, delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUsersPage;
