import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EmailChangeCard } from "@/components/settings/EmailChangeCard";
import { fetchSystemSettings, logAdminAction, upsertSystemSetting } from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type TestResult =
  | { type: "success"; orgName: string }
  | { type: "error"; message: string }
  | null;

const AdminSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ key: "", value: "{}", description: "" });
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [testLoading, setTestLoading] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "system-settings"], queryFn: fetchSystemSettings });

  const handleTestTradeSafe = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const data = await tradeSafeQuery<{ apiProfile: { name: string; token: string } }>(GET_MY_TOKEN, {});
      const orgName = data.apiProfile?.name ?? "Unknown organization";
      setTestResult({ type: "success", orgName });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResult({ type: "error", message });
    } finally {
      setTestLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(form.value);
      } catch {
        throw new Error("Value must be valid JSON.");
      }
      const key = form.key.trim();
      await upsertSystemSetting(key, parsed, form.description.trim() || null, user!.id);
      await logAdminAction(user!.id, "system_setting.upsert", "system_setting", undefined, { key }, "warning");
    },
    onSuccess: () => {
      toast({ title: "Setting saved" });
      setForm({ key: "", value: "{}", description: "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "system-settings"] });
    },
    onError: (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">System settings & access control</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform-wide flags and configuration values.</p>
        </div>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">TradeSafe connection</h2>
            <Button
              onClick={handleTestTradeSafe}
              disabled={testLoading}
              className="w-full sm:w-auto"
            >
              {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Test TradeSafe connection
            </Button>
            {testResult?.type === "success" && (
              <Alert variant="success" className="rounded-xl border-success/30 bg-success/10">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Connected</AlertTitle>
                <AlertDescription>{testResult.orgName}</AlertDescription>
              </Alert>
            )}
            {testResult?.type === "error" && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection failed</AlertTitle>
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <EmailChangeCard currentEmail={user?.email ?? null} />
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">Add or update setting</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  placeholder="e.g. payouts.auto_release_days"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Short note about this setting"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Value (JSON)</Label>
              <Textarea
                rows={4}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.key || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save setting
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-lg font-bold">Existing settings</h2>
            {isLoading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No settings configured.</p>
            ) : (
              (data ?? []).map((s) => (
                <div key={s.id} className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-bold">{s.key}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.updated_at).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-background p-3 text-xs">
                    {JSON.stringify(s.value, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
