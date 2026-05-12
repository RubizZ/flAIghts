<p align="center">
  <svg width="128" height="128" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0F172A"/>
    <defs>
      <linearGradient id="grad" x1="6" y1="8" x2="24" y2="25" gradientUnits="userSpaceOnUse">
        <stop stop-color="#60A5FA"/>
        <stop offset="1" stop-color="#A855F7"/>
      </linearGradient>
      <clipPath id="plane-clip">
        <path d="M24 8L6 15L13 18L16 25L24 8Z"/>
      </clipPath>
    </defs>
    <path d="M24 8L6 15L13 18L16 25L24 8Z" fill="url(#grad)" />
    <path d="M24 8L13 18" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" clip-path="url(#plane-clip)" />
  </svg>
</p>

<h1 align="center">flAIghts</h1>

<p align="center">
  <strong>Planificador inteligente de vuelos optimizado mediante algoritmos de grafos e IA.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.17-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/React-19-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/MongoDB-8.0-green.svg" alt="MongoDB">
  <img src="https://img.shields.io/badge/Ollama-Local_AI-orange.svg" alt="Ollama">
  <img src="https://img.shields.io/badge/Three.js-3D_Visuals-black.svg" alt="Three.js">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg" alt="Tailwind CSS">
</p>

---

## ✈️ Sobre el Proyecto

**flAIghts** es una plataforma avanzada para la planificación de rutas aéreas que combina la potencia de algoritmos clásicos de optimización con datos en tiempo real. El sistema no solo busca vuelos, sino que diseña la trayectoria más eficiente (en coste o tiempo) permitiendo la inclusión de escalas intermedias obligatorias.

### Características Principales

- 🔍 **Búsqueda Inteligente**: Encuentra rutas óptimas basadas en múltiples criterios.
- 🤖 **IA Local**: Integración con **Ollama** para el procesamiento inteligente de consultas mediante LLMs (Qwen 2.5).
- 🌐 **Visualización 3D**: Experiencia inmersiva con un globo terráqueo interactivo desarrollado en **Three.js**.
- 📍 **Escalas Personalizadas**: Soporte para paradas obligatorias durante el trayecto.
- ⚡ **Optimización de Grafos**: Implementación del algoritmo **Dijkstra** para garantizar la eficiencia y encontrar la ruta óptima en el grafo de vuelos.
- 💾 **Caché Persistente**: Uso de MongoDB para minimizar latencias y costes de API.
- 🌍 **Datos Reales**: Integración con **SerpAPI (Google Flights)**.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Inteligencia Artificial** | Ollama (Local LLMs), OpenAI SDK |
| **Visualización 3D** | Three.js (Globo interactivo) |
| **Frontend** | React 19, Vite, Tailwind CSS v4, GSAP, TanStack Query |
| **Backend** | Node.js 22, Express, TSOA, Mongoose, Zod |
| **Base de Datos** | MongoDB 8 |
| **Infraestructura** | Docker, Docker Compose, MinIO (S3), Mailpit |
| **API Externa** | SerpAPI (Google Flights) |

---

## 🚀 Guía de Inicio Rápido

### Prerrequisitos

- **Node.js** (v18 o superior)
- **Docker** & **Docker Compose**
- Una API Key de [SerpAPI](https://serpapi.com/)

### Configuración del Entorno

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/flAIghts.git
   cd flAIghts
   ```

2. Configura las variables de entorno:
   Crea un archivo `.env` en la **raíz del proyecto**.

   **Obligatorio:**
   ```env
   SERPAPI_API_KEY=tu_api_key_aqui  # Necesaria para obtener precios de vuelos reales
   ```

   **Opcional (para habilitar Google Login):**
   ```env
   VITE_GOOGLE_CLIENT_ID=tu_google_client_id
   GOOGLE_CLIENT_ID=tu_google_client_id
   ```

**Nota:** El servidor está diseñado para ser interactivo; si falta alguna variable de entorno crítica durante el inicio, se solicitará automáticamente a través de la terminal.

### Instalación y Despliegue con Docker

Este proyecto está completamente dockerizado, lo que facilita enormemente su despliegue:

1. **Levantar el proyecto**:
   Desde la raíz, ejecuta el siguiente comando para construir e iniciar todos los servicios (Base de datos, Backend, Frontend y utilidades):
   ```bash
   docker compose up -d
   ```

2. **Ejecutar migraciones**:
   Una vez que los contenedores estén en marcha, debes poblar la base de datos con la información de aeropuertos y aerolíneas:
   ```bash
   # Migración de aeropuertos
   docker compose exec server npx tsx scripts/migrations/airportsMigration.ts
   
   # Migración de aerolíneas
   docker compose exec server npx tsx scripts/migrations/airlinesMigration.ts
   ```

---

## 🌐 Acceso a los Servicios

| Servicio | URL | Credenciales (Dev) |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:5173](http://localhost:5173) | - |
| **Backend API** | [http://localhost:3000](http://localhost:3000) | - |
| **Mailpit (Simulador de Email)** | [http://localhost:8025](http://localhost:8025) | - |
| **MinIO (Almacenamiento S3)** | [http://localhost:9001](http://localhost:9001) | `admin` / `admin123` |

---

## 🗄️ Administración de la Base de Datos

Para explorar y manipular los datos de desarrollo, puedes utilizar herramientas como [MongoDB Compass](https://www.mongodb.com/products/compass).

### Conexión local
Utiliza la siguiente URI para conectarte a la instancia de MongoDB en Docker:
```bash
mongodb://root:1234@localhost:27017/flAIghts?authSource=admin
```

### Gestión de Roles (Superadmin)
Por razones de seguridad, no existe un registro directo para administradores. Si necesitas que un usuario tenga privilegios de `superadmin` (para acceder al panel de administración y ver métricas avanzadas), sigue estos pasos:
1. **Regístrate** normalmente desde la aplicación frontend.
2. **Abre la base de datos** con Compass u otra herramienta.
3. Busca el documento del usuario en la colección `users` de la base de datos `flAIghts`.
4. **Cambia manualmente** el valor del campo `role` de `"user"` a `"superadmin"`.

---

## 🏗️ Consideraciones de Producción

El archivo `docker-compose.yaml` incluido está optimizado exclusivamente para **entornos de desarrollo**. Para un despliegue en producción, ten en cuenta lo siguiente:

- **Imágenes Docker**: Puedes utilizar las imágenes generadas por el proyecto, pero asegúrate de usar los archivos `Dockerfile` de producción (si existen) o configurar adecuadamente los comandos de inicio en tu orquestador.
- **Variables de Entorno**: Es crítico configurar correctamente las variables de entorno de producción (como `NODE_ENV=production`, `MONGODB_URI` a una instancia segura, secretos de JWT fuertes, etc.).
- **Persistencia y Seguridad**: No utilices las credenciales por defecto de MongoDB o MinIO en producción. Se recomienda usar servicios gestionados para la base de datos y el almacenamiento de objetos.
- **Escalabilidad**: Considera el uso de un orquestador como Kubernetes o servicios de nube tipo PaaS para gestionar el escalado y la disponibilidad de los servicios.

## 📊 Analytics y Reportes

El proyecto incluye herramientas avanzadas de análisis de usabilidad, con capacidad para exportar reportes en HTML y visualizaciones de datos (SUS, KDE distributions) para evaluar la experiencia del usuario.

- **Modo Evaluación**: Por defecto, el modo evaluación está **activado** en el entorno de desarrollo para facilitar las pruebas del TFG.
- **Configuración**: Puedes desactivarlo cambiando la variable de entorno `VITE_EVALUATION_MODE` a `false` en tu archivo `.env`.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<p align="center">
  Desarrollado con ❤️ para el TFG de Ingeniería Informática en la Universidad Complutense de Madrid.
</p>

