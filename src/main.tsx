/**
 * Punto de entrada principal de la aplicación React
 * Este archivo inicializa la aplicación React y la renderiza en el DOM
 */

// Importa la función createRoot de React DOM para crear la raíz de la aplicación
// createRoot es la API moderna de React 18+ para renderizar aplicaciones
import { createRoot } from "react-dom/client";

// Importa el componente principal de la aplicación
// App.tsx contiene toda la configuración de rutas y proveedores de contexto
import App from "./App.tsx";

// Importa los estilos globales de la aplicación
// index.css contiene estilos base, variables CSS y configuraciones de Tailwind
import "./index.css";

// Obtiene el elemento HTML con id "root" del DOM
// El operador ! (non-null assertion) indica que estamos seguros de que el elemento existe
// Si no existe, la aplicación fallará, lo cual es el comportamiento esperado
const rootElement = document.getElementById("root")!;

// Crea la raíz de React en el elemento del DOM
// Esto prepara el contenedor para renderizar componentes React
const root = createRoot(rootElement);

// Renderiza el componente App en la raíz
// Esto inicia toda la aplicación React
root.render(<App />);
