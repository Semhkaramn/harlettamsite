"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectItems: Map<string, React.ReactNode>;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

// Helper function to extract SelectItems from children
const extractSelectItems = (children: React.ReactNode): Map<string, React.ReactNode> => {
  const items = new Map<string, React.ReactNode>();

  const traverse = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (React.isValidElement(child)) {
        // Check if this element has a 'value' prop (likely a SelectItem)
        if (child.props && typeof child.props === 'object' && 'value' in child.props && typeof child.props.value === 'string') {
          const value = child.props.value;
          const label: React.ReactNode = 'children' in child.props ? child.props.children as React.ReactNode : value;
          if (value) {
            items.set(value, label);
          }
        }
        // Recursively traverse children
        if (child.props && typeof child.props === 'object' && 'children' in child.props && child.props.children) {
          traverse(child.props.children as React.ReactNode);
        }
      }
    });
  };

  traverse(children);
  return items;
};

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false);
  const [selectItems, setSelectItems] = React.useState<Map<string, React.ReactNode>>(() =>
    extractSelectItems(children)
  );

  // Update items when children change
  React.useEffect(() => {
    setSelectItems(extractSelectItems(children));
  }, [children]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, selectItems }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectTrigger must be used within Select");

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500  disabled:opacity-50",
          className
        )}
        onClick={() => context.setOpen(!context.open)}
        {...props}
      >
        {children}
        <span className="ml-2">▼</span>
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder = "" }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  const selectedLabel = context.selectItems.get(context.value);

  return <span>{selectedLabel || placeholder}</span>;
};

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectContent must be used within Select");

    if (!context.open) return null;

    return (
      <>
        <div className="fixed inset-0 z-40" onClick={() => context.setOpen(false)} />
        <div
          ref={ref}
          className={cn(
            "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-600 bg-slate-700 py-1 shadow-lg",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className = "", value, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectItem must be used within Select");

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-white outline-none hover:bg-slate-600 transition-colors",
          context.value === value ? "bg-slate-600" : "",
          className
        )}
        onClick={() => {
          context.onValueChange(value);
          context.setOpen(false);
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
