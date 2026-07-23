<div align="center">

# Sirfetch

Un cliente HTTP ligero, resiliente y tipado para realizar peticiones a APIs.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Zero Dependencies](https://img.shields.io/badge/dependencias-0-brightgreen?style=for-the-badge)

</div>

---

## Descripción

**sirfetch** es una librería que actúa como un wrapper sobre la API `fetch`, proporcionando una interfaz limpia y tipada para realizar peticiones HTTP. Incorpora tiempo de espera, reintentos automáticos ante fallos temporales, manejo de errores controlado e interceptores para lógica transversal. Está escrita en TypeScript y no requiere ninguna dependencia externa para funcionar.

## Características

- **Cinco métodos HTTP**: `GET`, `POST`, `PUT`, `PATCH` y `DELETE`.
- **Tiempo de espera configurable**: Cancela automáticamente las peticiones que superan el límite establecido.
- **Reintentos automáticos**: Vuelve a intentar la petición ante errores de servidor o de red, y evita reintentar los errores de cliente, que no se resuelven repitiendo la petición.
- **Manejo de errores controlado**: Lanza un error descriptivo, `SirFetchError`, cuando el servidor responde con un código de error, e incluye el código de estado correspondiente.
- **Interceptores**: Ejecuta lógica antes de cada petición y después de cada respuesta, manteniéndola separada de la lógica principal.
- **Tipado con genéricos**: Ofrece autocompletado y verificación de tipos sobre los datos de la respuesta.
- **Sin dependencias de producción**: Utiliza la API `fetch` de forma interna, sin acoplarse a otras librerías.

## Requisitos previos

- Node.js versión 18 o superior
- npm

## Instalación

Clona el repositorio e instala las dependencias de desarrollo:

```bash
git clone https://github.com/OhGarin/Sirfetch.git
cd Sirfetch
npm install
```

Compila la librería para generar los archivos distribuibles:

```bash
npm run build
```

## Integración en un proyecto

Importa la clase principal `SirFetch` y crea una instancia. De forma opcional, puedes pasarle una configuración inicial:

```typescript
import { SirFetch } from "sirfetch";

const cliente = new SirFetch();

const clienteConfig = new SirFetch({
  baseURL: "https://pokeapi.co/api/v2",
  timeout: 5000,
  retries: 2,
  retryDelay: 400,
});
```

### Opciones de configuración

| Opción | Tipo | Por defecto | Descripción |
|--------|------|-------------|-------------|
| `baseURL` | `string` | — | URL base que se antepone a la ruta de cada petición. |
| `timeout` | `number` | `10000` | Milisegundos máximos de espera antes de cancelar la petición. |
| `headers` | `Record<string, string>` | — | Cabeceras que se incluyen en todas las peticiones. |
| `retries` | `number` | `0` | Número de reintentos ante fallos temporales. |
| `retryDelay` | `number` | `300` | Milisegundos de espera entre reintentos. |

## Uso

Todos los métodos son asíncronos y admiten un genérico `<T>` para tipar la respuesta. Devuelven un objeto con la forma `{ data, status, ok }`.

### GET

```typescript
interface Pokemon {
  name: string;
  height: number;
}

const respuesta = await cliente.get<Pokemon>("/pokemon/pikachu");

console.log(respuesta.status);
console.log(respuesta.data.name);
```

### POST

```typescript
const nueva = await cliente.post("/posts", {
  title: "Mi publicación",
  body: "Contenido de la publicación",
  userId: 1,
});

console.log(nueva.status);
```

### PUT

```typescript
await cliente.put("/posts/1", {
  id: 1,
  title: "Publicación reemplazada",
  body: "Todos los campos enviados",
  userId: 1,
});
```

### PATCH

```typescript
await cliente.patch("/posts/1", {
  title: "Solo se actualiza el título",
});
```

### DELETE

```typescript
await cliente.delete("/posts/1");
```

### Manejo de errores

Cuando el servidor responde con un código de error, sirfetch lanza un `SirFetchError` que puedes capturar con `try/catch`:

```typescript
import { SirFetch, SirFetchError } from "sirfetch";

const cliente = new SirFetch();

try {
  await cliente.get("https://ejemplo.com/recurso-inexistente");
} catch (error) {
  if (error instanceof SirFetchError) {
    console.log(error.status);
    console.log(error.message);
  }
}
```

### Interceptores

Los interceptores permiten ejecutar lógica antes de cada petición o después de cada respuesta, sin repetir código en cada llamada:

```typescript
const cliente = new SirFetch();

cliente.addRequestInterceptor((opciones) => {
  console.log(`Enviando petición ${opciones.method}`);
  return opciones;
});

cliente.addResponseInterceptor((respuesta) => {
  console.log(`Respuesta recibida con estado ${respuesta.status}`);
  return respuesta;
});
```

## Ejemplo completo

El archivo [`example.ts`](./example.ts) contiene una demostración ejecutable de todas las funcionalidades. Para correrlo:

```bash
npm run example
```

## Pruebas

La librería incluye pruebas unitarias escritas con Jest. Para ejecutarlas:

```bash
npm test
```

Para ejecutar las pruebas junto con el reporte de cobertura:

```bash
npm run test:coverage
```

## Estructura del proyecto

| Ruta | Responsabilidad |
|------|-----------------|
| `src/client.ts` | Clase `SirFetch` con la lógica de las peticiones, timeout, reintentos e interceptores. |
| `src/errors.ts` | Clase de error personalizada `SirFetchError`. |
| `src/types.ts` | Interfaces y tipos de la librería. |
| `src/index.ts` | Punto de entrada que expone la API pública. |
| `src/tests/` | Pruebas unitarias. |
| `example.ts` | Demostración de uso de la librería. |

## Tecnologías

- **TypeScript** como lenguaje de desarrollo.
- **Jest** para las pruebas unitarias.
- **Git** con el flujo de trabajo GitFlow para el control de versiones.