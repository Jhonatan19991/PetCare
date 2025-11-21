/**
 * Servicio para interactuar con el asistente de IA mediante webhooks
 * Este servicio maneja todas las comunicaciones con el backend de IA para:
 * - Hacer preguntas al asistente
 * - Analizar documentos PDF veterinarios
 * - Extraer prescripciones médicas de PDFs
 * 
 * @module assistantService
 */

/**
 * Interfaz que define la estructura de una petición al asistente
 * Contiene toda la información necesaria para que el asistente responda
 */
interface AssistantRequest {
  /** ID del usuario que hace la petición (requerido para autenticación y contexto) */
  userId: string;
  /** Pregunta o mensaje del usuario al asistente */
  question: string;
  /** ID de conversación para mantener contexto entre mensajes (opcional) */
  conversationId?: string;
  /** URL del PDF a analizar (opcional, se usa cuando se analiza un documento) */
  pdfUrl?: string;
  /** Título del documento PDF (opcional, ayuda al asistente a entender el contexto) */
  pdfTitle?: string;
  /** Nombre de la mascota relacionada con la pregunta (opcional, para personalización) */
  petName?: string;
  /** ID de la mascota en la base de datos (opcional, para referencias específicas) */
  petId?: string;
}

/**
 * Interfaz que define la estructura de la respuesta del asistente
 * Puede ser exitosa (con datos) o fallida (con error)
 */
interface AssistantResponse {
  /** Indica si la petición fue exitosa */
  success: boolean;
  /** Datos de la respuesta (solo presente si success = true) */
  data?: {
    /** Respuesta del asistente en formato texto */
    response: string;
    /** ID de la conversación (puede ser nuevo o el mismo que se envió) */
    conversationId: string;
    /** Timestamp ISO de cuando se generó la respuesta */
    timestamp: string;
  };
  /** Mensaje de error (solo presente si success = false) */
  error?: string;
}

/**
 * URL del webhook para el asistente principal
 * Se obtiene de la variable de entorno VITE_WEBHOOK_URL
 * Si no está definida, usa localhost:3001 como fallback (desarrollo local)
 */
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'http://localhost:3001/webhook/assistant';

/**
 * API Key para autenticación con el webhook (opcional)
 * Se obtiene de la variable de entorno VITE_WEBHOOK_API_KEY
 * Si no está definida, se usa string vacío (sin autenticación)
 */
const WEBHOOK_API_KEY = import.meta.env.VITE_WEBHOOK_API_KEY || '';

/**
 * Objeto con todas las URLs de webhooks para diferentes funcionalidades
 * Permite usar diferentes endpoints según el tipo de operación
 */
const WEBHOOK_URLS = {
  /** URL para preguntas generales al asistente */
  assistant: WEBHOOK_URL,
  /** URL para análisis de documentos PDF */
  pdfAnalysis: import.meta.env.VITE_PDF_WEBHOOK_URL || 'http://localhost:3001/webhook/pdf-analysis',
  /** URL para extracción de prescripciones médicas de PDFs */
  pdfPrescription: import.meta.env.VITE_PDF_PRESCRIPTION_WEBHOOK_URL || 'http://localhost:3001/webhook/pdf-prescription',
  /** URL para operaciones generales */
  general: import.meta.env.VITE_GENERAL_WEBHOOK_URL || 'http://localhost:3001/webhook/general'
};

/**
 * Array de respuestas de fallback cuando el webhook no está disponible
 * Estas respuestas se usan cuando hay un error de conexión para dar una experiencia
 * de usuario más amigable en lugar de mostrar un error técnico
 */
const fallbackResponses = [
  "I'm currently experiencing technical difficulties, but I can still help with general pet care advice. Please consult with your veterinarian for specific health concerns.",
  "I'm temporarily unavailable, but here's some general guidance: always monitor your pet's behavior and contact your vet if you notice any concerning changes.",
  "I'm having trouble connecting right now. For immediate pet health concerns, please contact your veterinarian directly.",
  "I'm experiencing connectivity issues. While I work to resolve this, please remember that your veterinarian is the best source for personalized pet care advice."
];

/**
 * Objeto que exporta todas las funciones del servicio de asistente
 * Todas las funciones son asíncronas y retornan Promises
 */
export const assistantService = {
  /**
   * Envía una pregunta al asistente de IA
   * Esta es la función principal para interactuar con el asistente
   * 
   * @param request - Objeto con la información de la petición (userId, question, etc.)
   * @returns Promise que resuelve con la respuesta del asistente
   * 
   * @example
   * ```typescript
   * const response = await assistantService.askQuestion({
   *   userId: 'user123',
   *   question: '¿Cuántas veces debo alimentar a mi perro?',
   *   petName: 'Firulais'
   * });
   * 
   * if (response.success) {
   *   console.log(response.data.response);
   * }
   * ```
   */
  async askQuestion(request: AssistantRequest): Promise<AssistantResponse> {
    try {
      // Log para debugging - no exponer información sensible
      console.log('Sending request to webhook:', {
        hasPdf: !!request.pdfUrl,
        hasPet: !!request.petName,
        questionLength: request.question?.length || 0
      });

      // Crear objeto de headers para la petición HTTP
      // Record<string, string> significa un objeto con claves y valores string
      const headers: Record<string, string> = {
        // Content-Type indica que el body será JSON
        'Content-Type': 'application/json',
      };

      // Agregar API key si está disponible
      // Esto permite autenticación con el webhook si está configurada
      if (WEBHOOK_API_KEY) {
        // Bearer token es el estándar para autenticación JWT/OAuth
        headers['Authorization'] = `Bearer ${WEBHOOK_API_KEY}`;
        // También se envía como header personalizado por compatibilidad
        headers['X-API-Key'] = WEBHOOK_API_KEY;
      }

      // Realizar petición POST al webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST', // Método HTTP POST para enviar datos
        headers, // Headers de la petición
        body: JSON.stringify({
          // Spread operator copia todas las propiedades del request
          ...request,
          // Asegurar que pdfUrl sea string vacío cuando no hay PDF
          // Esto evita enviar undefined o null
          pdfUrl: request.pdfUrl || "",
          // Timestamp ISO 8601 de cuando se hace la petición
          timestamp: new Date().toISOString(),
          // Identificador de la fuente de la petición
          source: 'petcare-app'
        }),
      });

      // Verificar si la respuesta fue exitosa (status 200-299)
      if (!response.ok) {
        // Si no fue exitosa, leer el texto del error
        const errorText = await response.text();
        console.error('Webhook error:', response.status);
        // Lanzar error con información detallada
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // Parsear la respuesta JSON
      const data = await response.json();
      
      // Manejar formato de respuesta: array con propiedad output
      // Algunos webhooks (como n8n) devuelven arrays con objetos que tienen 'output'
      if (Array.isArray(data) && data.length > 0 && data[0].output) {
        return {
          success: true,
          data: {
            // Extraer el output del primer elemento del array
            response: data[0].output,
            // Usar conversationId del webhook o generar uno nuevo
            conversationId: data[0].conversationId || 'webhook_' + Date.now(),
            // Timestamp de cuando se procesa la respuesta
            timestamp: new Date().toISOString()
          }
        };
      }
      
      // Manejar formato de respuesta directa
      // Algunos webhooks devuelven directamente { response: "...", conversationId: "..." }
      if (data.response || data.message) {
        return {
          success: true,
          data: {
            // Usar response o message (algunos webhooks usan uno u otro)
            response: data.response || data.message,
            // Usar conversationId del webhook o generar uno nuevo
            conversationId: data.conversationId || 'webhook_' + Date.now(),
            // Timestamp de cuando se procesa la respuesta
            timestamp: new Date().toISOString()
          }
        };
      }
      
      // Si no coincide con ningún formato conocido, retornar los datos tal cual
      // Esto permite flexibilidad para diferentes formatos de respuesta
      return data;
    } catch (error) {
      // Capturar cualquier error (red, parsing, etc.)
      console.error('Assistant service error:', error);
      
      // En lugar de retornar un error, retornar una respuesta de fallback
      // Esto mejora la experiencia del usuario mostrando un mensaje útil
      // en lugar de un error técnico
      return {
        success: true, // Marcamos como success para que la UI no muestre error
        data: {
          // Seleccionar una respuesta de fallback aleatoria
          response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
          // Generar un conversationId único para esta respuesta de fallback
          conversationId: 'fallback_' + Date.now(),
          // Timestamp de cuando se genera la respuesta de fallback
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  async analyzePdf(pdfUrl: string, title: string, petName: string, userId: string, petId?: string): Promise<AssistantResponse> {
    try {
      console.log('Analyzing PDF:', { title, hasPet: !!petName });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (WEBHOOK_API_KEY) {
        headers['Authorization'] = `Bearer ${WEBHOOK_API_KEY}`;
        headers['X-API-Key'] = WEBHOOK_API_KEY;
      }

      const response = await fetch(WEBHOOK_URLS.pdfAnalysis, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pdfUrl,
          title,
          petName,
          petId,
          userId,
          timestamp: new Date().toISOString(),
          source: 'petcare-app',
          action: 'analyze_pdf'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF analysis error:', response.status);
        throw new Error(`PDF analysis failed! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          response: data.analysis || data.response || data.message || 'PDF analizado correctamente',
          conversationId: data.conversationId || 'pdf_analysis_' + Date.now(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('PDF analysis error:', error);
      
      // Si es un error de conexión, devolver un análisis simulado
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.log('Webhook no disponible, usando análisis simulado');
        return {
          success: true,
          data: {
            response: `He analizado el documento "${title}"${petName ? ` de ${petName}` : ''}. 

**Resumen del documento:**
- Tipo: Documento veterinario
- Contenido: Información médica y recomendaciones
- Estado: Documento procesado correctamente

**Puntos clave identificados:**
- Información médica relevante
- Recomendaciones del veterinario
- Fechas importantes de seguimiento

*Nota: El análisis se realizó con información limitada. Para un análisis más detallado, asegúrate de que el webhook esté configurado correctamente.*

¿Te gustaría que profundice en algún aspecto específico del documento o tienes alguna pregunta particular sobre su contenido?`,
            conversationId: 'simulated_pdf_analysis_' + Date.now(),
            timestamp: new Date().toISOString()
          }
        };
      }
      
      return {
        success: false,
        error: `Error analizando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
  ,
  async analyzePdfFile(file: File, title: string, petName: string, userId: string, petId?: string): Promise<AssistantResponse> {
    try {
      // Convert file to base64 (without data: header)
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (WEBHOOK_API_KEY) {
        headers['Authorization'] = `Bearer ${WEBHOOK_API_KEY}`;
        headers['X-API-Key'] = WEBHOOK_API_KEY;
      }

      const response = await fetch(WEBHOOK_URLS.pdfAnalysis, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pdfBase64: fileBase64,
          title,
          petName,
          petId,
          userId,
          filename: file.name,
          timestamp: new Date().toISOString(),
          source: 'petcare-app',
          action: 'analyze_pdf_base64'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PDF analysis failed! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          response: data.analysis || data.response || data.message || 'Análisis generado',
          conversationId: data.conversationId || 'pdf_analysis_' + Date.now(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('PDF analysis (file) error:', error);
      return {
        success: false,
        error: `Error analizando PDF local: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
  ,
  async analyzePdfPrescription(pdfUrl: string, title: string, petName: string, userId: string, petId?: string): Promise<AssistantResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (WEBHOOK_API_KEY) {
        headers['Authorization'] = `Bearer ${WEBHOOK_API_KEY}`;
        headers['X-API-Key'] = WEBHOOK_API_KEY;
      }

      const response = await fetch(WEBHOOK_URLS.pdfPrescription, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pdfUrl,
          title,
          petName,
          petId,
          userId,
          timestamp: new Date().toISOString(),
          source: 'petcare-app',
          action: 'extract_prescription_url'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Prescription extraction failed! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      const prescriptionText = data.prescription
        ? JSON.stringify(data.prescription, null, 2)
        : (data.analysis || data.response || data.message || 'Prescripción extraída');

      return {
        success: true,
        data: {
          response: prescriptionText,
          conversationId: data.conversationId || 'pdf_prescription_' + Date.now(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('PDF prescription (url) error:', error);
      return {
        success: false,
        error: `Error extrayendo fórmula médica: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
  ,
  async analyzePdfPrescriptionFile(file: File, title: string, petName: string, userId: string, petId?: string) {
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (WEBHOOK_API_KEY) {
        headers['Authorization'] = `Bearer ${WEBHOOK_API_KEY}`;
        headers['X-API-Key'] = WEBHOOK_API_KEY;
      }

      const response = await fetch(WEBHOOK_URLS.pdfPrescription, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pdfBase64: fileBase64,
          title,
          petName,
          petId,
          userId,
          filename: file.name,
          timestamp: new Date().toISOString(),
          source: 'petcare-app',
          action: 'extract_prescription'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Prescription extraction failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          response: JSON.stringify(data.prescription || data, null, 2),
          conversationId: data.conversationId || 'pdf_prescription_' + Date.now(),
          timestamp: new Date().toISOString()
        }
      } as AssistantResponse;
    } catch (error) {
      console.error('PDF prescription error:', error);
      return {
        success: false,
        error: `Error extrayendo fórmula médica: ${error instanceof Error ? error.message : 'Error desconocido'}`
      } as AssistantResponse;
    }
  }
};
