"use client";

import { useRef, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchCommandProps {
  value: string;
  onChange: (value: string) => void;
  onExpandChange?: (expanded: boolean) => void;
  placeholder?: string;
}

export function SearchCommand({
  value,
  onChange,
  onExpandChange,
  placeholder = "Search…",
}: SearchCommandProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isExpanded = isFocused || value.length > 0;

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange]);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border transition-all duration-200",
        "h-11 md:h-9",
        isExpanded
          ? "border-foreground/30 bg-secondary/30 pl-3 pr-2 w-full md:w-48"
          : "border-border hover:border-foreground/30 px-2.5 w-11 md:w-9 cursor-pointer",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <Search className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          "bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-xs transition-all",
          isExpanded ? "w-full opacity-100" : "w-0 opacity-0",
        )}
      />
      {value.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
            inputRef.current?.focus();
          }}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
