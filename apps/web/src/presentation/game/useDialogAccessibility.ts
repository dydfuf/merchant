"use client";

import { useEffect } from "react";

interface DialogAccessibilityInput {
  open: boolean;
  dialogElement: HTMLElement | null;
  backgroundId: string;
  onClose(): void;
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selectors = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ];

  return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(","))).filter(
    (element) => !element.hasAttribute("aria-hidden"),
  );
}

export function useDialogAccessibility({
  open,
  dialogElement,
  backgroundId,
  onClose,
}: DialogAccessibilityInput) {
  useEffect(() => {
    if (!open || !dialogElement) {
      return;
    }

    const dialog = dialogElement;
    const background = document.getElementById(backgroundId);
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    background?.setAttribute("inert", "");
    background?.setAttribute("aria-hidden", "true");

    const focusable = getFocusableElements(dialog);
    (focusable[0] ?? dialog).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = getFocusableElements(dialog);
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        return;
      }
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    dialog.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      background?.removeAttribute("inert");
      background?.removeAttribute("aria-hidden");
      previousFocus?.focus();
    };
  }, [backgroundId, dialogElement, onClose, open]);
}
