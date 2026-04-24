import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { openDispute } from "@/lib/business/queries";

type OpenDisputeButtonProps = {
  orderId: string;
  variant?: "secondary" | "destructive" | "outline";
  fullWidth?: boolean;
};

export const OpenDisputeButton = ({ orderId, variant = "secondary", fullWidth }: OpenDisputeButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const submit = useMutation({
    mutationFn: () => openDispute(orderId, reason.trim(), details.trim() || null),
    onSuccess: () => {
      toast({
        title: "Dispute opened",
        description: "An admin will review and reach out shortly.",
      });
      setOpen(false);
      setReason("");
      setDetails("");
    },
    onError: (e: Error) =>
      toast({ title: "Could not open dispute", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={fullWidth ? "w-full" : undefined}>
          <ShieldAlert className="h-4 w-4" /> Report a problem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a dispute</DialogTitle>
          <DialogDescription>
            Describe what went wrong. An admin reviews disputes and contacts both sides.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="dispute-reason">Reason</Label>
            <Input
              id="dispute-reason"
              placeholder="Short summary"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dispute-details">Details (optional)</Label>
            <Textarea
              id="dispute-details"
              placeholder="What happened? Include dates and any context."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={2000}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => submit.mutate()}
            disabled={reason.trim().length < 3 || submit.isPending}
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
