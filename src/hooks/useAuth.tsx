/**
 * Hook personalizado para manejar la autenticación de usuarios
 * Este hook proporciona el estado del usuario autenticado y funciones para gestionar la sesión
 * Utiliza Supabase Auth para manejar la autenticación
 */

// Importa hooks de React necesarios
// useState: Para manejar el estado del usuario y el estado de carga
// useEffect: Para ejecutar efectos secundarios (obtener sesión, suscribirse a cambios)
import { useState, useEffect } from 'react';

// Importa el tipo User de Supabase
// Este tipo contiene información del usuario autenticado (id, email, metadata, etc.)
import { User } from '@supabase/supabase-js';

// Importa el cliente de Supabase configurado
// Se usa para acceder a las funciones de autenticación
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook useAuth
 * Proporciona el estado de autenticación del usuario y funciones relacionadas
 * 
 * @returns {Object} Objeto con:
 *   - user: Usuario autenticado o null si no hay sesión
 *   - loading: Boolean que indica si se está cargando la sesión inicial
 *   - signOut: Función para cerrar sesión
 */
export const useAuth = () => {
  // Estado que almacena el usuario autenticado
  // null significa que no hay usuario autenticado
  const [user, setUser] = useState<User | null>(null);
  
  // Estado que indica si se está cargando la sesión inicial
  // Comienza en true porque necesitamos verificar si hay una sesión existente
  const [loading, setLoading] = useState(true);

  // Efecto que se ejecuta una vez al montar el componente
  useEffect(() => {
    /**
     * Función asíncrona para obtener la sesión inicial
     * Verifica si hay una sesión guardada en localStorage
     */
    const getInitialSession = async () => {
      // Obtiene la sesión actual de Supabase
      // getSession() lee la sesión del storage (localStorage) configurado en el cliente
      const { data: { session } } = await supabase.auth.getSession();
      
      // Log para debugging - muestra el email del usuario o "No user"
      console.log('useAuth: Initial session:', session?.user?.email || 'No user');
      
      // Actualiza el estado del usuario con el usuario de la sesión o null
      // El operador ?? (nullish coalescing) usa null si session?.user es null o undefined
      setUser(session?.user ?? null);
      
      // Indica que la carga inicial ha terminado
      setLoading(false);
    };

    // Ejecuta la función para obtener la sesión inicial
    getInitialSession();

    /**
     * Suscripción a cambios en el estado de autenticación
     * onAuthStateChange escucha eventos como SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, etc.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      /**
       * Callback que se ejecuta cuando cambia el estado de autenticación
       * @param event - Tipo de evento (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
       * @param session - Sesión actual (puede ser null si el usuario cerró sesión)
       */
      async (event, session) => {
        // Log para debugging - muestra el evento y el email del usuario
        console.log('useAuth: Auth state change:', event, session?.user?.email || 'No user');
        
        // Actualiza el estado del usuario cuando cambia la autenticación
        setUser(session?.user ?? null);
        
        // Indica que ya no se está cargando
        setLoading(false);
      }
    );

    // Función de limpieza que se ejecuta al desmontar el componente
    // Cancela la suscripción para evitar memory leaks
    return () => subscription.unsubscribe();
  }, []); // Array vacío significa que este efecto solo se ejecuta una vez al montar

  /**
   * Función para cerrar sesión
   * Elimina la sesión del usuario y actualiza el estado
   */
  const signOut = async () => {
    // Llama a signOut de Supabase
    // Esto elimina la sesión del storage y notifica a todos los listeners
    await supabase.auth.signOut();
  };

  // Retorna el estado y las funciones para que los componentes puedan usarlos
  return {
    user,      // Usuario actual o null
    loading,   // Estado de carga inicial
    signOut    // Función para cerrar sesión
  };
};
