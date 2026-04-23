import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingBag, Store } from "lucide-react";

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Required").max(100);

export const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [signUpRole, setSignUpRole] = useState<"customer" | "business">("customer");

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase.rpc("get_primary_role", { _user_id: userId });
    const role = data as string | null;
    if (role === "admin") navigate("/admin");
    else if (role === "business") navigate("/business");
    else navigate("/dashboard");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(signInEmail);
      passwordSchema.parse(signInPassword);
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0].message : "Invalid input";
      toast({ title: "Check your details", description: message, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data.user) await redirectByRole(data.user.id);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(signUpEmail);
      passwordSchema.parse(signUpPassword);
      nameSchema.parse(fullName);
      if (signUpRole === "business") nameSchema.parse(businessName);
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0].message : "Invalid input";
      toast({ title: "Check your details", description: message, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          business_name: signUpRole === "business" ? businessName : null,
          role: signUpRole,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Welcome to BizOrder", description: "Account created. Redirecting…" });
    if (data.user) await redirectByRole(data.user.id);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-hero p-4">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-2xl font-bold">
          <span className="bg-gradient-primary inline-block h-8 w-8 rounded-lg shadow-glow" />
          <span>BizOrder</span>
        </Link>

        <Card className="border-border/60 bg-gradient-card shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" autoComplete="email" maxLength={255}
                      value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pw">Password</Label>
                    <Input id="si-pw" type="password" autoComplete="current-password" maxLength={72}
                      value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <RadioGroup
                      value={signUpRole}
                      onValueChange={(v) => setSignUpRole(v as "customer" | "business")}
                      className="grid grid-cols-2 gap-2"
                    >
                      <Label htmlFor="r-customer"
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 transition-smooth hover:border-primary/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
                        <RadioGroupItem id="r-customer" value="customer" />
                        <ShoppingBag className="h-4 w-4" />
                        <span className="text-sm font-medium">Customer</span>
                      </Label>
                      <Label htmlFor="r-business"
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 transition-smooth hover:border-primary/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
                        <RadioGroupItem id="r-business" value="business" />
                        <Store className="h-4 w-4" />
                        <span className="text-sm font-medium">Business</span>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" maxLength={100} value={fullName}
                      onChange={(e) => setFullName(e.target.value)} required />
                  </div>

                  {signUpRole === "business" && (
                    <div className="space-y-2 animate-fade-up">
                      <Label htmlFor="su-biz">Business name</Label>
                      <Input id="su-biz" maxLength={100} value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)} required />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" autoComplete="email" maxLength={255}
                      value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">Password</Label>
                    <Input id="su-pw" type="password" autoComplete="new-password" maxLength={72}
                      value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">At least 8 characters</p>
                  </div>

                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
