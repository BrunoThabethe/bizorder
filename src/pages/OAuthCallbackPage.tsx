import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authorization…");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  useEffect(() => {
    if (error) {
      setStatus("error");
      setMessage(errorDescription || error);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code was returned.");
      return;
    }

    // TODO: Exchange the code for an access token via your backend edge function.
    // Example:
    // fetch("/functions/v1/tradesafe-oauth-token", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ code, state }),
    // })
    //
    // For now, we acknowledge the code and let the user continue.
    setStatus("success");
    setMessage("Authorization code received. Complete setup in your dashboard.");
  }, [code, error, errorDescription, state]);

  return (
    <SiteLayout>
      <section className="grid min-h-screen place-items-center px-4 pt-32 pb-16 md:pt-40">
        <div className="w-full max-w-md rounded-2xl bg-background/40 p-8 text-center backdrop-blur-md md:p-10">
          <div className="mx-auto inline-flex items-center gap-2">
            <BrandMark size={40} />
            <span className="font-display text-xl font-bold">BizOrder</span>
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">
            {status === "loading" && "Connecting account…"}
            {status === "success" && "Account connected"}
            {status === "error" && "Connection failed"}
          </h1>

          <div className="mt-6 flex justify-center">
            {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {status === "success" && <CheckCircle className="h-8 w-8 text-green-500" />}
            {status === "error" && <AlertCircle className="h-8 w-8 text-destructive" />}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{message}</p>

          {status === "success" && (
            <div className="mt-6 space-y-3">
              <Button onClick={() => navigate("/admin/settings")} className="w-full">
                Go to Settings
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Back to home
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 space-y-3">
              <Button onClick={() => window.location.reload()} className="w-full">
                Try again
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Back to home
              </Button>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
