/**
 * Componente principal de la aplicación React
 * Este archivo configura todos los proveedores de contexto y las rutas de la aplicación
 * 
 * Estructura de proveedores (de más externo a más interno):
 * 1. QueryClientProvider - Manejo de estado del servidor y caché
 * 2. ThemeProvider - Tema claro/oscuro
 * 3. LanguageProvider - Idioma de la aplicación (español/inglés)
 * 4. TooltipProvider - Proveedor para tooltips
 * 5. BrowserRouter - Enrutamiento de la aplicación
 */

// Importa el componente Toaster de shadcn/ui para mostrar notificaciones toast
// Toaster es el contenedor que renderiza las notificaciones en la UI
import { Toaster } from "@/components/ui/toaster";

// Importa Sonner (otro sistema de notificaciones) con alias para evitar conflictos
// Sonner es una librería alternativa de toasts más moderna
import { Toaster as Sonner } from "@/components/ui/sonner";

// Importa TooltipProvider para habilitar tooltips en toda la aplicación
// Los tooltips son los pequeños mensajes que aparecen al hacer hover
import { TooltipProvider } from "@/components/ui/tooltip";

// Importa QueryClient y QueryClientProvider de React Query
// React Query maneja el estado del servidor, caché, y sincronización de datos
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Importa componentes de React Router para el enrutamiento
// BrowserRouter: Proporciona el contexto de enrutamiento
// Routes: Contenedor de todas las rutas
// Route: Define una ruta individual
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Importa el proveedor de tema personalizado
// Permite cambiar entre tema claro y oscuro
import { ThemeProvider } from "@/components/ThemeProvider";

// Importa el proveedor de idioma personalizado
// Permite cambiar entre español e inglés
import { LanguageProvider } from "@/components/LanguageProvider";

// Importa todas las páginas de la aplicación
// Landing: Página de inicio/presentación
import Landing from "./pages/Landing";
// Login: Página de inicio de sesión
import Login from "./pages/Login";
// Register: Página de registro de nuevos usuarios
import Register from "./pages/Register";
// Dashboard: Panel principal del usuario autenticado
import Dashboard from "./pages/Dashboard";
// ForgotPassword: Página para recuperar contraseña
import ForgotPassword from "./pages/ForgotPassword";

// Importa páginas de funcionalidades específicas
// AddPet: Formulario para agregar una nueva mascota
import AddPet from "./pages/AddPet";
// EditPet: Formulario para editar información de una mascota existente
import EditPet from "./pages/EditPet";
// UploadImage: Página para subir/actualizar foto de perfil de mascota
import UploadImage from "./pages/UploadImage";
// AnalyzePetHealth: Página para analizar salud de mascota con IA
import AnalyzePetHealth from "./pages/AnalyzePetHealth";
// CreateReminder: Formulario para crear recordatorios
import CreateReminder from "./pages/CreateReminder";
// CalendarPage: Vista de calendario con recordatorios
import CalendarPage from "./pages/Calendar";
// AskAssistant: Chat con el asistente de IA
import AskAssistant from "./pages/AskAssistant";
// UploadVetNote: Página para subir documentos veterinarios (PDFs)
import UploadVetNote from "./pages/UploadVetNote";
// Tracking: Página principal de seguimiento (peso, vacunas, desparasitaciones)
import Tracking from "./pages/Tracking";
// NotFound: Página 404 para rutas no encontradas
import NotFound from "./pages/NotFound";

/**
 * Instancia de QueryClient para React Query
 * QueryClient es el cliente que maneja el estado del servidor, caché y sincronización
 * Se crea una instancia única que se comparte en toda la aplicación
 */
const queryClient = new QueryClient();

/**
 * Componente principal App
 * Este es el componente raíz que envuelve toda la aplicación
 * Configura todos los proveedores de contexto y define las rutas
 * 
 * Orden de los proveedores es importante:
 * - Los proveedores externos envuelven a los internos
 * - Los componentes internos tienen acceso a los contextos externos
 */
const App = () => (
  // QueryClientProvider: Proporciona el QueryClient a todos los componentes hijos
  // Permite usar hooks como useQuery y useMutation en cualquier componente
  <QueryClientProvider client={queryClient}>
    {/* ThemeProvider: Maneja el tema (claro/oscuro) de la aplicación
        defaultTheme: Tema por defecto al cargar la aplicación
        storageKey: Clave en localStorage donde se guarda la preferencia del usuario */}
    <ThemeProvider defaultTheme="light" storageKey="petcare-ui-theme">
      {/* LanguageProvider: Maneja el idioma (español/inglés) de la aplicación
          defaultLanguage: Idioma por defecto
          storageKey: Clave en localStorage donde se guarda la preferencia del usuario */}
      <LanguageProvider defaultLanguage="es" storageKey="petcare-language">
        {/* TooltipProvider: Habilita tooltips en toda la aplicación
            Los tooltips necesitan este proveedor para funcionar correctamente */}
        <TooltipProvider>
          {/* Toaster: Renderiza las notificaciones toast de shadcn/ui
              Debe estar dentro del router para que las notificaciones funcionen */}
          <Toaster />
          {/* Sonner: Renderiza las notificaciones toast de Sonner
              Sistema alternativo de notificaciones */}
          <Sonner />
          {/* BrowserRouter: Proporciona el contexto de enrutamiento
              Permite usar hooks como useNavigate, useParams, etc. */}
          <BrowserRouter>
            {/* Routes: Contenedor de todas las rutas de la aplicación
                React Router renderiza la primera ruta que coincida con la URL */}
            <Routes>
              {/* Ruta raíz: Página de inicio/presentación */}
              <Route path="/" element={<Landing />} />
              {/* Ruta de login: Página de inicio de sesión */}
              <Route path="/login" element={<Login />} />
              {/* Ruta de registro: Página para crear nueva cuenta */}
              <Route path="/register" element={<Register />} />
              {/* Ruta de recuperación de contraseña */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              {/* Ruta del dashboard: Panel principal (requiere autenticación) */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Ruta para agregar nueva mascota */}
              <Route path="/add-pet" element={<AddPet />} />
              {/* Ruta para editar mascota existente
                  :id es un parámetro dinámico que se puede acceder con useParams() */}
              <Route path="/edit-pet/:id" element={<EditPet />} />
              {/* Ruta para subir/actualizar foto de perfil de mascota */}
              <Route path="/upload-image" element={<UploadImage />} />
              {/* Ruta para analizar salud de mascota con IA */}
              <Route path="/analyze-pet-health" element={<AnalyzePetHealth />} />
              {/* Ruta para crear recordatorio */}
              <Route path="/create-reminder" element={<CreateReminder />} />
              {/* Ruta del calendario: Vista de recordatorios y eventos */}
              <Route path="/calendar" element={<CalendarPage />} />
              {/* Ruta del asistente: Chat con IA */}
              <Route path="/ask-assistant" element={<AskAssistant />} />
              {/* Ruta para subir documentos veterinarios */}
              <Route path="/upload-vet-note" element={<UploadVetNote />} />
              {/* Ruta de seguimiento: Peso, vacunas, desparasitaciones */}
              <Route path="/weight-tracking" element={<Tracking />} />
              {/* IMPORTANTE: Todas las rutas personalizadas deben ir ANTES de esta ruta catch-all
                  Esta ruta captura cualquier URL que no coincida con las rutas anteriores */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Exporta el componente App como exportación por defecto
// Esto permite importarlo como: import App from './App'
export default App;
