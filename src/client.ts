import {
  SirFetchResponse,
  SirFetchConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from "./types.js";
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
  /** Lista de interceptores que se ejecutan antes de cada petición. */
  private readonly requestInterceptors: RequestInterceptor[] = [];
  /** Lista de interceptores que se ejecutan después de cada respuesta. */
  private readonly responseInterceptors: ResponseInterceptor[] = [];

  /**
   * Crea una instancia de SirFetch con la configuración proporcionada.
   * @param config - Opciones de configuración del cliente (opcional).
   */
  constructor(config: SirFetchConfig = {}) {
    this.config = config;
  }

  /**
   * Registra un interceptor que se ejecutará antes de cada petición.
   * @param interceptor - Función que recibe y devuelve las opciones de la petición.
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Registra un interceptor que se ejecutará después de cada respuesta exitosa.
   * @param interceptor - Función que recibe y devuelve la respuesta procesada.
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
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

    // Aplica los interceptores de petición en orden para modificar las opciones.
    let finalOptions: RequestInit = { ...options, headers: mergedHeaders };
    for (const interceptor of this.requestInterceptors) {
      finalOptions = interceptor(finalOptions);
    }

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
          ...finalOptions,
          signal: controller.signal,
        });

        // Si la respuesta no es exitosa se lanza un error controlado.
        if (!response.ok) {
          throw new SirFetchError(
            `La petición falló con el estado ${response.status}`,
            response.status
          );
        }

        const data = (await response.json()) as T;

        // Se construye la respuesta y aplica los interceptores de respuesta en orden.
        let result: SirFetchResponse<unknown> = {
          data,
          status: response.status,
          ok: response.ok,
        };
        for (const interceptor of this.responseInterceptors) {
          result = interceptor(result);
        }

        return result as SirFetchResponse<T>;
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
        if (this.isClientError(error)) {
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
   * Determina si un error corresponde a un error de cliente (código 4xx),
   * los cuales no deben reintentarse porque no son fallos temporales.
   * @param error - El error a evaluar.
   * @returns `true` si es un error de cliente.
   */
  private isClientError(error: unknown): boolean {
    return (
      error instanceof SirFetchError &&
      error.status !== undefined &&
      error.status >= 400 &&
      error.status < 500
    );
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