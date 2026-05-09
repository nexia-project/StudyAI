import { AppNav } from "@/components/AppNav";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  onHome?: () => void;
}

export function Layout({ children, className, onHome }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
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
      "bg-white/80 backdrop-blur-xl border-b border-gray-100 z-20",
      sticky && "sticky top-14 md:top-0",
      className
    )}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white [&>*]:w-4 [&>*]:h-4">{icon}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-black text-gray-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 leading-tight truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
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
