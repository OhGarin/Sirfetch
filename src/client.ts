import { SirFetchResponse } from "./types.js";
import { SirFetchError } from "./errors.js";

/**
 * Cliente HTTP ligero y resiliente construido sobre la API nativa fetch.
 * Proporciona una interfaz limpia para realizar peticiones HTTP.
 */
export class SirFetch {
  /**
   * Realiza una petición HTTP GET a la URL indicada.
   * @template T - El tipo de dato esperado en la respuesta.
   * @param url - La URL a la que se realizará la petición.
   * @returns Una promesa que resuelve con la respuesta procesada.
   * @throws {SirFetchError} Si el servidor responde con un código de error (4xx o 5xx).
   */
  public async get<T>(url: string): Promise<SirFetchResponse<T>> {
    const response = await fetch(url, { method: "GET" });

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
  }
}