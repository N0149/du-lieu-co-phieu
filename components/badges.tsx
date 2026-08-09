import { CircleCheck, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatusTag({ updated, label }: { updated: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap',
        updated
          ? 'border-positive/30 bg-positive-muted text-positive'
          : 'border-warning/30 bg-warning-muted text-warning-foreground',
      )}
    >
      {updated ? <CircleCheck className="size-3" /> : <Clock className="size-3" />}
      {label}
    </span>
  )
}

export function MosBadge({ value }: { value: number }) {
  // Margin of safety tiers
  let tone = 'border-border bg-muted text-muted-foreground'
  let text = 'Trung tính'
  if (value >= 50) {
    tone = 'border-positive/40 bg-positive-muted text-positive'
    text = 'Biên an toàn cao'
  } else if (value >= 25) {
    tone = 'border-primary/40 bg-accent text-accent-foreground'
    text = 'Biên an toàn khá'
  } else if (value >= 0) {
    tone = 'border-warning/40 bg-warning-muted text-warning-foreground'
    text = 'Biên an toàn thấp'
  } else {
    tone = 'border-negative/40 bg-negative-muted text-negative'
    text = 'Định giá cao'
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
        tone,
      )}
    >
      Biên an toàn: <span className="font-mono">{value.toFixed(1)}%</span>
      <span className="hidden font-normal opacity-80 sm:inline">· {text}</span>
    </span>
  )
}
