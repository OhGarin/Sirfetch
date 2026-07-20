/**
 * Representa la respuesta de una petición realizada con sirfetch.
 * @template T - El tipo de dato esperado en el cuerpo de la respuesta.
 */
export interface SirFetchResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}