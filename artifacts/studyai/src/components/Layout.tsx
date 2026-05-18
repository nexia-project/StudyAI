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
      <main className={cn("studyai-with-sidebar min-w-0 pt-14 pb-24 md:pb-8 md:pt-6", className)}>
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
  meta?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function PageHeader({ icon, title, subtitle, actions, meta, sticky = true, className }: PageHeaderProps) {
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
          {meta && <div className="mt-1 flex flex-wrap items-center gap-1.5">{meta}</div>}
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

type StatusTone = "violet" | "emerald" | "amber" | "rose" | "slate";

const statusToneClasses: Record<StatusTone, string> = {
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function AppStatusBadge({
  children,
  tone = "violet",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
      statusToneClasses[tone],
      className,
    )}>
      {children}
    </span>
  );
}

export function AppSectionShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-violet-100/80 bg-white/85 p-4 shadow-sm shadow-violet-100/40 backdrop-blur md:p-5", className)}>
      {(eyebrow || title || description || actions) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">{eyebrow}</p>}
            {title && <h2 className="mt-1 text-base font-black tracking-tight text-slate-950">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function AppMissionPanel({
  eyebrow = "Missão agora",
  title,
  description,
  evidence,
  status,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  evidence?: string;
  status?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 text-white shadow-xl shadow-violet-200/60", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black leading-tight tracking-tight">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{description}</p>
          {evidence && <p className="mt-3 text-xs font-semibold leading-relaxed text-white/70">Evidência: {evidence}</p>}
        </div>
        {status && <div className="shrink-0">{status}</div>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AppActionRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {children}
    </div>
  );
}

export function AppEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-dashed border-violet-200 bg-white/75 p-8 text-center shadow-sm", className)}>
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
          <span className="[&>*]:h-7 [&>*]:w-7">{icon}</span>
        </div>
      )}
      <h3 className="text-base font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function AppLoadingState({
  title = "Carregando",
  description = "Buscando seus dados com segurança.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <AppEmptyState
      icon={<span className="block h-7 w-7 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />}
      title={title}
      description={description}
    />
  );
}

export function AppErrorState({
  title = "Não foi possível carregar",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <AppEmptyState
      title={title}
      description={description}
      action={action}
      className="border-rose-200 bg-rose-50/70"
    />
  );
}
