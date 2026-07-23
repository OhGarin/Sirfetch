/**
 * Representa la respuesta de una petición realizada con sirfetch.
 * @template T - El tipo de dato esperado en el cuerpo de la respuesta.
 */
export interface SirFetchResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

/**
 * Opciones de configuración para crear una instancia de SirFetch.
 * Todas las propiedades son opcionales.
 */
export interface SirFetchConfig {
  /** URL base que se antepondrá a las rutas de cada petición. */
  baseURL?: string;
  /** Tiempo máximo de espera por defecto en milisegundos. */
  timeout?: number;
  /** Cabeceras que se incluirán en todas las peticiones. */
  headers?: Record<string, string>;
  /** Número de reintentos ante fallos temporales. Predeterminado es un intento. */
  retries?: number;
  /** Milisegundos de espera entre reintentos. Predeterminado 300 ms. */
  retryDelay?: number;
}