import { cn } from "@/lib/utils";
import logoUrl from "@/assets/bon-logo.png";

type BrandMarkProps = {
  className?: string;
  size?: number;
};

export const BrandMark = ({ className, size = 36 }: BrandMarkProps) => {
  return (
    <img
      src={logoUrl}
      alt="BON logo"
      width={size}
      height={size}
      className={cn("rounded-xl object-contain", className)}
    />
  );
};
