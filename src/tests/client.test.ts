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
  test("Realiza un GET exitoso y devuelve los datos", async () => {
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
  test("Lanza SirFetchError cuando el servidor responde con 404", async () => {
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
  test("No reintenta ante un error 404", async () => {
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
  test("Reintenta ante un error 500", async () => {
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

  test("El método POST envía el cuerpo en formato JSON", async () => {
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

  test("Lanza SirFetchError cuando se excede el tiempo de espera", async () => {
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

    await expect(
      cliente.get("https://ejemplo.com/lento", 10)
    ).rejects.toThrow(SirFetchError);
  });

  test("aplica el timeout definido en la configuración del cliente", async () => {
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

    // El timeout se define en la configuración, no por llamada.
    const cliente = new SirFetch({ timeout: 10 });

    await expect(cliente.get("https://ejemplo.com/lento")).rejects.toThrow(
      SirFetchError
    );
  });

});

describe("SirFetch - metodos PUT, PATCH y DELETE", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("el metodo PUT envía el método correcto y el cuerpo en JSON", async () => {
    const datos = { id: 1, title: "Actualizado" };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => datos,
    } as never);

    const cliente = new SirFetch();
    await cliente.put("https://ejemplo.com/posts/1", datos);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://ejemplo.com/posts/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(datos),
      })
    );
  });

  test("el metodo PATCH envia el metodo correcto y el cuerpo en JSON", async () => {
    const datos = { title: "Solo el título" };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => datos,
    } as never);

    const cliente = new SirFetch();
    await cliente.patch("https://ejemplo.com/posts/1", datos);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://ejemplo.com/posts/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(datos),
      })
    );
  });

  test("el metodo DELETE envía el metodo correcto", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as never);

    const cliente = new SirFetch();
    await cliente.delete("https://ejemplo.com/posts/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://ejemplo.com/posts/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("SirFetch - interceptores", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("ejecuta un interceptor de petición registrado", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as never);

    const cliente = new SirFetch();
    let interceptorEjecutado = false;

    cliente.addRequestInterceptor((opciones) => {
      interceptorEjecutado = true;
      return opciones;
    });

    await cliente.get("https://ejemplo.com/recurso");

    expect(interceptorEjecutado).toBe(true);
  });

  test("ejecuta un interceptor de respuesta registrado", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valor: 1 }),
    } as never);

    const cliente = new SirFetch();
    let statusRecibido = 0;

    cliente.addResponseInterceptor((respuesta) => {
      statusRecibido = respuesta.status;
      return respuesta;
    });

    await cliente.get("https://ejemplo.com/recurso");

    expect(statusRecibido).toBe(200);
  });
});