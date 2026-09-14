import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatène des classes Tailwind en résolvant les conflits (la dernière gagne). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
