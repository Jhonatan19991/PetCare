/**
 * Hook personalizado para manejar traducciones
 * Este hook proporciona acceso a las traducciones según el idioma actual
 * Utiliza el contexto de LanguageProvider para obtener el idioma seleccionado
 */

// Importa el hook useLanguage del LanguageProvider
// Este hook proporciona el idioma actual seleccionado por el usuario
import { useLanguage } from "@/components/LanguageProvider";

// Importa el objeto translations que contiene todas las traducciones
// Estructura: { es: { ... }, en: { ... } }
import { translations } from "@/lib/translations";

/**
 * Hook useTranslation
 * Proporciona acceso a las traducciones en el idioma actual
 * 
 * @returns {Object} Objeto con:
 *   - t: Objeto con todas las traducciones en el idioma actual
 *   - language: Código del idioma actual ('es' o 'en')
 * 
 * @example
 * const { t } = useTranslation();
 * <h1>{t.dashboard.title}</h1> // "Panel de Control" o "Dashboard"
 */
export function useTranslation() {
  // Obtiene el idioma actual del contexto LanguageProvider
  // El idioma puede ser 'es' (español) o 'en' (inglés)
  const { language } = useLanguage();
  
  // Retorna las traducciones y el idioma actual
  return {
    // t contiene todas las traducciones en el idioma actual
    // translations[language] accede al objeto de traducciones del idioma seleccionado
    // Ejemplo: si language = 'es', entonces t = translations.es
    t: translations[language],
    // language es el código del idioma actual ('es' o 'en')
    language,
  };
}
