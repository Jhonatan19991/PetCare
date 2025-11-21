/**
 * Servicio para subir imágenes de mascotas a almacenamiento en la nube
 * Soporta múltiples proveedores de almacenamiento: Supabase Storage y Azure Blob Storage
 * 
 * @module imageUploadService
 */

// Importa el cliente de Supabase para acceder al almacenamiento
import { supabase } from "@/integrations/supabase/client";

/**
 * Interfaz de configuración para diferentes proveedores de almacenamiento
 * Permite cambiar entre Supabase y Azure sin modificar el código de las funciones
 */
interface UploadConfig {
  /** Proveedor de almacenamiento a usar */
  provider: 'supabase' | 'azure';
  /** Configuración específica para Supabase Storage (opcional si provider = 'supabase') */
  supabase?: {
    /** Nombre del bucket en Supabase Storage donde se guardarán las imágenes */
    bucket: string;
  };
  /** Configuración específica para Azure Blob Storage (opcional si provider = 'azure') */
  azure?: {
    /** Nombre de la cuenta de Azure Storage */
    accountName: string;
    /** Nombre del contenedor (equivalente a bucket) en Azure */
    containerName: string;
    /** Token SAS (Shared Access Signature) o clave de cuenta para autenticación */
    sasToken: string; // SAS token or account key
  };
}

/**
 * Configuración por defecto del servicio de subida
 * Por defecto usa Supabase Storage, pero se puede cambiar a Azure
 * 
 * Para usar Azure Blob Storage, descomenta y configura las opciones de azure
 */
const uploadConfig: UploadConfig = {
  // Proveedor por defecto: Supabase
  provider: 'supabase',
  // Configuración de Supabase
  supabase: {
    // Nombre del bucket donde se guardan las imágenes de mascotas
    bucket: 'pet-images'
  }
  // Para usar Azure Blob Storage, descomenta y configura:
  // provider: 'azure',
  // azure: {
  //   accountName: 'your-storage-account',
  //   containerName: 'pet-images',
  //   sasToken: 'your-sas-token'
  // }
};

/**
 * Interfaz que define el resultado de una operación de subida
 * Puede ser exitosa (con URL) o fallida (con error)
 */
export interface UploadResult {
  /** Indica si la subida fue exitosa */
  success: boolean;
  /** URL pública de la imagen subida (solo presente si success = true) */
  url?: string;
  /** Mensaje de error (solo presente si success = false) */
  error?: string;
}

/**
 * Función principal para subir una imagen de mascota
 * Esta función actúa como un router que delega a la función específica
 * según el proveedor configurado (Supabase o Azure)
 * 
 * @param file - Archivo de imagen a subir (File object del input)
 * @param userId - ID del usuario que sube la imagen (para organizar archivos por usuario)
 * @param petId - ID de la mascota (opcional, para referencia futura)
 * @returns Promise que resuelve con el resultado de la subida (URL o error)
 * 
 * @example
 * ```typescript
 * const result = await uploadPetImage(imageFile, 'user123', 'pet456');
 * if (result.success) {
 *   console.log('Imagen subida:', result.url);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export const uploadPetImage = async (
  file: File,
  userId: string,
  petId?: string
): Promise<UploadResult> => {
  try {
    // Verificar qué proveedor está configurado y llamar a la función correspondiente
    if (uploadConfig.provider === 'supabase') {
      // Usar Supabase Storage
      return await uploadToSupabase(file, userId, petId);
    } else if (uploadConfig.provider === 'azure') {
      // Usar Azure Blob Storage
      return await uploadToAzure(file, userId, petId);
    } else {
      // Proveedor no soportado
      return {
        success: false,
        error: 'Unsupported storage provider'
      };
    }
  } catch (error: any) {
    // Capturar cualquier error inesperado
    console.error('Upload error:', error);
    return {
      success: false,
      // Retornar el mensaje de error o un mensaje genérico
      error: error.message || 'Upload failed'
    };
  }
};

/**
 * Función interna para subir imagen a Supabase Storage
 * Esta función maneja la lógica específica de Supabase
 * 
 * @param file - Archivo de imagen a subir
 * @param userId - ID del usuario (se usa para crear la estructura de carpetas)
 * @param petId - ID de la mascota (opcional, no se usa actualmente pero disponible para futuro)
 * @returns Promise con el resultado de la subida
 */
const uploadToSupabase = async (
  file: File,
  userId: string,
  petId?: string
): Promise<UploadResult> => {
  // Extraer la extensión del archivo (jpg, png, etc.)
  // split('.') divide el nombre por puntos, pop() obtiene el último elemento (la extensión)
  const fileExt = file.name.split('.').pop();
  
  // Crear un nombre único para el archivo
  // Formato: userId/timestamp.extension
  // Ejemplo: "user123/1704067200000.jpg"
  // Esto organiza los archivos por usuario y evita colisiones de nombres
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  // Subir el archivo a Supabase Storage
  // from() selecciona el bucket, upload() sube el archivo
  // El operador ! (non-null assertion) indica que estamos seguros de que supabase existe
  const { data, error } = await supabase.storage
    .from(uploadConfig.supabase!.bucket)
    .upload(fileName, file);

  // Si hay un error en la subida, retornar el error
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }

  // Obtener la URL pública del archivo subido
  // Esta URL puede ser usada directamente en <img src="..."> o compartida
  const { data: { publicUrl } } = supabase.storage
    .from(uploadConfig.supabase!.bucket)
    .getPublicUrl(fileName);

  // Retornar éxito con la URL pública
  return {
    success: true,
    url: publicUrl
  };
};

/**
 * Función interna para subir imagen a Azure Blob Storage
 * Esta función maneja la lógica específica de Azure usando su REST API
 * 
 * @param file - Archivo de imagen a subir
 * @param userId - ID del usuario (se usa para crear la estructura de carpetas)
 * @param petId - ID de la mascota (opcional, no se usa actualmente pero disponible para futuro)
 * @returns Promise con el resultado de la subida
 */
const uploadToAzure = async (
  file: File,
  userId: string,
  petId?: string
): Promise<UploadResult> => {
  // Verificar que la configuración de Azure existe
  if (!uploadConfig.azure) {
    return {
      success: false,
      error: 'Azure configuration not found'
    };
  }

  // Extraer la configuración de Azure
  const { accountName, containerName, sasToken } = uploadConfig.azure;
  
  // Extraer la extensión del archivo
  const fileExt = file.name.split('.').pop();
  
  // Crear un nombre único para el archivo (mismo formato que Supabase)
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  // Construir la URL del endpoint de Azure Blob Storage REST API
  // Formato: https://{accountName}.blob.core.windows.net/{containerName}/{fileName}?{sasToken}
  // El SAS token se incluye en la query string para autenticación
  const url = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}?${sasToken}`;
  
  try {
    // Realizar petición PUT a Azure Blob Storage REST API
    // PUT es el método HTTP usado para crear/actualizar blobs en Azure
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        // Header requerido por Azure para especificar el tipo de blob
        'x-ms-blob-type': 'BlockBlob',
        // Content-Type del archivo (image/jpeg, image/png, etc.)
        'Content-Type': file.type,
      },
      // El body es el archivo directamente
      body: file,
    });

    // Verificar si la respuesta fue exitosa
    if (!response.ok) {
      // Leer el texto del error de la respuesta
      const errorText = await response.text();
      return {
        success: false,
        error: `Azure upload failed: ${response.status} ${errorText}`
      };
    }

    // Construir la URL pública del archivo (sin el SAS token)
    // Esta URL puede ser usada para acceso público si el contenedor está configurado así
    const publicUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}`;
    
    // Retornar éxito con la URL pública
    return {
      success: true,
      url: publicUrl
    };
  } catch (error: any) {
    // Capturar errores de red u otros errores inesperados
    return {
      success: false,
      error: `Azure upload error: ${error.message}`
    };
  }
};
