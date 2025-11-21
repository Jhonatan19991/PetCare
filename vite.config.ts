/**
 * Configuración de Vite para el proyecto
 * Vite es el bundler y herramienta de desarrollo utilizada en este proyecto
 * Este archivo configura cómo Vite procesa y empaqueta el código
 */

// Importa la función defineConfig de Vite para definir la configuración
// Esta función proporciona autocompletado y validación de tipos
import { defineConfig } from "vite";

// Importa el plugin de React para Vite usando SWC (Speedy Web Compiler)
// SWC es un compilador de TypeScript/JavaScript escrito en Rust, más rápido que Babel
import react from "@vitejs/plugin-react-swc";

// Importa el módulo path de Node.js para trabajar con rutas de archivos
// Se usa para crear alias de rutas y resolver rutas absolutas
import path from "path";

// Importa el componente tagger de Lovable (herramienta de desarrollo)
// Se usa solo en modo desarrollo para etiquetar componentes en la UI
import { componentTagger } from "lovable-tagger";

/**
 * Exporta la configuración de Vite
 * @param mode - El modo de ejecución ('development' o 'production')
 * @returns Configuración de Vite
 */
export default defineConfig(({ mode }) => ({
  // Configuración del servidor de desarrollo
  server: {
    // host: "::" permite que el servidor escuche en todas las interfaces de red
    // Esto permite acceso desde otros dispositivos en la misma red
    host: "::",
    // Puerto en el que se ejecutará el servidor de desarrollo
    port: 8080,
  },
  // Array de plugins que Vite usará durante el proceso de build
  plugins: [
    // Plugin de React con SWC - compila JSX y TypeScript
    react(),
    // Plugin de Lovable solo en modo desarrollo
    // filter(Boolean) elimina valores falsy (undefined, null, false)
    // Si mode !== "development", componentTagger() no se incluye
    mode === "development" && componentTagger()
  ].filter(Boolean),
  // Configuración de resolución de módulos
  resolve: {
    // Alias de rutas - permite usar "@" en lugar de rutas relativas
    alias: {
      // "@" apunta a la carpeta src del proyecto
      // Ejemplo: import { something } from "@/components/Button" 
      // en lugar de: import { something } from "../../components/Button"
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
