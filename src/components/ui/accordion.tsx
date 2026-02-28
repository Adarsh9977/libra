"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  openIndex: number | null;
  setOpenIndex: (i: number | null) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  children,
  className,
  type = "single",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { type?: "single" }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  return (
    <AccordionContext.Provider value={{ openIndex, setOpenIndex }}>
      <div
        data-state={type}
        className={cn("", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-state={undefined}
      className={cn("border-b", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AccordionTrigger({
  children,
  className,
  index,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { index: number }) {
  const ctx = React.useContext(AccordionContext);
  const isOpen = ctx?.openIndex === index;
  return (
    <button
      type="button"
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      onClick={() => ctx?.setOpenIndex(isOpen ? null : index)}
      {...props}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 transition-transform duration-200"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export function AccordionContent({
  children,
  className,
  index,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { index: number }) {
  const ctx = React.useContext(AccordionContext);
  const isOpen = ctx?.openIndex === index;
  if (!isOpen) return null;
  return (
    <div
      className={cn("overflow-hidden text-sm", className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
}
