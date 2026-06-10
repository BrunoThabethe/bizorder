import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Send, Sparkles, Eye, FlaskConical } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { sb } from "@/lib/admin/queries";

type Tone = "friendly" | "professional" | "promotional";

const fetchActiveSubscriberCount = async (): Promise<number> => {
  const { count, error } = await sb
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
};

const AdminAiAssistantPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<Tone>("friendly");
  const [cta, setCta] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: recipientCount = 0 } = useQuery({
    queryKey: ["admin", "newsletter-count"],
    queryFn: fetchActiveSubscriberCount,
    refetchInterval: 30_000,
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-draft-newsletter", {
        body: { brief, tone, cta: cta || undefined },
      });
      if (error) throw error;
      return data as { subject: string; html: string };
    },
    onSuccess: (data) => {
      setSubject(data.subject ?? "");
      setBody(data.html ?? "");
      toast({ title: "Draft ready", description: "Edit anything you like before sending." });
    },
    onError: (err: Error) =>
      toast({ title: "Could not draft email", description: err.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("No admin email on file");
      const { data, error } = await supabase.functions.invoke("send-newsletter-broadcast", {
        body: { subject, html: body, testEmail: user.email, saveAsCampaign: false },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast({ title: "Test email sent", description: "Check your inbox." }),
    onError: (err: Error) =>
      toast({ title: "Test failed", description: err.message, variant: "destructive" }),
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-newsletter-broadcast", {
        body: { subject, html: body, saveAsCampaign: true, title: subject },
      });
      if (error) throw error;
      return data as { sent: number; failed: number; total: number };
    },
    onSuccess: (data) => {
      setConfirmOpen(false);
      toast({
        title: "Broadcast complete",
        description: `Sent to ${data.sent} of ${data.total} subscribers${data.failed ? ` (${data.failed} failed)` : ""}.`,
      });
    },
    onError: (err: Error) => {
      setConfirmOpen(false);
      toast({ title: "Broadcast failed", description: err.message, variant: "destructive" });
    },
  });

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">AI newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft an email with AI or write your own, then send it to every active newsletter subscriber.
          </p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-5 p-6">
            <Tabs defaultValue="ai">
              <TabsList className="rounded-2xl">
                <TabsTrigger value="ai" className="rounded-xl">
                  <Sparkles className="mr-1.5 h-4 w-4" /> Draft with AI
                </TabsTrigger>
                <TabsTrigger value="manual" className="rounded-xl">
                  Write myself
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brief">What is this email about?</Label>
                  <Textarea
                    id="brief"
                    rows={4}
                    placeholder="e.g. Announce that early access starts next Monday and invite waitlist members to claim a founding discount."
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    maxLength={2000}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta">Call to action (optional)</Label>
                    <Input
                      id="cta"
                      placeholder="e.g. Claim your founding discount"
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => draftMutation.mutate()}
                  disabled={brief.trim().length < 5 || draftMutation.isPending}
                >
                  {draftMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate draft
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Skip the AI and write directly in the editor below. HTML is supported.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Editor</h2>
              <span className="text-xs text-muted-foreground">
                Sending to <span className="font-semibold text-foreground">{recipientCount}</span> active
                {recipientCount === 1 ? " subscriber" : " subscribers"}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject line</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="e.g. Early access opens Monday"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Email body (HTML)</Label>
              <Textarea
                id="body"
                rows={16}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={100_000}
                className="font-mono text-xs"
                placeholder="<p>Hi there,</p><p>...</p>"
              />
              <p className="text-xs text-muted-foreground">
                {body.length.toLocaleString()} / 100,000 characters
              </p>
            </div>

            {body.trim() && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Label>
                <div
                  className="rounded-2xl border bg-muted/40 p-4 text-sm"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => testMutation.mutate()}
                disabled={!canSend || testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                Send test to me
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend || recipientCount === 0}
              >
                <Send className="h-4 w-4" /> Send to newsletter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {recipientCount} subscribers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will email every active newsletter subscriber right now. You can't undo a send.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={broadcastMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                broadcastMutation.mutate();
              }}
              disabled={broadcastMutation.isPending}
            >
              {broadcastMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Yes, send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAiAssistantPage;
