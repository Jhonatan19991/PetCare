/**
 * Servicio FHIR para crear recursos HL7 FHIR directamente desde el frontend
 * 
 * Este servicio se comunica directamente con el servidor HAPI FHIR público
 * (https://hapi.fhir.org/baseR4) para crear recursos Patient y Observation
 * siguiendo el estándar HL7 FHIR.
 * 
 * @module fhirApiService
 */

import axios from 'axios';

/**
 * Datos de la mascota necesarios para crear recursos FHIR
 */
export interface PetFhirData {
  /** Nombre de la mascota */
  name: string;
  /** Especie (ej: "Perro", "Gato") */
  species: string;
  /** Raza de la mascota */
  breed: string;
  /** Fecha de nacimiento en formato ISO (YYYY-MM-DD) */
  birthDate: string;
  /** Peso inicial en kilogramos (opcional) */
  initialWeight?: number;
}

/**
 * Respuesta del servicio FHIR después de crear recursos
 */
export interface FhirPetResponse {
  /** Indica si la operación fue exitosa */
  success: boolean;
  /** Mensaje descriptivo del resultado */
  message?: string;
  /** ID del recurso Patient creado en HAPI FHIR */
  patientId?: string;
  /** ID del recurso Observation creado (peso inicial), null si no se proporcionó peso */
  observationId?: string | null;
  /** Mensaje de error si la operación falló */
  error?: string;
  /** Detalles adicionales del error */
  details?: any;
}

/**
 * URL base del servidor HAPI FHIR público
 * Se puede configurar mediante la variable de entorno VITE_FHIR_SERVER_BASE_URL
 * Por defecto usa el servidor público de HAPI FHIR
 */
const FHIR_SERVER_BASE_URL = import.meta.env.VITE_FHIR_SERVER_BASE_URL || 'https://hapi.fhir.org/baseR4';

/**
 * Servicio para interactuar con el servidor FHIR
 */
export const fhirApiService = {
  /**
   * Crea recursos FHIR (Patient y Observation) para una mascota
   * 
   * Este método realiza dos operaciones principales:
   * 1. Crea un recurso FHIR Patient con extensiones personalizadas para datos veterinarios
   * 2. Si se proporciona peso inicial, crea un recurso FHIR Observation vinculado al Patient
   * 
   * @param petData - Datos de la mascota a convertir en recursos FHIR
   * @returns Promise con el resultado de la operación, incluyendo los IDs de los recursos creados
   * 
   * @example
   * ```typescript
   * const result = await fhirApiService.createPetInFhir({
   *   name: "Firulais",
   *   species: "Perro",
   *   breed: "Labrador",
   *   birthDate: "2020-01-15",
   *   initialWeight: 25.5
   * });
   * 
   * if (result.success) {
   *   console.log(`Patient ID: ${result.patientId}`);
   *   console.log(`Observation ID: ${result.observationId}`);
   * }
   * ```
   */
  async createPetInFhir(petData: PetFhirData): Promise<FhirPetResponse> {
    try {
      console.log('Creating FHIR resources for pet:', petData);

      // Validar campos requeridos
      if (!petData.name || !petData.species || !petData.birthDate) {
        return {
          success: false,
          error: 'Name, species, and birthDate are required fields',
        };
      }

      // ============================================
      // PASO 1: Crear el recurso FHIR Patient
      // ============================================
      /**
       * Recurso Patient según el estándar HL7 FHIR
       * 
       * Estructura:
       * - resourceType: Tipo de recurso FHIR (siempre "Patient")
       * - extension: Extensiones personalizadas para datos veterinarios
       *   - patient-species: Especie de la mascota
       *   - patient-breed: Raza de la mascota
       * - name: Nombre del paciente (mascota)
       * - birthDate: Fecha de nacimiento
       * - active: Indica si el paciente está activo
       */
      const patientResource = {
        resourceType: 'Patient',
        
        // Extensiones personalizadas para contexto veterinario
        // Estas extensiones permiten almacenar datos específicos de mascotas
        // que no están en el estándar FHIR base
        extension: [
          {
            // URL de la extensión para especie (estructura personalizada)
            url: 'http://medisync.example.com/fhir/StructureDefinition/patient-species',
            valueString: petData.species
          },
          {
            // URL de la extensión para raza (estructura personalizada)
            url: 'http://medisync.example.com/fhir/StructureDefinition/patient-breed',
            valueString: petData.breed
          }
        ],
        
        // Nombre del paciente (mascota)
        // Usamos 'text' para el nombre completo ya que las mascotas no tienen
        // nombre/apellido separados como los humanos
        name: [{
          use: 'official', // Uso oficial del nombre
          text: petData.name
        }],
        
        // Fecha de nacimiento en formato ISO (YYYY-MM-DD)
        birthDate: petData.birthDate,
        
        // Indica que el paciente está activo en el sistema
        active: true
      };

      // Enviar petición POST al servidor HAPI FHIR para crear el Patient
      // Content-Type: application/fhir+json es el tipo MIME estándar para recursos FHIR
      const patientResponse = await axios.post(
        `${FHIR_SERVER_BASE_URL}/Patient`,
        patientResource,
        {
          headers: {
            'Content-Type': 'application/fhir+json'
          }
        }
      );

      // Extraer el ID del Patient creado desde la respuesta del servidor FHIR
      const patientId = patientResponse.data.id;
      console.log(`✅ FHIR Patient created with ID: ${patientId}`);

      // ============================================
      // PASO 2: Crear el recurso FHIR Observation (si hay peso inicial)
      // ============================================
      let observationId: string | null = null;

      if (petData.initialWeight) {
        /**
         * Recurso Observation según el estándar HL7 FHIR
         * 
         * Este recurso representa una observación médica (en este caso, el peso)
         * 
         * Estructura:
         * - resourceType: Tipo de recurso FHIR (siempre "Observation")
         * - status: Estado de la observación ("final" = completada y verificada)
         * - category: Categoría de la observación (vital-signs = signos vitales)
         * - code: Código que identifica qué se está observando
         *   - system: Sistema de codificación (LOINC para observaciones clínicas)
         *   - code: Código LOINC específico (29463-7 = Body Weight / Peso corporal)
         * - subject: Referencia al Patient al que pertenece esta observación
         * - effectiveDateTime: Fecha/hora en que se tomó la observación
         * - valueQuantity: Valor cuantitativo de la observación (peso en kg)
         */
        const observationResource = {
          resourceType: 'Observation',
          
          // Estado final indica que la observación está completa y verificada
          status: 'final',
          
          // Categoría: Signos vitales
          category: [{
            coding: [{
              // Sistema de terminología HL7 para categorías de observación
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs'
            }]
          }],
          
          // Código que identifica qué se está observando
          code: {
            coding: [{
              // LOINC (Logical Observation Identifiers Names and Codes)
              // Sistema estándar para identificar observaciones clínicas
              system: 'http://loinc.org',
              // Código LOINC 29463-7 = Body Weight (Peso corporal)
              code: '29463-7',
              display: 'Body Weight'
            }]
          },
          
          // Referencia al Patient creado anteriormente
          // Formato: "Patient/[ID]" - referencia relativa al recurso Patient
          subject: {
            reference: `Patient/${patientId}`
          },
          
          // Fecha y hora en que se tomó la observación (formato ISO 8601)
          effectiveDateTime: new Date().toISOString(),
          
          // Valor cuantitativo de la observación
          valueQuantity: {
            value: parseFloat(petData.initialWeight.toString()), // Valor numérico del peso
            unit: 'kg', // Unidad de medida
            // Sistema de unidades estándar (UCUM - Unified Code for Units of Measure)
            system: 'http://unitsofmeasure.org',
            code: 'kg' // Código UCUM para kilogramos
          }
        };

        // Enviar petición POST al servidor HAPI FHIR para crear la Observation
        const observationResponse = await axios.post(
          `${FHIR_SERVER_BASE_URL}/Observation`,
          observationResource,
          {
            headers: {
              'Content-Type': 'application/fhir+json'
            }
          }
        );

        // Extraer el ID de la Observation creada
        observationId = observationResponse.data.id;
        console.log(`✅ FHIR Observation created with ID: ${observationId}`);
      }

      // Retornar resultado exitoso con los IDs de los recursos creados
      return {
        success: true,
        message: 'Pet and initial weight successfully created as FHIR resources.',
        patientId: patientId,
        observationId: observationId
      };

    } catch (error) {
      // Manejo de errores
      console.error('❌ Error creating FHIR resources:', error);

      // Si es un error de Axios (error de red o respuesta HTTP)
      if (axios.isAxiosError(error)) {
        // Extraer información del error de la respuesta del servidor FHIR
        const errorDetails = error.response?.data;
        const errorMessage = error.response?.data?.issue?.[0]?.diagnostics 
          || error.response?.data?.message 
          || error.message;

        return {
          success: false,
          error: `Failed to create FHIR resources: ${errorMessage}`,
          details: errorDetails
        };
      }

      // Error genérico
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  /**
   * Crea solo un recurso FHIR Observation (peso) para un Patient existente
   * 
   * Este método se usa cuando se registra un nuevo peso en el seguimiento de peso.
   * Crea una Observation vinculada al Patient existente en HAPI FHIR.
   * 
   * @param patientId - ID del Patient en HAPI FHIR (ej: "123456")
   * @param weight - Peso en kilogramos
   * @param effectiveDateTime - Fecha/hora en que se tomó la observación (formato ISO 8601)
   * @returns Promise con el resultado de la operación, incluyendo el ID de la Observation creada
   * 
   * @example
   * ```typescript
   * const result = await fhirApiService.createWeightObservation(
   *   "123456",
   *   25.5,
   *   "2024-01-15T10:30:00.000Z"
   * );
   * 
   * if (result.success) {
   *   console.log(`Observation ID: ${result.observationId}`);
   * }
   * ```
   */
  async createWeightObservation(
    patientId: string,
    weight: number,
    effectiveDateTime?: string
  ): Promise<FhirPetResponse> {
    try {
      console.log('Creating FHIR Observation for weight:', { patientId, weight, effectiveDateTime });

      // Validar campos requeridos
      if (!patientId || !weight) {
        return {
          success: false,
          error: 'Patient ID and weight are required fields',
        };
      }

      // Usar la fecha/hora proporcionada o la actual
      const observationDateTime = effectiveDateTime || new Date().toISOString();

      /**
       * Recurso Observation según el estándar HL7 FHIR
       * 
       * Este recurso representa una observación médica (peso) vinculada a un Patient existente.
       * 
       * Estructura:
       * - resourceType: Tipo de recurso FHIR (siempre "Observation")
       * - status: Estado de la observación ("final" = completada y verificada)
       * - category: Categoría de la observación (vital-signs = signos vitales)
       * - code: Código que identifica qué se está observando
       *   - system: Sistema de codificación (LOINC para observaciones clínicas)
       *   - code: Código LOINC específico (29463-7 = Body Weight / Peso corporal)
       * - subject: Referencia al Patient al que pertenece esta observación
       * - effectiveDateTime: Fecha/hora en que se tomó la observación
       * - valueQuantity: Valor cuantitativo de la observación (peso en kg)
       */
      const observationResource = {
        resourceType: 'Observation',
        
        // Estado final indica que la observación está completa y verificada
        status: 'final',
        
        // Categoría: Signos vitales
        category: [{
          coding: [{
            // Sistema de terminología HL7 para categorías de observación
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }]
        }],
        
        // Código que identifica qué se está observando
        code: {
          coding: [{
            // LOINC (Logical Observation Identifiers Names and Codes)
            // Sistema estándar para identificar observaciones clínicas
            system: 'http://loinc.org',
            // Código LOINC 29463-7 = Body Weight (Peso corporal)
            code: '29463-7',
            display: 'Body Weight'
          }]
        },
        
        // Referencia al Patient existente
        // Formato: "Patient/[ID]" - referencia relativa al recurso Patient
        subject: {
          reference: `Patient/${patientId}`
        },
        
        // Fecha y hora en que se tomó la observación (formato ISO 8601)
        effectiveDateTime: observationDateTime,
        
        // Valor cuantitativo de la observación
        valueQuantity: {
          value: parseFloat(weight.toString()), // Valor numérico del peso
          unit: 'kg', // Unidad de medida
          // Sistema de unidades estándar (UCUM - Unified Code for Units of Measure)
          system: 'http://unitsofmeasure.org',
          code: 'kg' // Código UCUM para kilogramos
        }
      };

      // Enviar petición POST al servidor HAPI FHIR para crear la Observation
      const observationResponse = await axios.post(
        `${FHIR_SERVER_BASE_URL}/Observation`,
        observationResource,
        {
          headers: {
            'Content-Type': 'application/fhir+json'
          }
        }
      );

      // Extraer el ID de la Observation creada
      const observationId = observationResponse.data.id;
      console.log(`✅ FHIR Observation created with ID: ${observationId}`);

      // Retornar resultado exitoso con el ID de la Observation creada
      return {
        success: true,
        message: 'Weight observation successfully created as FHIR resource.',
        observationId: observationId
      };

    } catch (error) {
      // Manejo de errores
      console.error('❌ Error creating FHIR Observation:', error);

      // Si es un error de Axios (error de red o respuesta HTTP)
      if (axios.isAxiosError(error)) {
        // Extraer información del error de la respuesta del servidor FHIR
        const errorDetails = error.response?.data;
        const errorMessage = error.response?.data?.issue?.[0]?.diagnostics 
          || error.response?.data?.message 
          || error.message;

        return {
          success: false,
          error: `Failed to create FHIR Observation: ${errorMessage}`,
          details: errorDetails
        };
      }

      // Error genérico
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

