import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const triggerHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};
