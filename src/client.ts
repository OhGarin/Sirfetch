import { SirFetchResponse } from "./types.js";
import { SirFetchError } from "./errors.js";
const DEFAULT_TIMEOUT = 10000;

export class SirFetch {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

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
      if (error instanceof Error && error.name === "AbortError") {
        throw new SirFetchError(
          `La petición excedió el tiempo de espera de ${timeout} ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
}