import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, ShieldCheck, Upload } from "lucide-react";
import { z } from "zod";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/customer/queries";

const passwordSchema = z.object({
  password: z.string().min(8, "At least 8 characters").max(128),
});

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

  const phone = (user?.user_metadata?.phone as string | undefined) ?? "Not set";

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

  return (
    <CustomerLayout>
      <PageHeader
        eyebrow="Account"
        title="Profile & security"
        description="Your name, email, and phone are locked for security. Update your photo or password any time."
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
            <LockedField id="fullName" label="Full name" value={profile?.full_name ?? "—"} />
            <LockedField id="email" label="Email" value={user?.email ?? "—"} />
            <LockedField id="phone" label="Phone" value={phone} />
          </div>

          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Contact support to change your name, email, or phone.
          </p>
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
    </CustomerLayout>
  );
};

type LockedFieldProps = { id: string; label: string; value: string };

const LockedField = ({ id, label, value }: LockedFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} value={value} disabled className="h-11 rounded-2xl border-0 bg-muted" />
  </div>
);

export { SettingsPage };
export default SettingsPage;
