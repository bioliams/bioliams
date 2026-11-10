"use client";

import { useEffect, useState } from "react";
import { getOccupancyAction } from "@/app/(app)/locations/actions";
import { wellLabel } from "@/lib/well";
import { cn } from "@/lib/utils";

export type Position = { row: number; col: number } | null;

interface Occupant {
  entityId: string;
  displayId: string;
  name: string;
  row: number;
  col: number;
}

/**
 * Click-a-well grid for a box or rack. Taken wells are disabled and say what's
 * in them; the record being edited may keep (or leave) its own well.
 */
export function PositionPicker({
  locationId,
  rows,
  cols,
  value,
  onChange,
  entityId,
}: {
  locationId: string;
  rows: number;
  cols: number;
  value: Position;
  onChange: (value: Position) => void;
  /** When editing, the record itself — its own well isn't "taken". */
  entityId?: string;
}) {
  // Keyed by location so a stale answer for the previous box is never shown.
  const [loaded, setLoaded] = useState<{ locationId: string; occupants: Occupant[] } | null>(null);
  const [failure, setFailure] = useState<{ locationId: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOccupancyAction(locationId).then((result) => {
      if (cancelled) return;
      if (result.error) setFailure({ locationId, message: result.error });
      else setLoaded({ locationId, occupants: result.value ?? [] });
    });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const occupants = loaded?.locationId === locationId ? loaded.occupants : null;
  const taken = new Map<string, Occupant>();
  for (const o of occupants ?? []) {
    if (o.entityId !== entityId) taken.set(`${o.row}:${o.col}`, o);
  }
  const free = rows * cols - taken.size;

  if (failure?.locationId === locationId) {
    return <p className="text-xs text-red-600">Couldn&apos;t load the grid: {failure.message}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {value ? (
            <>
              Position <span className="font-medium text-foreground">{wellLabel(value.row, value.col)}</span>{" "}
              <button type="button" className="underline" onClick={() => onChange(null)}>
                clear
              </button>
            </>
          ) : (
            "Click a free well, or leave it unplaced."
          )}
        </span>
        {occupants && (
          <span className="tabular-nums">
            {free} of {rows * cols} free
          </span>
        )}
      </div>
      <div className="overflow-x-auto pb-1">
        <div
          role="grid"
          aria-label="Position in box"
          className={cn("grid w-fit gap-0.5", !occupants && "animate-pulse opacity-50")}
          style={{ gridTemplateColumns: `auto repeat(${cols}, 1.75rem)` }}
        >
          <div />
          {Array.from({ length: cols }, (_, c) => (
            <div key={`h${c}`} className="text-center text-[10px] text-muted-foreground">
              {c + 1}
            </div>
          ))}
          {Array.from({ length: rows }, (_, r) => (
            <Row
              key={r}
              row={r}
              cols={cols}
              taken={taken}
              ready={Boolean(occupants)}
              value={value}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  row,
  cols,
  taken,
  ready,
  value,
  onChange,
}: {
  row: number;
  cols: number;
  taken: Map<string, Occupant>;
  ready: boolean;
  value: Position;
  onChange: (value: Position) => void;
}) {
  return (
    <>
      <div className="pr-1 text-right text-[10px] leading-7 text-muted-foreground">
        {String.fromCharCode(65 + row)}
      </div>
      {Array.from({ length: cols }, (_, col) => {
        const occupant = taken.get(`${row}:${col}`);
        const selected = value?.row === row && value?.col === col;
        const label = wellLabel(row, col);
        return (
          <button
            key={col}
            type="button"
            disabled={!ready || Boolean(occupant)}
            aria-pressed={selected}
            aria-label={occupant ? `${label}, taken by ${occupant.displayId}` : label}
            title={occupant ? `${label} — ${occupant.displayId} ${occupant.name}` : label}
            onClick={() => onChange(selected ? null : { row, col })}
            className={cn(
              "size-7 rounded border text-[9px] leading-none transition-colors",
              // Same tint as the storage page's grid, so "taken" looks the same everywhere.
              occupant && "cursor-not-allowed border-primary/40 bg-primary/15 text-primary/70",
              !occupant && !selected && "bg-muted/30 hover:border-primary/60 hover:bg-primary/10",
              selected && "border-primary bg-primary text-primary-foreground"
            )}
          >
            {selected ? label : occupant ? "•" : ""}
          </button>
        );
      })}
    </>
  );
}
