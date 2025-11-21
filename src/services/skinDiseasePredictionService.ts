// Servicio para la API de predicción de enfermedades de piel en perros
// La URL se obtiene de la variable de entorno VITE_SKIN_DISEASE_API_URL

export interface SkinDiseasePrediction {
  success: boolean;
  prediction?: {
    predicted_class: string;
    confidence: number;
    all_probabilities: {
      [key: string]: number;
    };
  };
  image_info?: {
    filename: string;
    content_type: string;
    size_bytes: number;
  };
  error?: string;
}

export interface PredictionResult {
  success: boolean;
  disease?: string;
  confidence?: number;
  probabilities?: { [key: string]: number };
  imageInfo?: {
    filename: string;
    contentType: string;
    sizeBytes: number;
  };
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_SKIN_DISEASE_API_URL || '';

// Validación de variable de entorno requerida
if (!API_BASE_URL) {
  console.warn('VITE_SKIN_DISEASE_API_URL no está configurada. El análisis de enfermedades de piel no funcionará.');
}

export const skinDiseasePredictionService = {
  /**
   * Predice enfermedades de piel en perros o gatos a partir de una imagen
   * @param file - Archivo de imagen (JPG, PNG, BMP, TIFF)
   * @param animalType - Tipo de animal: 'perros' o 'gatos'
   * @returns Promise con el resultado de la predicción
   */
  async predictSkinDisease(file: File, animalType: 'perros' | 'gatos' = 'perros'): Promise<PredictionResult> {
    try {
      // Validar que la URL de la API esté configurada
      if (!API_BASE_URL) {
        return {
          success: false,
          error: 'La API de predicción no está configurada. Por favor, configura VITE_SKIN_DISEASE_API_URL en tu archivo .env'
        };
      }

      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Tipo de archivo no soportado. Use JPG, PNG, BMP o TIFF.'
        };
      }

      // El modelo puede manejar cualquier tamaño de imagen
      // La recomendación de 224x224 es solo para mejor precisión, no es obligatorio

      // Crear FormData para multipart/form-data
      const formData = new FormData();
      formData.append('file', file);

      console.log('Enviando imagen para predicción:', {
        filename: file.name,
        type: file.type,
        size: file.size
      });

      // Hacer la petición POST con el parámetro animal_type
      const response = await fetch(`${API_BASE_URL}/predict?animal_type=${animalType}`, {
        method: 'POST',
        body: formData,
        // No incluir Content-Type header, fetch lo maneja automáticamente para FormData
      });

      console.log('Respuesta de la API:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error de la API:', errorText);
        return {
          success: false,
          error: `Error HTTP ${response.status}: ${errorText}`
        };
      }

      const data: SkinDiseasePrediction = await response.json();
      console.log('Datos de predicción recibidos:', data);

      if (data.success && data.prediction) {
        return {
          success: true,
          disease: data.prediction.predicted_class,
          confidence: data.prediction.confidence,
          probabilities: data.prediction.all_probabilities,
          imageInfo: data.image_info ? {
            filename: data.image_info.filename,
            contentType: data.image_info.content_type,
            sizeBytes: data.image_info.size_bytes
          } : undefined
        };
      } else {
        return {
          success: false,
          error: data.error || 'Error desconocido en la predicción'
        };
      }

    } catch (error: any) {
      console.error('Error en predicción de enfermedades de piel:', error);
      return {
        success: false,
        error: `Error: ${error.message}`
      };
    }
  },

  /**
   * Verifica el estado de la API
   * @returns Promise con el estado de salud de la API
   */
  async checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error en health check:', error);
      throw new Error(`Health check error: ${error.message}`);
    }
  },

  /**
   * Obtiene la lista de clases de enfermedades disponibles
   * @returns Promise con la lista de clases
   */
  async getAvailableClasses(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/classes`);
      if (!response.ok) {
        throw new Error(`Failed to get classes: ${response.status}`);
      }
      const data = await response.json();
      return data.classes || [];
    } catch (error: any) {
      console.error('Error obteniendo clases:', error);
      throw new Error(`Error getting classes: ${error.message}`);
    }
  },

  /**
   * Obtiene información general sobre la API
   * @returns Promise con información de la API
   */
  async getApiInfo(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      if (!response.ok) {
        throw new Error(`Failed to get API info: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error obteniendo información de la API:', error);
      throw new Error(`Error getting API info: ${error.message}`);
    }
  }
};

// Clases de enfermedades disponibles por tipo de animal
export const DISEASE_CLASSES = {
  perros: {
    'Dermatitis': 'Inflamación de la piel',
    'Infecciones Fúngicas': 'Infecciones causadas por hongos',
    'Sano': 'Piel normal sin problemas',
    'Hipersensibilidad': 'Reacciones alérgicas',
    'demodicosis': 'Infestación por ácaros Demodex',
    'Ringworm': 'Tiña (infección fúngica específica)'
  },
  gatos: {
    'alergia a las pulgas': 'Reacción alérgica a la saliva de las pulgas',
    'sano': 'Piel normal sin problemas',
    'Ringworm': 'Tiña (infección fúngica específica)',
    'sarna': 'Infestación por ácaros de la sarna'
  }
} as const;

// Función helper para obtener descripción de enfermedad
export const getDiseaseDescription = (disease: string, animalType: 'perros' | 'gatos' = 'perros'): string => {
  const animalClasses = DISEASE_CLASSES[animalType];
  return animalClasses[disease as keyof typeof animalClasses] || 'Enfermedad no identificada';
};

// Función helper para determinar severidad basada en la enfermedad
export const getDiseaseSeverity = (disease: string, confidence: number): 'low' | 'medium' | 'high' => {
  if (disease === 'Sano' || disease === 'sano') {
    return 'low';
  }
  
  if (confidence >= 0.8) {
    return 'high';
  } else if (confidence >= 0.6) {
    return 'medium';
  } else {
    return 'low';
  }
};

// Función helper para generar recomendaciones basadas en la enfermedad
export const getDiseaseRecommendations = (disease: string, animalType: 'perros' | 'gatos' = 'perros'): string[] => {
  const recommendations: { [key: string]: string[] } = {
    // Enfermedades de perros
    'Sano': [
      'Mantener el régimen de cuidado actual',
      'Continuar con la alimentación balanceada',
      'Programar revisión veterinaria de rutina'
    ],
    'Dermatitis': [
      'Evitar alérgenos conocidos',
      'Usar champús hipoalergénicos',
      'Consultar veterinario para tratamiento tópico',
      'Considerar dieta de eliminación'
    ],
    'Infecciones Fúngicas': [
      'Tratamiento antifúngico prescrito por veterinario',
      'Mantener el área seca y limpia',
      'Evitar contacto con otros animales',
      'Lavar ropa de cama frecuentemente'
    ],
    'Hipersensibilidad': [
      'Identificar y evitar alérgenos',
      'Antihistamínicos si es prescrito',
      'Baños frecuentes con champú medicado',
      'Considerar inmunoterapia'
    ],
    'demodicosis': [
      'Tratamiento con medicamentos antiparasitarios',
      'Fortalecer el sistema inmunológico',
      'Evitar estrés en el animal',
      'Seguimiento veterinario regular'
    ],
    'Ringworm': [
      'Tratamiento antifúngico tópico y sistémico',
      'Desinfectar el ambiente',
      'Aislar de otros animales',
      'Usar guantes al manipular al animal'
    ],
    // Enfermedades de gatos
    'sano': [
      'Mantener el régimen de cuidado actual',
      'Continuar con la alimentación balanceada',
      'Programar revisión veterinaria de rutina'
    ],
    'alergia a las pulgas': [
      'Tratamiento antipulgas regular',
      'Limpieza profunda del hogar',
      'Aspirado frecuente de alfombras y muebles',
      'Consultar veterinario para tratamiento preventivo'
    ],
    'sarna': [
      'Tratamiento con medicamentos antiparasitarios',
      'Aislamiento de otros animales',
      'Limpieza y desinfección del ambiente',
      'Seguimiento veterinario regular'
    ]
  };

  return recommendations[disease] || [
    'Consultar con veterinario inmediatamente',
    'No automedicar',
    'Mantener al animal cómodo',
    'Documentar síntomas para el veterinario'
  ];
};

// Mapeo de recomendaciones en español a inglés
const recommendationsTranslationMap: { [key: string]: string } = {
  // Recomendaciones generales
  'Mantener el régimen de cuidado actual': 'Maintain current care regimen',
  'Continuar con la alimentación balanceada': 'Continue with balanced diet',
  'Programar revisión veterinaria de rutina': 'Schedule routine veterinary checkup',
  'Consultar con veterinario inmediatamente': 'Consult veterinarian immediately',
  'No automedicar': 'Do not self-medicate',
  'Mantener al animal cómodo': 'Keep the animal comfortable',
  'Documentar síntomas para el veterinario': 'Document symptoms for veterinarian',
  
  // Dermatitis
  'Evitar alérgenos conocidos': 'Avoid known allergens',
  'Usar champús hipoalergénicos': 'Use hypoallergenic shampoos',
  'Consultar veterinario para tratamiento tópico': 'Consult veterinarian for topical treatment',
  'Considerar dieta de eliminación': 'Consider elimination diet',
  
  // Infecciones Fúngicas
  'Tratamiento antifúngico prescrito por veterinario': 'Antifungal treatment prescribed by veterinarian',
  'Mantener el área seca y limpia': 'Keep the area dry and clean',
  'Evitar contacto con otros animales': 'Avoid contact with other animals',
  'Lavar ropa de cama frecuentemente': 'Wash bedding frequently',
  
  // Hipersensibilidad
  'Identificar y evitar alérgenos': 'Identify and avoid allergens',
  'Antihistamínicos si es prescrito': 'Antihistamines if prescribed',
  'Baños frecuentes con champú medicado': 'Frequent baths with medicated shampoo',
  'Considerar inmunoterapia': 'Consider immunotherapy',
  
  // Demodicosis
  'Tratamiento con medicamentos antiparasitarios': 'Treatment with antiparasitic medications',
  'Fortalecer el sistema inmunológico': 'Strengthen immune system',
  'Evitar estrés en el animal': 'Avoid stress in the animal',
  'Seguimiento veterinario regular': 'Regular veterinary follow-up',
  
  // Ringworm
  'Tratamiento antifúngico tópico y sistémico': 'Topical and systemic antifungal treatment',
  'Desinfectar el ambiente': 'Disinfect the environment',
  'Aislar de otros animales': 'Isolate from other animals',
  'Usar guantes al manipular al animal': 'Use gloves when handling the animal',
  
  // Alergia a las pulgas
  'Tratamiento antipulgas regular': 'Regular flea treatment',
  'Limpieza profunda del hogar': 'Deep home cleaning',
  'Aspirado frecuente de alfombras y muebles': 'Frequent vacuuming of carpets and furniture',
  'Consultar veterinario para tratamiento preventivo': 'Consult veterinarian for preventive treatment',
  
  // Sarna
  'Aislamiento de otros animales': 'Isolation from other animals',
  'Limpieza y desinfección del ambiente': 'Cleaning and disinfection of the environment',
};

/**
 * Traduce recomendaciones del español al inglés
 * @param recommendations - Array de recomendaciones en español
 * @param language - Idioma objetivo ('es' o 'en')
 * @returns Array de recomendaciones traducidas
 */
export const translateRecommendations = (recommendations: string[], language: 'es' | 'en'): string[] => {
  if (language === 'es') {
    return recommendations; // Ya están en español
  }
  
  // Traducir al inglés
  return recommendations.map(rec => recommendationsTranslationMap[rec] || rec);
};