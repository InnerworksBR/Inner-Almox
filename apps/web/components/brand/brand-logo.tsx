import Image from "next/image";

interface BrandLogoProps {
  compact?: boolean;
  priority?: boolean;
}

export function BrandLogo({ compact = false, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand/innerworks-logo.png"
      alt="InnerWorks Soluções em Tecnologia"
      width={2000}
      height={787}
      className={compact ? "brand-logo brand-logo--compact" : "brand-logo"}
      priority={priority}
    />
  );
}
