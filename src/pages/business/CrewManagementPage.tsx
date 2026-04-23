import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, UserMinus, UserCheck } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchCrew, fetchMyBusiness } from "@/lib/business/queries";
import { cn } from "@/lib/utils";

const CrewManagementPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: business } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });

  const { data: crew = [] } = useQuery({
    queryKey: ["business-crew", business?.id],
    queryFn: () => fetchCrew(business!.id),
    enabled: !!business?.id,
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("Set up your business profile first");
      // Sign up the crew user. Owner stays signed in via supabase.auth.admin alternative not available client-side,
      // so we'll restore session after.
      const currentSession = (await supabase.auth.getSession()).data.session;
      const { data: signup, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName, role: "crew" } },
      });
      if (signErr) throw signErr;
      const newUserId = signup.user?.id;
      if (!newUserId) throw new Error("Could not create user");

      // Restore owner's session (signUp signs the new user in)
      if (currentSession) await supabase.auth.setSession(currentSession);

      // Add crew_member row + ensure crew role
      const { error: cmErr } = await supabase.from("crew_members" as never).insert({
        business_id: business.id,
        user_id: newUserId,
        display_name: displayName,
        role_title: roleTitle || null,
        is_active: true,
      });
      if (cmErr) throw cmErr;
      await supabase.from("user_roles").insert({ user_id: newUserId, role: "crew" });
    },
    onSuccess: () => {
      setOpen(false);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setRoleTitle("");
      qc.invalidateQueries({ queryKey: ["business-crew", business?.id] });
      toast({ title: "Crew member added" });
    },
    onError: (e: Error) => toast({ title: "Could not add", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("crew_members" as never).update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-crew", business?.id] }),
  });

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Team"
        title="Crew management"
        description="Add workers and let them update only the jobs you assign."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add crew
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a crew member</DialogTitle>
                <DialogDescription>
                  Workers can only see jobs you assign to them. They cannot see finances or business analytics.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cn">Display name</Label>
                  <Input id="cn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ct">Role title</Label>
                  <Input id="ct" placeholder="e.g. Driver, Stylist" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ce">Login email</Label>
                  <Input id="ce" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp">Temporary password</Label>
                  <Input id="cp" type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={!email || !password || !displayName || create.isPending}>
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create crew login"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {crew.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No crew yet. Add a worker to assign jobs to them.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {crew.map((c) => (
            <Card key={c.id} className="rounded-3xl border-0 shadow-card">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{c.display_name}</p>
                  <p className="text-xs text-muted-foreground">{c.role_title ?? "Crew member"}</p>
                  <span
                    className={cn(
                      "mt-2 inline-block rounded-full px-3 py-0.5 text-[11px] font-semibold",
                      c.is_active ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {c.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggle.mutate({ id: c.id, active: !c.is_active })}
                >
                  {c.is_active ? (
                    <>
                      <UserMinus className="h-4 w-4" /> Disable
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" /> Enable
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </BusinessLayout>
  );
};

export { CrewManagementPage };
export default CrewManagementPage;
