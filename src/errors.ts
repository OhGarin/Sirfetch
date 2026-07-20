/**
 * Error personalizado que representa un fallo en una petición de sirfetch.
 * Se lanza cuando el servidor responde con un código de error (4xx o 5xx).
 */
export class SirFetchError extends Error {
  public readonly status?: number;

  /**
   * Crea una instancia de SirFetchError.
   * @param message - Mensaje descriptivo del error.
   * @param status - Código de estado HTTP asociado al error.
   */
  constructor(message: string, status?: number) {
    super(message);
    this.name = "SirFetchError";
    this.status = status;

    Object.setPrototypeOf(this, SirFetchError.prototype);
  }
}