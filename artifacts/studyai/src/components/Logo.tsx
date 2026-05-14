import * as React from "react";

type Variant = "icon" | "horizontal";
type Tone = "color" | "white";

export function Logo({
  variant = "horizontal",
  tone = "color",
  className,
  alt = "Study.IA",
  ...rest
}: {
  variant?: Variant;
  tone?: Tone;
  className?: string;
  alt?: string;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">) {
  const src =
    variant === "icon" ? "/brand/icon.png" : "/brand/logo-horizontal.png";
  const filter = tone === "white" ? "brightness(0) invert(1)" : undefined;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ filter, ...(rest.style ?? {}) }}
      {...rest}
    />
  );
}
