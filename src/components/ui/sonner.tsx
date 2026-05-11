"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-right"
      offset="70px"
      gap={8}
      duration={3000}
      visibleToasts={4}
      expand={false}
      richColors={false}
      closeButton={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-800/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-slate-700/50 group-[.toaster]:shadow-2xl group-[.toaster]:text-sm group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-slate-400 group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-slate-700 group-[.toast]:text-slate-300 group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:rounded-md",
          closeButton:
            "group-[.toast]:bg-slate-700/80 group-[.toast]:border-slate-600 group-[.toast]:hover:bg-slate-600",
          success: "group-[.toaster]:border-emerald-500/40 group-[.toaster]:bg-emerald-900/90",
          error: "group-[.toaster]:border-red-500/40 group-[.toaster]:bg-red-900/90",
          warning: "group-[.toaster]:border-amber-500/40 group-[.toaster]:bg-amber-900/90",
          info: "group-[.toaster]:border-blue-500/40 group-[.toaster]:bg-blue-900/90",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
