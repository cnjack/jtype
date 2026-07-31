import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  XMarkIcon,
  FaceSmileIcon,
  ChevronUpDownIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { BoardOption } from "./types";

export const fieldCls =
  "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

const CARD_EMOJIS = ["🚀", "✅", "🐞", "📌", "⭐", "🔥", "💡", "📝", "🎨", "🛠️", "📅", "⚠️", "🎯", "🔧", "📦", "🧪", "🚧", "💬", "📈", "🔍", "❤️", "🏷️", "📂", "🧩", "⏰", "🌟", "✏️", "📊", "🙌", "🧠", "🌈", "🔑"];

/** A headless dropdown so card selects match the rest of the board's styling. */
export function ListboxSelect({
  value,
  options,
  onChange,
  disabled = false,
  portalClassName,
}: {
  value: string;
  options: BoardOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
  portalClassName?: string;
}) {
  // No `?? options[0]` fallback: an unmatched non-empty value (e.g. an assignee
  // who isn't in the current member roster) must render itself, not collapse to
  // the first option — see `{current?.label ?? value}` below.
  const current = options.find((o) => o.value === value);
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <ListboxButton className={`${fieldCls} flex w-full items-center justify-between gap-1 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60`}>
        <span className="flex min-w-0 items-center gap-1.5">
          {current?.warning ? (
            <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          ) : current?.color ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: current.color }} aria-hidden />
          ) : null}
          <span className="truncate">{current?.label ?? value}</span>
        </span>
        <ChevronUpDownIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      </ListboxButton>
      <ListboxOptions
        anchor="bottom start"
        className={`z-[60] w-[var(--button-width)] rounded-md border border-black/[0.06] bg-white py-1 text-xs shadow-lg [--anchor-gap:4px] focus:outline-none${portalClassName ? ` ${portalClassName}` : ""}`}
      >
        {options.map((o) => (
          <ListboxOption
            key={o.value}
            value={o.value}
            className="flex cursor-pointer items-center justify-between gap-1 px-2 py-1 text-stone-700 data-[focus]:bg-stone-100"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {o.warning ? (
                <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : o.color ? (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />
              ) : null}
              <span className="truncate">{o.label}</span>
            </span>
            {o.value === value && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-brand" />}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}

/** A compact emoji button + picker for the card icon. */
export function EmojiField({
  value,
  onChange,
  portalClassName,
}: {
  value?: string | null;
  onChange: (v: string) => void;
  portalClassName?: string;
}) {
  return (
    <div>
      <Menu as="div" className="relative inline-block">
        <MenuButton className="flex h-7 w-9 items-center justify-center rounded-md border border-stone-200 bg-white text-base leading-none hover:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
          {value ? <span>{value}</span> : <FaceSmileIcon className="h-4 w-4 text-stone-400" />}
        </MenuButton>
        <MenuItems
          anchor="bottom start"
          className={`z-[60] w-[232px] rounded-lg border border-black/[0.06] bg-white p-2 shadow-lg [--anchor-gap:4px] focus:outline-none${portalClassName ? ` ${portalClassName}` : ""}`}
        >
          <div className="grid grid-cols-8 gap-0.5">
            {CARD_EMOJIS.map((e) => (
              <MenuItem key={e}>
                <button
                  type="button"
                  onClick={() => onChange(e)}
                  className={`flex h-6 w-6 items-center justify-center rounded text-base hover:bg-stone-100 data-[focus]:bg-stone-100 ${value === e ? "bg-brand-soft" : ""}`}
                >
                  {e}
                </button>
              </MenuItem>
            ))}
          </div>
          <div className="mt-1 border-t border-black/[0.05] pt-1">
            <MenuItem>
              <button
                type="button"
                onClick={() => onChange("")}
                className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 data-[focus]:bg-stone-100"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
                <Trans>No icon</Trans>
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </Menu>
    </div>
  );
}

/** Multi-select tag editor used when the platform supplies a tag vocabulary (web labels). */
export function TagMultiSelect({
  value,
  options,
  onChange,
  portalClassName,
}: {
  value: string[];
  options: { value?: string; label: string; color?: string | null }[];
  onChange: (next: string[]) => void;
  portalClassName?: string;
}) {
  const optionValue = (option: { value?: string; label: string }) => option.value ?? option.label;
  const optionByValue = new Map(options.map((option) => [optionValue(option), option]));
  const selectableOptions = [
    ...options,
    ...value
      .filter((selected) => !optionByValue.has(selected))
      .map((selected) => ({ value: selected, label: selected, color: null })),
  ];
  const toggle = (selected: string) =>
    onChange(value.includes(selected) ? value.filter((v) => v !== selected) : [...value, selected]);
  return (
    <Menu as="div" className="relative inline-block w-full">
      <MenuButton className={`${fieldCls} flex w-full items-center justify-between gap-1`}>
        <span className="truncate">
          {value.length
            ? value.map((selected) => optionByValue.get(selected)?.label ?? selected).join(", ")
            : t`Add labels`}
        </span>
        <ChevronUpDownIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      </MenuButton>
      <MenuItems
        anchor="bottom start"
        className={`z-[60] max-h-56 w-[var(--button-width)] overflow-y-auto rounded-md border border-black/[0.06] bg-white py-1 text-xs shadow-lg [--anchor-gap:4px] focus:outline-none${portalClassName ? ` ${portalClassName}` : ""}`}
      >
        {selectableOptions.length === 0 && <div className="px-2 py-1 text-stone-400">{t`No labels`}</div>}
        {selectableOptions.map((o) => {
          const selected = optionValue(o);
          return (
          <MenuItem key={selected}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggle(selected);
              }}
              className="flex w-full items-center gap-1.5 px-2 py-1 text-stone-700 data-[focus]:bg-stone-100"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.color ?? "#d6d3d1" }} />
              <span className="flex-1 truncate text-left">{o.label}</span>
              {value.includes(selected) && <CheckIcon className="h-3.5 w-3.5 text-brand" />}
            </button>
          </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
