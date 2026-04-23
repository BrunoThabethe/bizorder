import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
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

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").max(100),
});

const passwordSchema = z.object({
  password: z.string().min(8, "At least 8 characters").max(128),
});

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => fetchMyProfile(user?.id as string),
    enabled: !!user?.id,
  });

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  const onSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse({ fullName });
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
    qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
  };

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

  return (
    <CustomerLayout>
      <PageHeader eyebrow="Account" title="Profile & security" description="Update your details and password." />

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={onSaveProfile} className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Profile</h2>
          <div className="mt-3 grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled className="h-11 rounded-2xl border-0 bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                required
                className="h-11 rounded-2xl border-0 bg-muted"
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="mt-4" disabled={savingProfile}>
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
          </Button>
        </form>

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

export { SettingsPage };
export default SettingsPage;
