import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, ShieldCheck, Upload } from "lucide-react";
import { z } from "zod";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMyProfile,
  fetchMyUserChangeRequests,
  submitUserChangeRequest,
} from "@/lib/customer/queries";

const passwordSchema = z.object({
  password: z.string().min(8, "At least 8 characters").max(128),
});

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type LockedField = "name" | "email" | "phone";

const FIELD_LABEL: Record<LockedField, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
};

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => fetchMyProfile(user?.id as string),
    enabled: !!user?.id,
  });

  const { data: changeRequests = [] } = useQuery({
    queryKey: ["my-user-change-requests", user?.id],
    queryFn: () => fetchMyUserChangeRequests(user?.id as string),
    enabled: !!user?.id,
  });

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [requestField, setRequestField] = useState<LockedField | null>(null);
  const [requestValue, setRequestValue] = useState("");
  const [requestReason, setRequestReason] = useState("");

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

  const phone =
    (profile as { phone?: string | null } | null | undefined)?.phone ??
    (user?.user_metadata?.phone as string | undefined) ??
    "Not set";

  const fieldValues: Record<LockedField, string> = {
    name: profile?.full_name ?? "—",
    email: user?.email ?? "—",
    phone,
  };

  const pendingByField = new Set(
    changeRequests.filter((r) => r.status === "pending").map((r) => r.field),
  );

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!user || !requestField) return;
      const trimmed = requestValue.trim();
      if (trimmed.length < 2 || trimmed.length > 255) {
        throw new Error("Enter a value between 2 and 255 characters.");
      }
      if (requestField === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new Error("Enter a valid email address.");
      }
      await submitUserChangeRequest({
        userId: user.id,
        field: requestField,
        currentValue: fieldValues[requestField] === "—" ? null : fieldValues[requestField],
        requestedValue: trimmed,
        reason: requestReason.trim() || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Request sent", description: "An admin will review it shortly." });
      setRequestField(null);
      setRequestValue("");
      setRequestReason("");
      qc.invalidateQueries({ queryKey: ["my-user-change-requests", user?.id] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  const onSavePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse({ password: newPassword });
    if (!parsed.success) {
      toast({ title: "Check your password", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    setNewPassword("");
    toast({ title: "Password updated" });
  };

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Use a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: "File too large", description: "Keep avatars under 2MB.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("order-media")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("order-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    if (signError || !signed?.signedUrl) {
      setUploadingAvatar(false);
      toast({ title: "Could not finalise", description: signError?.message ?? "Try again", variant: "destructive" });
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: signed.signedUrl })
      .eq("id", user.id);

    setUploadingAvatar(false);
    if (profileError) {
      toast({ title: "Could not save", description: profileError.message, variant: "destructive" });
      return;
    }

    setAvatarUrl(signed.signedUrl);
    qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast({ title: "Avatar updated" });
  };

  const openRequest = (field: LockedField) => {
    setRequestField(field);
    setRequestValue(fieldValues[field] === "—" ? "" : fieldValues[field]);
    setRequestReason("");
  };

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="Account"
        title="Profile & security"
        description="Your name, email, and phone are locked for security. Request a change and an admin will review it."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Profile</h2>

          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-muted">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-lg font-bold text-muted-foreground">
                  {(profile?.full_name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{profile?.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Max 2MB.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarChange}
            />
            <Button type="button" size="sm" onClick={onPickAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Upload</>}
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            {(["name", "email", "phone"] as LockedField[]).map((field) => {
              const isPending = pendingByField.has(field);
              return (
                <div className="space-y-2" key={field}>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3" /> {FIELD_LABEL[field]}
                    </Label>
                    {isPending ? (
                      <Badge variant="secondary" className="text-[10px]">Pending review</Badge>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Input value={fieldValues[field]} disabled className="h-11 rounded-2xl border-0 bg-muted" />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => openRequest(field)}
                    >
                      Request change
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Locked for security. An admin reviews every change.
          </p>

          {changeRequests.length > 0 ? (
            <div className="mt-5 rounded-2xl bg-muted/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent requests</p>
              <ul className="mt-2 space-y-2">
                {changeRequests.slice(0, 5).map((r) => (
                  <li key={r.id} className="text-xs">
                    <span className="font-semibold">{FIELD_LABEL[r.field as LockedField] ?? r.field}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span>{r.requested_value}</span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">{r.status}</Badge>
                    {r.decision_reason ? (
                      <p className="mt-0.5 text-muted-foreground">Admin note: {r.decision_reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <form onSubmit={onSavePassword} className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Security</h2>
          <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Use 8+ characters with a mix of letters and numbers.
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
              className="h-11 rounded-2xl border-0 bg-muted"
            />
          </div>
          <Button type="submit" size="lg" className="mt-4" disabled={savingPassword}>
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </form>
      </div>

      <Dialog open={!!requestField} onOpenChange={(o) => !o && setRequestField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {requestField ? FIELD_LABEL[requestField].toLowerCase() : ""} change</DialogTitle>
            <DialogDescription>
              An admin will review your request and approve or deny it with a note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>New value</Label>
              <Input
                value={requestValue}
                onChange={(e) => setRequestValue(e.target.value)}
                maxLength={255}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Help the admin understand why."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRequestField(null)}>Cancel</Button>
            <Button onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
              {submitRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
};

export { SettingsPage };
export default SettingsPage;
