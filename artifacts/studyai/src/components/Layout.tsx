import { AppNav } from "@/components/AppNav";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  onHome?: () => void;
}

export function Layout({ children, className, onHome }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_rgba(192,132,252,0.09),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(233,213,255,0.45),_transparent_50%),hsl(var(--background))]">
      <AppNav onHome={onHome} />
      <main className={cn("pt-14 pb-24 md:pb-8 md:pl-64 md:pt-6", className)}>
        {children}
      </main>
    </div>
  );
}

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function PageHeader({ icon, title, subtitle, actions, sticky = true, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "z-20 border-b border-violet-200/45 bg-white/70 backdrop-blur-2xl shadow-sm shadow-violet-200/15",
      sticky && "sticky top-14 md:top-0",
      className
    )}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-800 shadow-md shadow-violet-400/25 ring-1 ring-white/30">
            <span className="text-white [&>*]:h-4 [&>*]:w-4">{icon}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-black leading-tight tracking-tight text-purple-950">{title}</h1>
          {subtitle && <p className="truncate text-xs leading-tight text-violet-600/75">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface ContentAreaProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "6xl" | "full";
  className?: string;
}

export function ContentArea({ children, maxWidth = "6xl", className }: ContentAreaProps) {
  const maxWidthClass = {
    sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg",
    xl: "max-w-xl", "2xl": "max-w-2xl", "6xl": "max-w-6xl", full: "max-w-full",
  }[maxWidth];
  return (
    <div className={cn(maxWidthClass, "mx-auto px-4 pt-6 space-y-6", className)}>
      {children}
    </div>
  );
}

export function ScrollableTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0", className)}>
      <div className="min-w-[600px]">
        {children}
      </div>
    </div>
  );
}
