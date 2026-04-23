import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fetchAiSettings, upsertAiSettings, type AiAssistantSettings } from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5",
];

const AdminAiAssistantPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "ai-settings"], queryFn: fetchAiSettings });

  const [form, setForm] = useState({
    is_enabled: true,
    model: "google/gemini-2.5-flash",
    system_prompt: "You are BizOrder's helpful assistant.",
    temperature: 0.7,
    max_tokens: 1024,
  });

  useEffect(() => {
    if (data) {
      setForm({
        is_enabled: data.is_enabled,
        model: data.model,
        system_prompt: data.system_prompt,
        temperature: Number(data.temperature),
        max_tokens: data.max_tokens,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertAiSettings(
        { ...form, updated_by: user!.id } as Partial<AiAssistantSettings> & { updated_by: string },
        data?.id,
      ),
    onSuccess: () => {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-settings"] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">AI assistant control</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure the platform-wide AI assistant.</p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                <div>
                  <p className="font-semibold">Assistant enabled</p>
                  <p className="text-xs text-muted-foreground">Show the AI assistant to users across the platform.</p>
                </div>
                <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))} />
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <div className="flex flex-wrap gap-2">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm((f) => ({ ...f, model: m }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        form.model === m ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">System prompt</Label>
                <Textarea
                  id="prompt"
                  rows={6}
                  value={form.system_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  className="rounded-2xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="temp">Temperature ({form.temperature})</Label>
                  <Input
                    id="temp"
                    type="number"
                    step="0.1"
                    min={0}
                    max={2}
                    value={form.temperature}
                    onChange={(e) => setForm((f) => ({ ...f, temperature: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokens">Max tokens</Label>
                  <Input
                    id="tokens"
                    type="number"
                    min={64}
                    max={8192}
                    value={form.max_tokens}
                    onChange={(e) => setForm((f) => ({ ...f, max_tokens: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save settings
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAiAssistantPage;
