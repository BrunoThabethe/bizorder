import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export const ThemeToggle = () => {
  const { mode, setMode, theme } = useTheme();

  const options: { value: "light" | "dark" | "system"; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "system", icon: Monitor, label: "Auto" },
    { value: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-foreground/5 p-1 backdrop-blur-sm"
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${opt.label} theme${opt.value === "system" ? ` (currently ${theme})` : ""}`}
            onClick={() => setMode(opt.value)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full transition-all",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
};
