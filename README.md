Este proyecto implementa un planificador inteligente de vuelos que busca la ruta más optima (mas barata o mas rápida) entre aeropuertos, permitiendo escalas intermedias obligatorias, utilizando algoritmos de búsqueda de grafos como Dijkstra y A*.  
Los precios y combinaciones de vuelos se obtienen dinámicamente desde SerpAPI (Google Flights), minimizando el número de consultas mediante caché persistente en MongoDB y optimizando las peticiones que realizamos para obtener la máxima información con una sola consulta.  


**APIs externas:**

&nbsp;&nbsp;&nbsp;&nbsp;**SerpAPI – Google Flights**  
&nbsp;&nbsp;&nbsp;&nbsp;Se utiliza para obtener:  
&nbsp;&nbsp;&nbsp;&nbsp;-Precios reales de vuelos  
&nbsp;&nbsp;&nbsp;&nbsp;-Tramos y escalas  
&nbsp;&nbsp;&nbsp;&nbsp;Documentación de la API: https://serpapi.com/google-flights-api  


**Guía de despliegue**

**Prerequisitos**  
-Node.js: Instalar Node 18+.  
-Docker: Para despliegue en contenedores.  

**Variables de entorno**  
Crear un archivo '.env' en 'backend/' con:  
-SERPAPI_API_KEY: clave para SerpApi.  

**Pasos**  
A continuación, abrir un terminal en la carpeta raíz del proyecto y ejecutar los siguientes comandos en orden:  

    npm install  
    cd backend  
    docker-compose up -d  
    npx tsx scripts/airportsMigration.ts --docker  
    npx tsx scripts/airlinesMigration.ts --docker  

La página principal será accesible a través de http://localhost:5173  

