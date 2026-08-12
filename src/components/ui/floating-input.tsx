import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
  }

const FloatingInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          type={type}
          id={id}
          className={cn(
            "peer flex h-14 w-full rounded-[1.25rem] border bg-background px-4 pt-4 pb-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 aria-[invalid=true]:border-status-danger-border aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-status-danger-border/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:border-primary",
            className
          )}
          placeholder={label}
          ref={ref}
          {...props}
        />
        <label
          htmlFor={id}
          className="absolute left-4 top-4 z-10 origin-[0] -translate-y-3 scale-75 transform text-sm text-muted-foreground duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-primary pointer-events-none bg-background px-1"
        >
          {label}
        </label>
      </div>
    )
  }
)
FloatingInput.displayName = "FloatingInput"

export { FloatingInput }
