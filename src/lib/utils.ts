/**
 * Utilidades para manejo de clases CSS
 * Este archivo proporciona una función helper para combinar clases de Tailwind CSS
 * de manera segura, evitando conflictos entre clases
 */

// Importa clsx - una utilidad para construir strings de clases CSS condicionalmente
// ClassValue es el tipo que acepta clsx (string, objeto, array, etc.)
import { clsx, type ClassValue } from "clsx";

// Importa twMerge de tailwind-merge
// twMerge resuelve conflictos entre clases de Tailwind que tienen el mismo propósito
// Por ejemplo: "px-2 px-4" se convierte en "px-4" (la última prevalece)
import { twMerge } from "tailwind-merge";

/**
 * Función helper para combinar clases CSS de manera segura
 * Combina clsx (para construir clases condicionalmente) con twMerge (para resolver conflictos)
 * 
 * @param inputs - Array de valores que pueden ser strings, objetos, arrays, etc.
 * @returns String con las clases CSS combinadas y sin conflictos
 * 
 * @example
 * cn("px-2", "py-4") // "px-2 py-4"
 * cn("px-2", "px-4") // "px-4" (twMerge resuelve el conflicto)
 * cn("text-red-500", { "font-bold": true }) // "text-red-500 font-bold"
 */
export function cn(...inputs: ClassValue[]) {
  // Primero clsx procesa todos los inputs y crea un string de clases
  // Luego twMerge resuelve cualquier conflicto entre clases de Tailwind
  return twMerge(clsx(inputs));
}
