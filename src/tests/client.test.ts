import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { SirFetch } from "../client.js";
import { SirFetchError } from "../errors.js";

// Reemplaza el fetch global por un mock.
const mockFetch = jest.fn<(url: unknown, options?: unknown) => Promise<unknown>>();
global.fetch = mockFetch as unknown as typeof fetch;

describe("SirFetch - método GET", () => {
  // Resetea el mock antes de cada prueba.
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // Test para verificar que un GET exitoso devuelve los datos esperados
  test("realiza un GET exitoso y devuelve los datos", async () => {
    const datosFalsos = { id: 1, title: "Post de prueba" };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => datosFalsos,
    });

    const cliente = new SirFetch();

    const respuesta = await cliente.get<{ id: number; title: string }>(
      "https://ejemplo.com/posts/1"
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.ok).toBe(true);
    expect(respuesta.data).toEqual(datosFalsos);
  });

  // Test para verificar que se lanza SirFetchError ante un 404
  test("lanza SirFetchError cuando el servidor responde con 404", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as never);

    const cliente = new SirFetch();

    await expect(cliente.get("https://ejemplo.com/noexiste")).rejects.toThrow(
      SirFetchError
    );
  });

  // Test para verificar que no se reintenta ante un error 404 (error de cliente)
  test("No reintenta ante un error 404 (error de cliente)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as never);

    // Cliente configurado con 3 reintentos
    const cliente = new SirFetch({ retries: 3 });

    try {
      await cliente.get("https://ejemplo.com/noexiste");
    } catch {
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

// Test para verificar que se reintenta ante un error 500 (error de servidor)
  test("reintenta ante un error 500 (error de servidor)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as never);

    const cliente = new SirFetch({ retries: 2, retryDelay: 10 });

    try {
      await cliente.get("https://ejemplo.com/error");
    } catch {
    }
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe("SirFetch - envío de datos y timeout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("el método POST envía el cuerpo en formato JSON", async () => {
    const datosEnviados = { title: "Nuevo post", userId: 1 };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 101, ...datosEnviados }),
    } as never);

    const cliente = new SirFetch();
    await cliente.post("https://ejemplo.com/posts", datosEnviados);

    // Se verifica que fetch recibió el body convertido a JSON y el método correcto.
    expect(mockFetch).toHaveBeenCalledWith(
      "https://ejemplo.com/posts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(datosEnviados),
      })
    );
  });

  test("lanza SirFetchError cuando se excede el tiempo de espera", async () => {
    // Se simula un fetch que nunca responde, pero que reacciona a la señal de aborto.
    mockFetch.mockImplementation(
      (_url: unknown, options: unknown) =>
        new Promise((_resolve, reject) => {
          const signal = (options as { signal: AbortSignal }).signal;
          signal.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    );

    const cliente = new SirFetch();

    // Con un timeout muy corto (10 ms), la petición debe cancelarse.
    await expect(
      cliente.get("https://ejemplo.com/lento", 10)
    ).rejects.toThrow(SirFetchError);
  });
});