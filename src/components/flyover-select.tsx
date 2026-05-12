"use client";

import { useEffect, useId, useMemo, useState } from "react";

export type FlyoverSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type FlyoverSelectProps = {
  name?: string;
  label: string;
  options: FlyoverSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  panelTitle?: string;
  searchable?: boolean;
};

function normalizeValue(options: FlyoverSelectOption[], value?: string, placeholder?: string) {
  if (value !== undefined) {
    return value;
  }
  if (placeholder) {
    return "";
  }
  return options[0]?.value ?? "";
}

export function FlyoverSelect({
  name,
  label,
  options,
  value,
  defaultValue,
  placeholder,
  required = false,
  disabled = false,
  onValueChange,
  className = "",
  triggerClassName = "",
  panelTitle,
  searchable,
}: FlyoverSelectProps) {
  const id = useId();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => normalizeValue(options, defaultValue, placeholder));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedValue = isControlled ? value : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;
  const shouldSearch = searchable ?? options.length > 8;

  useEffect(() => {
    if (!isControlled) {
      setInternalValue((current) => {
        if (options.some((option) => option.value === current) || (placeholder && current === "")) {
          return current;
        }
        return normalizeValue(options, defaultValue, placeholder);
      });
    }
  }, [defaultValue, isControlled, options, placeholder]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }

    return options.filter((option) => {
      return `${option.label} ${option.description ?? ""}`.toLowerCase().includes(needle);
    });
  }, [options, query]);

  function selectValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={`min-w-0 ${className}`}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-flyover`}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-background px-4 py-3 text-left text-sm text-foreground outline-none ring-accent-pink/15 transition-all hover:bg-surface-soft focus:border-accent-pink focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {selectedOption?.label ?? placeholder ?? "Select"}
          </span>
          {selectedOption?.description ? (
            <span className="mt-0.5 block truncate text-[11px] font-medium text-muted">
              {selectedOption.description}
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" className="shrink-0 text-muted">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label={`Close ${label} options`}
            className="absolute inset-0 bg-background/65 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            id={`${id}-flyover`}
            role="listbox"
            aria-label={label}
            className="relative flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:max-h-[min(680px,82dvh)] sm:max-w-md sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line bg-surface/90 px-4 py-4 backdrop-blur sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</p>
                <h3 className="mt-1 truncate text-lg font-black text-foreground">{panelTitle ?? "Choose one"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-background text-muted transition hover:bg-foreground/5 hover:text-foreground"
                aria-label={`Close ${label} options`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {shouldSearch ? (
              <div className="border-b border-line px-4 py-3 sm:px-5">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  autoFocus
                  className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-cyan/10 transition-all placeholder:text-muted focus:border-accent-cyan focus:ring-4"
                />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
              {placeholder ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedValue === ""}
                  onClick={() => selectValue("")}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                    selectedValue === "" ? "bg-accent-pink text-white" : "text-muted hover:bg-background"
                  }`}
                >
                  <span className="font-semibold">{placeholder}</span>
                  {selectedValue === "" ? <CheckIcon /> : null}
                </button>
              ) : null}

              {filteredOptions.map((option) => {
                const isSelected = option.value === selectedValue;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectValue(option.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                      isSelected ? "bg-accent-pink text-white" : "text-foreground hover:bg-background"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{option.label}</span>
                      {option.description ? (
                        <span className={`mt-0.5 block truncate text-[11px] ${isSelected ? "text-white/75" : "text-muted"}`}>
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? <CheckIcon /> : null}
                  </button>
                );
              })}

              {filteredOptions.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm font-semibold text-muted">No matches found.</p>
              ) : null}
            </div>

            {required && !selectedValue ? (
              <div className="border-t border-line px-4 py-3 text-xs font-semibold text-muted sm:px-5">
                Choose an option before saving.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}
