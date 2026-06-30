import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Business } from "@/lib/business/queries";

type Bank = { name: string; code: string; slug: string };

type Props = { business: Business };

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("paystack-subaccount", { body });
  if (error) throw new Error(error.message);
  const payload = data as T & { error?: string };
  if ((payload as { error?: string })?.error) {
    throw new Error((payload as { error: string }).error);
  }
  return payload;
}

export const PaystackSubaccountSetup = ({ business }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>(business.name ?? "");
  const [contactPhone, setContactPhone] = useState<string>(business.phone ?? "");
  const [resolvedName, setResolvedName] = useState<string | null>(null);

  const alreadyConnected = !!business.paystack_subaccount_code;
  const canConfigure = business.is_verified === true && business.is_onboarded === true;

  const { data: banksData, isLoading: loadingBanks } = useQuery({
    queryKey: ["paystack-banks"],
    queryFn: () => invoke<{ banks: Bank[] }>({ action: "list_banks" }),
    enabled: !alreadyConnected && canConfigure,
    staleTime: 1000 * 60 * 60,
  });

  const banks = useMemo(
    () => (banksData?.banks ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [banksData],
  );

  const resolveMutation = useMutation({
    mutationFn: () =>
      invoke<{ account_name: string }>({
        action: "resolve_account",
        bank_code: bankCode,
        account_number: accountNumber,
      }),
    onSuccess: (data) => setResolvedName(data.account_name),
    onError: (err: Error) => {
      setResolvedName(null);
      toast({ title: "Could not verify account", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    setResolvedName(null);
  }, [bankCode, accountNumber]);

  const createMutation = useMutation({
    mutationFn: () =>
      invoke<{ subaccount_code: string }>({
        action: "create",
        business_id: business.id,
        business_name: businessName.trim(),
        settlement_bank: bankCode,
        account_number: accountNumber,
        primary_contact_email: business.email ?? undefined,
        primary_contact_name: resolvedName ?? businessName.trim(),
        primary_contact_phone: contactPhone || undefined,
      }),
    onSuccess: async (data) => {
      toast({
        title: "Payout account connected",
        description: `Subaccount ${data.subaccount_code} is live. You can start selling.`,
      });
      await qc.invalidateQueries({ queryKey: ["my-business"] });
    },
    onError: (err: Error) =>
      toast({ title: "Could not connect payout account", description: err.message, variant: "destructive" }),
  });

  if (alreadyConnected) {
    return (
      <Card className="rounded-3xl border-0 bg-foreground text-background shadow-card">
        <CardContent className="flex items-start gap-3 p-5">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold">Payouts connected</h2>
            <p className="mt-1 text-sm opacity-80">
              Customer payments are split automatically into your bank account after each order completes.
            </p>
            <p className="mt-2 font-mono text-xs opacity-70">
              Subaccount: {business.paystack_subaccount_code}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canConfigure) {
    return (
      <Card className="rounded-3xl border-0 shadow-card">
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldCheck className="mt-0.5 h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="font-display text-lg font-bold">Finish verification first</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Once an admin approves your documents, this section will unlock so you can connect your
              bank account and start receiving payouts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const canResolve = bankCode && /^\d{6,20}$/.test(accountNumber);
  const canSubmit = canResolve && businessName.trim().length > 1 && !!resolvedName;

  return (
    <Card className="rounded-3xl border-0 shadow-card">
      <CardContent className="p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold">Connect your payout account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We create a secure Paystack subaccount linked to your bank so order payments split to you
            automatically — no manual steps.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="businessName">Trading name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="bank">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode} disabled={loadingBanks}>
              <SelectTrigger id="bank">
                <SelectValue placeholder={loadingBanks ? "Loading banks…" : "Select your bank"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {banks.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="account">Account number</Label>
            <Input
              id="account"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              maxLength={20}
              placeholder="e.g. 1234567890"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="phone">Contact phone (optional)</Label>
            <Input
              id="phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => resolveMutation.mutate()}
              disabled={!canResolve || resolveMutation.isPending}
            >
              {resolveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify account"
              )}
            </Button>
            {resolvedName && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4" /> {resolvedName}
              </span>
            )}
          </div>

          <Button
            type="button"
            size="lg"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Connect payout account"
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            We never store your full bank details. Paystack holds them securely; we only keep the
            subaccount reference used to route your share of each payment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
