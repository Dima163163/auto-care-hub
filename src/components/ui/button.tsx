import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { type VariantProps } from "class-variance-authority"
import { LoaderCircle } from 'lucide-react'
import { buttonVariants } from './button-variants'

import { cn } from "@/lib/utils"



type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & {
  loading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {


  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      aria-busy={loading || undefined}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" data-slot="button-loading-indicator" className="size-4 animate-spin" />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button }
