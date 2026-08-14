import { cn } from "@/lib/utils";

/**
 * Every page's title block, on its own paper.
 *
 * Titles and toolbars floating directly on the grey canvas looked unfinished
 * next to the carded tables; this puts them on the same white surface. Filters
 * passed as children join the card under a hairline, so a page reads as one
 * coherent header instead of scattered rows.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border bg-card shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">{children}</div>
      )}
    </div>
  );
}
