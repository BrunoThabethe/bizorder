import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Send } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign, fetchCampaigns, formatNumber, type AiCampaign } from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-foreground/15 text-foreground",
  sent: "bg-foreground text-background",
  archived: "bg-muted text-muted-foreground",
};

const AdminCampaignsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", prompt: "", body: "" });
  const { data, isLoading } = useQuery({ queryKey: ["admin", "campaigns"], queryFn: fetchCampaigns });

  const createMutation = useMutation({
    mutationFn: (status: AiCampaign["status"]) =>
      createCampaign({ ...form, status, createdBy: user!.id }),
    onSuccess: () => {
      toast({ title: "Campaign saved" });
      setForm({ title: "", subject: "", prompt: "", body: "" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "campaigns"] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">AI campaigns</h1>
            <p className="mt-1 text-sm text-muted-foreground">Draft, schedule and track newsletter broadcasts.</p>
          </div>
          <Button onClick={() => setOpen((s) => !s)}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        </div>

        {open && (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Subject line</Label>
                  <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>AI prompt (used to draft the body)</Label>
                <Textarea rows={3} value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea rows={6} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => createMutation.mutate("draft")}>
                  Save draft
                </Button>
                <Button onClick={() => createMutation.mutate("scheduled")}>
                  <Send className="h-4 w-4" /> Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No campaigns yet. Create your first one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {(data ?? []).map((c) => (
              <Card key={c.id} className="rounded-3xl border-0 shadow-card">
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${TONE[c.status]} border-0`}>{c.status}</Badge>
                      <p className="font-display text-lg font-bold">{c.title}</p>
                    </div>
                    {c.subject && <p className="text-sm text-muted-foreground">{c.subject}</p>}
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Recipients</p>
                      <p className="font-display text-lg font-bold">{formatNumber(c.recipients_count)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Opens</p>
                      <p className="font-display text-lg font-bold">{formatNumber(c.opens_count)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                      <p className="font-display text-lg font-bold">{formatNumber(c.clicks_count)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCampaignsPage;
