import { SirFetch, SirFetchError } from "./src/index.js";

/**
 * Estructura parcial de un Pokémon devuelto por la PokeAPI.
 * Solo se declaran los campos que se utilizan en este ejemplo.
 */
interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
}

/**
 * Estructura de una publicación de ejemplo de JSONPlaceholder.
 */
interface Publicacion {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// Cliente principal apuntando a la PokeAPI con tiempo de espera y reintentos.
const pokeCliente = new SirFetch({
  baseURL: "https://pokeapi.co/api/v2",
  timeout: 5000,
  retries: 2,
  retryDelay: 400,
});

// Interceptor que registra en consola cada petición antes de enviarse.
pokeCliente.addRequestInterceptor((opciones) => {
  console.log(`[sirfetch] Enviando petición ${opciones.method ?? "GET"}`);
  return opciones;
});

/**
 * Ejemplo de peticiones GET que consulta datos de Pokémon reales.
 */
async function ejemploGet(): Promise<void> {
  console.log("\n===== GET: consultar un Pokémon =====");

  const respuesta = await pokeCliente.get<Pokemon>("/pokemon/pikachu");
  const pokemon = respuesta.data;
  const tipos = pokemon.types.map((t) => t.type.name).join(", ");

  console.log(`Estado HTTP: ${respuesta.status}`);
  console.log(`Nombre: ${pokemon.name}`);
  console.log(`Altura: ${pokemon.height} | Peso: ${pokemon.weight}`);
  console.log(`Tipos: ${tipos}`);
}

/**
 * Ejemplo de POST, PUT y PATCH usando  JSONPlaceholder.
 */
async function ejemploEscritura(): Promise<void> {
  const cliente = new SirFetch({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  console.log("\n===== POST: crear una publicación =====");
  const creada = await cliente.post<Publicacion>("/posts", {
    title: "Mi primera publicación con sirfetch",
    body: "Contenido enviado desde la librería.",
    userId: 1,
  });
  console.log(`Creada con id ${creada.data.id} (estado ${creada.status})`);

  console.log("\n===== PUT: reemplazar una publicación =====");
  const reemplazada = await cliente.put<Publicacion>("/posts/1", {
    id: 1,
    title: "Publicación reemplazada por completo",
    body: "Todos los campos fueron enviados.",
    userId: 1,
  });
  console.log(`Título actualizado: ${reemplazada.data.title}`);

  console.log("\n===== PATCH: actualizar un solo campo =====");
  const modificada = await cliente.patch<Publicacion>("/posts/1", {
    title: "Solo se cambió el título",
  });
  console.log(`Nuevo título: ${modificada.data.title}`);

  console.log("\n===== DELETE: eliminar una publicación =====");
  const eliminada = await cliente.delete("/posts/1");
  console.log(`Eliminada (estado ${eliminada.status})`);
}

/**
 * Ejemplo de manejo de errores con SirFetchError para una ruta inexistente.
 */
async function ejemploError(): Promise<void> {
  console.log("\n===== Manejo de errores =====");

  try {
    await pokeCliente.get("/pokemon/estepokemonnoexiste");
  } catch (error) {
    if (error instanceof SirFetchError) {
      console.log(`Se capturó un SirFetchError (estado ${error.status})`);
      console.log(`Mensaje: ${error.message}`);
    } else {
      console.log("Se capturó un error inesperado.");
    }
  }
}

/**
 * Ejecuta todos los ejemplos en orden.
 */
async function main(): Promise<void> {
  await ejemploGet();
  await ejemploEscritura();
  await ejemploError();
  console.log("\nTodos los ejemplos finalizaron.");
}

main();