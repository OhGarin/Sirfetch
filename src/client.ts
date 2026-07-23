import { SirFetchResponse, SirFetchConfig } from "./types.js";
import { SirFetchError } from "./errors.js";
const DEFAULT_TIMEOUT = 10000;
/** Tiempo de espera predeterminado entre reintentos en milisegundos. */
const DEFAULT_RETRY_DELAY = 300;

/**
 * Pausa la ejecución durante un número determinado de milisegundos.
 * @param ms - Milisegundos que se desea esperar.
 * @returns Una promesa que se resuelve tras la espera.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SirFetch {

  /** Configuración interna del cliente. */
  private readonly config: SirFetchConfig;

  /**
   * Crea una instancia de SirFetch con la configuración proporcionada.
   * @param config - Opciones de configuración del cliente (opcional).
   */
  constructor(config: SirFetchConfig = {}) {
    this.config = config;
  }

  /**
   * Realiza una petición HTTP genérica con soporte para tiempo de espera.
   * @template T - El tipo de dato esperado en la respuesta.
   * @param url - La URL a la que se realizará la petición.
   * @param options - Opciones nativas de fetch.
   * @param timeout - Tiempo máximo de espera en milisegundos antes de cancelar.
   * @returns Una promesa que resuelve con la respuesta procesada.
   * @throws {SirFetchError} Si la petición falla, se cancela por tiempo o el servidor responde con error.
   */
  private async request<T>(
    url: string,
    options: RequestInit,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<SirFetchResponse<T>> {
    // Combina la baseURL configurada con la ruta recibida.
    const fullUrl = this.config.baseURL ? `${this.config.baseURL}${url}` : url;

    // Combina las cabeceras configuradas con las específicas de esta petición.
    const mergedHeaders = {
      ...this.config.headers,
      ...(options.headers as Record<string, string>),
    };

    // Determina cuantos reintentos y cuanta espera usar con valores predeterminados.
    const maxRetries = this.config.retries ?? 0;
    const retryDelay = this.config.retryDelay ?? DEFAULT_RETRY_DELAY;

    // Guarda el ultimo error para relanzarlo si se agotan los reintentos.
    let lastError: unknown;

    // Se intenta la petición con el intento inicial y los reintentos configurados.
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(fullUrl, {
          ...options,
          headers: mergedHeaders,
          signal: controller.signal,
        });

        // Se lanza para reintentar los errores de servidor.
        if (response.status >= 500) {
          throw new SirFetchError(
            `La petición falló con el estado ${response.status}`,
            response.status
          );
        }

        // Para otro tipo de error no se hace reintento.
        if (!response.ok) {
          throw new SirFetchError(
            `La petición falló con el estado ${response.status}`,
            response.status
          );
        }

        const data = (await response.json()) as T;

        return {
          data,
          status: response.status,
          ok: response.ok,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        // Si fue un timeout se escribe como error claro.
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new SirFetchError(
            `La petición excedió el tiempo de espera de ${timeout} ms`
          );
        } else {
          lastError = error;
        }

        // Si es un error de cliente no reintenta, se relanza.
        if (
          error instanceof SirFetchError &&
          error.status !== undefined &&
          error.status >= 400 &&
          error.status < 500
        ) {
          throw error;
        }

        // Si aun quedan reintentos espera y luego reintenta.
        if (attempt < maxRetries) {
          await delay(retryDelay);
          continue;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError;
  }
  

  /**
   * Realiza una petición HTTP GET a la URL indicada.
   * @template T - El tipo de dato esperado en la respuesta.
   * @param url - La URL a la que se realizará la petición.
   * @param timeout - Tiempo máximo de espera en milisegundos (opcional).
   * @returns Una promesa que resuelve con la respuesta procesada.
   */
  public async get<T>(url: string, timeout?: number): Promise<SirFetchResponse<T>> {
    return this.request<T>(url, { method: "GET" }, timeout);
  }

  /**
   * Realiza una petición HTTP POST a la URL indicada, enviando datos en formato JSON.
   * @template T - El tipo de dato esperado en la respuesta.
   * @param url - La URL a la que se realizará la petición.
   * @param body - Los datos que se enviarán en el cuerpo de la petición.
   * @param timeout - Tiempo máximo de espera en milisegundos (opcional).
   * @returns Una promesa que resuelve con la respuesta procesada.
   */
  public async post<T>(
    url: string,
    body: unknown,
    timeout?: number
  ): Promise<SirFetchResponse<T>> {
    return this.request<T>(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeout
    );
  }

  /**
   * Realiza una petición HTTP PUT a la URL indicada, enviando datos en formato JSON.
   * @template T - El tipo de dato esperado en la respuesta.
   * @param url - La URL a la que se realizará la petición.
   * @param body - Los datos que se enviarán en el cuerpo de la petición.
   * @param timeout - Tiempo máximo de espera en milisegundos (opcional).
   * @returns Una promesa que resuelve con la respuesta procesada.
   */
  public async put<T>(
    url: string,
    body: unknown,
    timeout?: number
  ): Promise<SirFetchResponse<T>> {
    return this.request<T>(
      url,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeout
    );
  }

  /**
   * Realiza una petición HTTP PATCH a la URL indicada, enviando datos en formato JSON..
   * @template T - El tipo de dato esperado en la respuesta.
   * @param url - La URL a la que se realizará la petición.
   * @param body - Los datos parciales que se enviarán en el cuerpo de la petición.
   * @param timeout - Tiempo máximo de espera en milisegundos (opcional).
   * @returns Una promesa que resuelve con la respuesta procesada.
   */
  public async patch<T>(
    url: string,
    body: unknown,
    timeout?: number
  ): Promise<SirFetchResponse<T>> {
    return this.request<T>(
      url,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeout
    );
  }

  /**
   * Realiza una petición HTTP DELETE a la URL indicada.
   * @template T - El tipo de dato esperado en la respuesta.
   * @param url - La URL del recurso que se desea eliminar.
   * @param timeout - Tiempo máximo de espera en milisegundos (opcional).
   * @returns Una promesa que resuelve con la respuesta procesada.
   */
  public async delete<T>(url: string, timeout?: number): Promise<SirFetchResponse<T>> {
    return this.request<T>(url, { method: "DELETE" }, timeout);
  }
}