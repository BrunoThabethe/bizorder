import { cn } from "@/lib/utils";
import logoUrl from "@/assets/bon-logo.png";

type BrandMarkProps = {
  className?: string;
  size?: number;
};

export const BrandMark = ({ className, size = 28 }: BrandMarkProps) => {
  return (
    <img
      src={logoUrl}
      alt="BON logo"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
};
