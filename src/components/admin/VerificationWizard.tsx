import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  fetchVerificationChecks,
  logAdminAction,
  setBusinessVerified,
  setVerificationCheck,
  VERIFICATION_STEPS,
  type VerificationStep,
} from "@/lib/admin/queries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type VerificationWizardProps = {
  businessId: string | null;
  businessName: string;
  isVerified: boolean;
  onClose: () => void;
};

/**
 * Five-step verification flow for South African informal businesses
 * that don't have a CIPC registration number.
 */
export const VerificationWizard = ({ businessId, businessName, isVerified, onClose }: VerificationWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<VerificationStep, string>>({
    operating_proof: "",
    identity_check: "",
    address_check: "",
    references_check: "",
    online_presence: "",
  });

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ["admin", "verification-checks", businessId],
    queryFn: () => fetchVerificationChecks(businessId!),
    enabled: !!businessId,
  });

  useEffect(() => {
    if (!checks.length) return;
    setNotes((prev) => {
      const next = { ...prev };
      checks.forEach((c) => {
        if (c.notes) next[c.step] = c.notes;
      });
      return next;
    });
  }, [checks]);

  const stepMutation = useMutation({
    mutationFn: async (input: { step: VerificationStep; isCompleted: boolean; notes: string | null }) => {
      await setVerificationCheck(businessId!, input.step, input.isCompleted, input.notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "verification-checks", businessId] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (verify: boolean) => {
      await setBusinessVerified(businessId!, verify);
      if (user) {
        await logAdminAction(
          user.id,
          verify ? "business.verified" : "business.unverified",
          "business",
          businessId!,
          { steps_completed: completedCount, total_steps: VERIFICATION_STEPS.length },
        );
      }
    },
    onSuccess: () => {
      toast({ title: "Verification updated" });
      queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
      onClose();
    },
  });

  const completedSteps = new Set(checks.filter((c) => c.is_completed).map((c) => c.step));
  const completedCount = completedSteps.size;
  const allDone = completedCount === VERIFICATION_STEPS.length;
  const progressPct = Math.round((completedCount / VERIFICATION_STEPS.length) * 100);

  return (
    <Dialog open={!!businessId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verify {businessName}</DialogTitle>
          <DialogDescription>
            Tick each step as you confirm it. Designed for informal businesses without a CIPC registration number.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold">{completedCount} of {VERIFICATION_STEPS.length} steps complete</span>
                <span className="text-muted-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>

            <ol className="space-y-3">
              {VERIFICATION_STEPS.map((step, idx) => {
                const isDone = completedSteps.has(step.key);
                return (
                  <li key={step.key} className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={step.key}
                        checked={isDone}
                        onCheckedChange={(checked) =>
                          stepMutation.mutate({
                            step: step.key,
                            isCompleted: !!checked,
                            notes: notes[step.key] || null,
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <label htmlFor={step.key} className="block cursor-pointer">
                          <span className="text-xs font-semibold text-muted-foreground">Step {idx + 1}</span>
                          <p className="font-semibold">{step.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                        </label>
                        <Textarea
                          placeholder="Notes (e.g. ID number checked, referee names, link to Facebook page)"
                          value={notes[step.key]}
                          onChange={(e) => setNotes((n) => ({ ...n, [step.key]: e.target.value }))}
                          onBlur={() => {
                            if (notes[step.key]) {
                              stepMutation.mutate({
                                step: step.key,
                                isCompleted: isDone,
                                notes: notes[step.key],
                              });
                            }
                          }}
                          className="min-h-[60px] text-xs"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Save & close</Button>
          {isVerified ? (
            <Button variant="destructive" onClick={() => finalizeMutation.mutate(false)} disabled={finalizeMutation.isPending}>
              Revoke verification
            </Button>
          ) : (
            <Button
              onClick={() => finalizeMutation.mutate(true)}
              disabled={!allDone || finalizeMutation.isPending}
              title={allDone ? "Mark as verified" : "Complete all 5 steps first"}
            >
              <CheckCircle2 className="h-4 w-4" />
              {finalizeMutation.isPending ? "Saving…" : "Mark verified"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
