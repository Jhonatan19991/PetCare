/**
 * Cliente de Supabase para la aplicación
 * Este archivo configura y exporta el cliente de Supabase que se usa en toda la aplicación
 * Supabase es el backend-as-a-service que proporciona autenticación, base de datos y almacenamiento
 * 
 * NOTA: Este archivo puede ser generado automáticamente. No editar directamente si se regenera.
 */

// Importa la función createClient de la librería oficial de Supabase
// Esta función crea una instancia del cliente que permite interactuar con Supabase
import { createClient } from '@supabase/supabase-js';

// Importa el tipo Database que contiene las definiciones de tipos TypeScript
// para todas las tablas y funciones de la base de datos
// Esto proporciona autocompletado y verificación de tipos en tiempo de compilación
import type { Database } from './types';

// URL del proyecto de Supabase
// Esta es la URL pública de la instancia de Supabase donde está alojada la base de datos
// Se obtiene de la variable de entorno VITE_SUPABASE_URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

// Clave pública (anon key) de Supabase
// Esta es la clave pública que se usa para autenticar peticiones desde el cliente
// Es segura de exponer en el código del cliente ya que las políticas de seguridad (RLS)
// controlan qué operaciones puede realizar cada usuario
// Se obtiene de la variable de entorno VITE_SUPABASE_ANON_KEY
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Validación de variables de entorno requeridas
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Faltan las variables de entorno de Supabase. Por favor, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env"
  );
}

// Instrucciones de uso:
// Para usar el cliente de Supabase en otros archivos, importa así:
// import { supabase } from "@/integrations/supabase/client";

/**
 * Cliente de Supabase exportado
 * Esta es la instancia principal del cliente que se usa en toda la aplicación
 * 
 * Configuración:
 * - Database: Tipos TypeScript para autocompletado y verificación de tipos
 * - SUPABASE_URL: URL del proyecto
 * - SUPABASE_PUBLISHABLE_KEY: Clave pública para autenticación
 * - auth: Configuración de autenticación
 */
export const supabase = createClient<Database>(
  // URL del proyecto Supabase
  SUPABASE_URL,
  // Clave pública (anon key) para autenticación
  SUPABASE_PUBLISHABLE_KEY,
  {
    // Configuración de autenticación
    auth: {
      // Usa localStorage del navegador para almacenar la sesión del usuario
      // Esto permite que la sesión persista entre recargas de página
      storage: localStorage,
      // Habilita la persistencia de sesión
      // Si es true, la sesión se guarda y se restaura automáticamente
      persistSession: true,
      // Habilita la renovación automática de tokens
      // Los tokens JWT expiran, y esta opción los renueva automáticamente antes de expirar
      autoRefreshToken: true,
    }
  }
);