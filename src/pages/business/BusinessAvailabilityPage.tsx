import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { PageHeader } from "@/components/customer/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  AVAILABILITY_LABEL,
  AVAILABILITY_TONE,
  DAY_LABELS,
  fetchBusinessHours,
  fetchBusinessSettings,
  fetchBusinessUpcomingScheduled,
  fetchMyBusiness,
  listDaySlots,
  replaceBusinessHours,
  upsertBusinessSettings,
  type Availability,
  type BusinessHourRow,
} from "@/lib/business/queries";
import { cn } from "@/lib/utils";

type DraftRange = { id: string; opens_at: string; closes_at: string };
type DraftDay = { is_open: boolean; ranges: DraftRange[] };

const emptyWeek = (): DraftDay[] =>
  Array.from({ length: 7 }, () => ({
    is_open: false,
    ranges: [{ id: crypto.randomUUID(), opens_at: "09:00", closes_at: "17:00" }],
  }));

const hoursToDraft = (rows: BusinessHourRow[]): DraftDay[] => {
  const draft = emptyWeek();
  for (const r of rows) {
    const day = draft[r.day_of_week];
    if (!day) continue;
    if (!day.is_open) {
      day.is_open = r.is_open;
      day.ranges = [];
    }
    day.ranges.push({ id: crypto.randomUUID(), opens_at: r.opens_at.slice(0, 5), closes_at: r.closes_at.slice(0, 5) });
  }
  for (const day of draft) {
    if (day.ranges.length === 0)
      day.ranges = [{ id: crypto.randomUUID(), opens_at: "09:00", closes_at: "17:00" }];
  }
  return draft;
};

const draftToRows = (draft: DraftDay[]) =>
  draft.flatMap((day, dow) =>
    day.is_open
      ? day.ranges.map((r) => ({
          day_of_week: dow,
          opens_at: `${r.opens_at}:00`,
          closes_at: `${r.closes_at}:00`,
          is_open: true,
        }))
      : [],
  );

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
};

const BusinessAvailabilityPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: business, isLoading } = useQuery({
    queryKey: ["my-business", userId],
    queryFn: () => fetchMyBusiness(userId),
    enabled: !!userId,
  });
  const businessId = business?.id ?? "";

  const { data: settings } = useQuery({
    queryKey: ["business-settings", businessId],
    queryFn: () => fetchBusinessSettings(businessId),
    enabled: !!businessId,
  });

  const { data: hours = [] } = useQuery({
    queryKey: ["business-hours", businessId],
    queryFn: () => fetchBusinessHours(businessId),
    enabled: !!businessId,
  });

  const fromIso = useMemo(() => new Date().toISOString(), []);
  const toIso = useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), []);
  const { data: upcoming = [] } = useQuery({
    queryKey: ["business-upcoming-scheduled", businessId, fromIso, toIso],
    queryFn: () => fetchBusinessUpcomingScheduled(businessId, fromIso, toIso),
    enabled: !!businessId,
  });

  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
  const { data: daySlots = [], isFetching: daySlotsLoading } = useQuery({
    queryKey: ["day-slots", businessId, selectedDayKey, 60],
    queryFn: () => listDaySlots(businessId, selectedDayKey, 60),
    enabled: !!businessId,
  });



  const [availability, setAvailability] = useState<Availability>("available");
  const [awayUntil, setAwayUntil] = useState<string>("");
  const [week, setWeek] = useState<DraftDay[]>(emptyWeek);

  useEffect(() => {
    if (settings) {
      setAvailability(settings.availability);
      setAwayUntil(settings.away_until ? settings.away_until.slice(0, 10) : "");
    }
  }, [settings]);

  useEffect(() => {
    setWeek(hoursToDraft(hours));
  }, [hours]);

  const save = useMutation({
    mutationFn: async () => {
      if (!businessId) return;
      await upsertBusinessSettings(businessId, {
        availability,
        away_until: awayUntil ? new Date(awayUntil).toISOString() : null,
      });
      await replaceBusinessHours(businessId, draftToRows(week));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-settings", businessId] });
      qc.invalidateQueries({ queryKey: ["business-hours", businessId] });
      toast({ title: "Availability saved", description: "Customers will only see open slots inside these hours." });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const updateRange = (dow: number, rangeId: string, key: "opens_at" | "closes_at", value: string) =>
    setWeek((w) =>
      w.map((d, i) =>
        i === dow ? { ...d, ranges: d.ranges.map((r) => (r.id === rangeId ? { ...r, [key]: value } : r)) } : d,
      ),
    );
  const addRange = (dow: number) =>
    setWeek((w) =>
      w.map((d, i) =>
        i === dow
          ? { ...d, ranges: [...d.ranges, { id: crypto.randomUUID(), opens_at: "09:00", closes_at: "17:00" }] }
          : d,
      ),
    );
  const removeRange = (dow: number, rangeId: string) =>
    setWeek((w) => w.map((d, i) => (i === dow ? { ...d, ranges: d.ranges.filter((r) => r.id !== rangeId) } : d)));
  const toggleDay = (dow: number, value: boolean) =>
    setWeek((w) => w.map((d, i) => (i === dow ? { ...d, is_open: value } : d)));

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow="Schedule"
        title="Availability & working hours"
        description="Set when you take bookings. Customers will only be able to pick free slots inside these hours."
      />

      {/* Status */}
      <Card className="rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold">Current status</h2>
              <p className="text-xs text-muted-foreground">Shown next to your name on the customer side.</p>
            </div>
            <Badge className={AVAILABILITY_TONE[availability]}>{AVAILABILITY_LABEL[availability]}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={availability} onValueChange={(v) => setAvailability(v as Availability)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {AVAILABILITY_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {availability === "away" && (
              <div className="space-y-2">
                <Label htmlFor="away_until">Back on</Label>
                <Input
                  id="away_until"
                  type="date"
                  value={awayUntil}
                  onChange={(e) => setAwayUntil(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">No bookings will be allowed before this date.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar + clock */}
      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-bold">Calendar & live slots</h2>
            <p className="text-xs text-muted-foreground">
              Pick a day to see every 60-min slot, your crew capacity, and how many bookings are already taken.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-[auto,1fr]">
            <div className="rounded-2xl bg-muted/40 p-2">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={(d) => d && setSelectedDay(d)}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{format(selectedDay, "EEEE, dd/MM/yyyy")}</p>
                {daySlots.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    Capacity {daySlots[0].capacity} / slot
                  </Badge>
                )}
              </div>
              {daySlotsLoading ? (
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading slots…
                </p>
              ) : daySlots.length === 0 ? (
                <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                  Closed on this day — adjust working hours below to take bookings.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {daySlots.map((s) => {
                    const start = new Date(s.slot_start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                    const end = new Date(s.slot_end).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                    const full = s.booked >= s.capacity;
                    const some = s.booked > 0 && !full;
                    const tone = full
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : some
                      ? "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300"
                      : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300";
                    return (
                      <li
                        key={s.slot_start}
                        className={cn("flex flex-col rounded-xl border p-2 text-xs", tone)}
                      >
                        <span className="font-semibold">{start} – {end}</span>
                        <span className="text-[11px] opacity-80">
                          {s.booked}/{s.capacity} booked {full ? "· Full" : some ? "· Partial" : "· Free"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Capacity is based on your active crew (or 1 if you work alone). Once all crew are booked for a slot, customers can't book it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly hours */}
      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-bold">Weekly working hours</h2>
            <p className="text-xs text-muted-foreground">
              Add one or more time ranges per day. Customers can only book inside these windows — closed days take no bookings.
            </p>
          </div>
          <div className="space-y-3">
            {DAY_LABELS.map((label, dow) => {
              const day = week[dow];
              return (
                <div key={label} className="rounded-2xl bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{label}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{day.is_open ? "Open" : "Closed"}</span>
                      <Switch checked={day.is_open} onCheckedChange={(v) => toggleDay(dow, v)} />
                    </div>
                  </div>
                  {day.is_open && (
                    <div className="mt-3 space-y-2">
                      {day.ranges.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={r.opens_at}
                            onChange={(e) => updateRange(dow, r.id, "opens_at", e.target.value)}
                            className="max-w-[140px]"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={r.closes_at}
                            onChange={(e) => updateRange(dow, r.id, "closes_at", e.target.value)}
                            className="max-w-[140px]"
                          />
                          {day.ranges.length > 1 && (
                            <Button type="button" variant="secondary" size="icon" onClick={() => removeRange(dow, r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="secondary" size="sm" onClick={() => addRange(dow)}>
                        <Plus className="h-3.5 w-3.5" /> Add range
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming bookings */}
      <Card className="mt-5 rounded-3xl border-0 shadow-card">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-bold">Booked slots — next 7 days</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              No bookings yet for the coming week.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl bg-muted/30">
              {upcoming.map((o) => {
                const service = (o.services as { title: string; duration_minutes: number | null } | null) ?? null;
                return (
                  <li key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div>
                      <p className="font-semibold">{formatDateTime(o.scheduled_for as string)}</p>
                      <p className="text-xs text-muted-foreground">
                        {service?.title ?? "Booking"}
                        {service?.duration_minutes ? ` · ${service.duration_minutes} min` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase">{o.status as string}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-5">
        <Button className="w-full md:w-auto" onClick={() => save.mutate()} disabled={save.isPending || !businessId}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save availability
        </Button>
      </div>
    </BusinessLayout>
  );
};

export { BusinessAvailabilityPage };
export default BusinessAvailabilityPage;
