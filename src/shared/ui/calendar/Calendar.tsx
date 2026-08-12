import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  navLayout = 'around',
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      navLayout={navLayout}
      showOutsideDays={showOutsideDays}
      className={cn('flex w-full justify-center p-2 sm:p-3', className)}
      classNames={{
        months: 'flex w-full flex-col',
        month:
          'grid w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-y-4',
        month_caption: 'col-start-2 row-start-1 flex h-10 items-center justify-center',
        caption_label:
          'text-center text-base font-semibold capitalize sm:text-lg',
        nav: 'flex h-10 items-center justify-center gap-1',
        button_previous:
          'col-start-1 row-start-1 inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        button_next:
          'col-start-3 row-start-1 inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        month_grid:
          'col-span-3 row-start-2 w-full table-fixed border-collapse',
        weekdays: 'grid grid-cols-7',
        weekday: 'py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        week: 'grid grid-cols-7',
        day: 'relative flex aspect-square items-center justify-center p-0 text-center',
        day_button: 'inline-flex size-10 items-center justify-center rounded-xl text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-11 sm:text-base',
        selected: '[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:shadow-md [&>button]:shadow-primary/20 [&>button]:hover:bg-primary',
        today: '[&>button]:border [&>button]:border-primary/40 [&>button]:font-semibold [&>button]:text-primary',
        outside: 'text-muted-foreground opacity-35',
        disabled: 'pointer-events-none text-muted-foreground opacity-30',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
            if (props.orientation === 'left') {
                return <ChevronLeft className="h-5 w-5" />
            }
            return <ChevronRight className="h-5 w-5" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
