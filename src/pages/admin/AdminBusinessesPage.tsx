import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { VerificationWizard } from "@/components/admin/VerificationWizard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAllBusinesses, logAdminAction, setBusinessPublished } from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const AdminBusinessesPage = () => {
  const [q, setQ] = useState("");
  const [verifyTarget, setVerifyTarget] = useState<{ id: string; name: string; isVerified: boolean } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "businesses"], queryFn: fetchAllBusinesses });

  // Verification is now handled inline by the VerificationWizard dialog.


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

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q) return list;
    const term = q.toLowerCase();
    return list.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.slug.toLowerCase().includes(term) ||
        (b.city ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Businesses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage providers, verify identity and control visibility.</p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <Input placeholder="Search by name, slug or city…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-2xl" />

            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No businesses found.</p>
            ) : (
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
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="text-sm font-semibold">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.slug}</p>
                      </TableCell>
                      <TableCell className="text-sm">{b.city ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {Number(b.rating_avg).toFixed(1)} <span className="text-muted-foreground">({b.rating_count})</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {b.is_verified && (
                            <Badge className="border-0 bg-foreground text-background">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                            </Badge>
                          )}
                          {b.is_published ? (
                            <Badge className="border-0 bg-foreground/15 text-foreground">Live</Badge>
                          ) : (
                            <Badge className="border-0 bg-muted text-muted-foreground">Hidden</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => verifyMutation.mutate({ id: b.id, value: !b.is_verified })}
                          >
                            {b.is_verified ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            {b.is_verified ? "Unverify" : "Verify"}
                          </Button>
                          <Button
                            size="sm"
                            variant={b.is_published ? "outline" : "default"}
                            onClick={() => publishMutation.mutate({ id: b.id, value: !b.is_published })}
                          >
                            {b.is_published ? "Hide" : "Publish"}
                          </Button>
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

export default AdminBusinessesPage;
