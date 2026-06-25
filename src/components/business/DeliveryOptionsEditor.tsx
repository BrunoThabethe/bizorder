import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COURIER_CATALOG,
  PROVIDER_NAME,
  formatRand,
  type DeliveryOption,
  type DeliveryProvider,
} from "@/lib/delivery/catalog";

type Props = {
  options: DeliveryOption[];
  onChange: (next: DeliveryOption[]) => void;
};

export const DeliveryOptionsEditor = ({ options, onChange }: Props) => {
  const [provider, setProvider] = useState<DeliveryProvider>("paxi");
  const [variantId, setVariantId] = useState<string>("");
  const [selfFee, setSelfFee] = useState("");
  const [selfArea, setSelfArea] = useState("");

  const selectedCatalog = COURIER_CATALOG.find((c) => c.provider === provider);
  const selectedVariant = selectedCatalog?.variants.find((v) => v.id === variantId);

  const addCourier = () => {
    if (!selectedCatalog || !selectedVariant) return;
    const id = `${provider}:${variantId}`;
    if (options.some((o) => o.id === id)) return;
    onChange([
      ...options,
      {
        id,
        provider,
        label: `${selectedCatalog.name} — ${selectedVariant.label}`,
        price: selectedVariant.price,
        eta: selectedVariant.eta,
      },
    ]);
    setVariantId("");
  };

  const addSelf = () => {
    const fee = Number(selfFee);
    if (!Number.isFinite(fee) || fee < 0) return;
    if (!selfArea.trim()) return;
    if (options.some((o) => o.provider === "self")) return;
    onChange([
      ...options,
      {
        id: "self",
        provider: "self",
        label: `Self-delivery — ${selfArea.trim()}`,
        price: fee,
        eta: "Arranged with provider",
        area: selfArea.trim(),
      },
    ]);
    setSelfFee("");
    setSelfArea("");
  };

  const remove = (id: string) => onChange(options.filter((o) => o.id !== id));

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-3">
      <div>
        <p className="font-display text-sm font-bold">Delivery options</p>
        <p className="text-[11px] text-muted-foreground">
          Pick which couriers (and prices) you offer for this product. Customers will choose one at checkout and the fee is added to their total.
        </p>
      </div>

      {options.length > 0 && (
        <ul className="space-y-1.5">
          {options.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-background p-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-semibold">{o.label}</p>
                <p className="text-[10px] text-muted-foreground">{o.eta}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold">{formatRand(o.price)}</span>
                <button
                  type="button"
                  onClick={() => remove(o.id)}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-destructive"
                  aria-label="Remove option"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Courier picker */}
      <div className="space-y-2 rounded-xl bg-background p-2">
        <Label className="text-xs">Add courier</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={provider}
            onValueChange={(v) => {
              setProvider(v as DeliveryProvider);
              setVariantId("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURIER_CATALOG.map((c) => (
                <SelectItem key={c.provider} value={c.provider}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={variantId} onValueChange={setVariantId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick size / speed" />
            </SelectTrigger>
            <SelectContent>
              {selectedCatalog?.variants.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label} · {formatRand(v.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={addCourier} disabled={!variantId}>
          <Plus className="h-3.5 w-3.5" /> Add option
        </Button>
      </div>

      {/* Self-delivery */}
      <div className="space-y-2 rounded-xl bg-background p-2">
        <Label className="text-xs">Or deliver it yourself</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            type="number"
            min={0}
            placeholder="Flat fee (R)"
            value={selfFee}
            onChange={(e) => setSelfFee(e.target.value)}
          />
          <Input
            placeholder="Area you cover (e.g. Sandton, Midrand)"
            value={selfArea}
            maxLength={120}
            onChange={(e) => setSelfArea(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={addSelf}
          disabled={!selfFee || !selfArea.trim() || options.some((o) => o.provider === "self")}
        >
          <Plus className="h-3.5 w-3.5" /> Add self-delivery
        </Button>
      </div>
    </div>
  );
};
