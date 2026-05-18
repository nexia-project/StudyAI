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
  const src = variant === "icon"
    ? "/brand/icon.svg"
    : tone === "white"
      ? "/brand/logo-horizontal-white.svg"
      : "/brand/logo-horizontal.svg";

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      decoding="async"
      style={{
        display: "block",
        backgroundColor: "transparent",
        objectFit: "contain",
        ...(rest.style ?? {}),
      }}
      {...rest}
    />
  );
}
