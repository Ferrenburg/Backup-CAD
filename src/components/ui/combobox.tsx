"use client";

import { useId, useMemo, useRef, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
}

/**
 * Typeahead-filtered, keyboard-selectable dropdown (§7.3 — every dropdown in
 * this app is one of these, no mouse required). Free text is allowed to
 * pass through on blur if `allowFreeText` is set (a couple of fields, like
 * call_type, benefit from constrained-but-escapable input during an
 * unusual call), otherwise only listed options can be committed.
 */
export function Combobox({
  label,
  name,
  options,
  value,
  onChange,
  placeholder,
  allowFreeText = false,
  className,
  inputRef: externalInputRef,
}: {
  label: string;
  name?: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowFreeText?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the local edit buffer in sync with an externally-changed value
  // (e.g. realtime updates) without a synchronizing effect — adjust state
  // during render when the incoming value itself has changed.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value ?? "");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function commit(v: string | null) {
    onChange(v);
    setQuery(v ?? "");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) commit(opt.value);
      else if (allowFreeText && query.trim()) commit(query.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value ?? "");
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <label htmlFor={id} className="mb-1 block text-sm text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        autoComplete="off"
        name={name}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            const exact = options.find((o) => o.label === query);
            if (exact) {
              onChange(exact.value);
            } else if (allowFreeText) {
              onChange(query.trim() || null);
            } else {
              setQuery(value ?? "");
            }
          }, 120);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-fg outline-none focus-visible:outline-accent"
      />
      {open && filtered.length > 0 ? (
        <ul
          id={`${id}-listbox`}
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border border-border-strong bg-surface-raised shadow-lg"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(opt.value);
              }}
              className={`cursor-pointer px-3 py-1.5 text-sm ${
                i === activeIndex ? "bg-accent text-accent-fg" : "text-fg"
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
