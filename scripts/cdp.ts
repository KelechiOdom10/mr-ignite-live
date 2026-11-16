import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";

import { z } from "zod";

type Json = string | number | boolean | null | Json[] | { readonly [key: string]: Json };

type CdpParams = { readonly [key: string]: Json | undefined };

const Frame = z.object({
  id: z.number().optional(),
  method: z.string().optional(),
  params: z.json().optional(),
  result: z.json().optional(),
  error: z.object({ message: z.string() }).optional(),
});

type Frame = z.infer<typeof Frame>;

const Spend = z.object({
  stable: z.number(),
  ms: z.number(),
  height: z.number(),
  width: z.number(),
});

const Layout = z.object({ cssContentSize: z.object({ width: z.number(), height: z.number() }) });

const Shot = z.object({ data: z.string() });

const Target = z.object({ id: z.string(), webSocketDebuggerUrl: z.string() });

const Probe = z.object({
  scrollWidth: z.number(),
  innerWidth: z.number(),
  height: z.number(),
  text: z.number(),
});

const Href = z.string().nullable();

const Found = z.boolean();

const Evaluated = z.object({
  result: z.object({ value: z.json() }),
  exceptionDetails: z
    .object({ text: z.string(), exception: z.object({ description: z.string() }).optional() })
    .optional(),
});

const consoleEvent = z.object({
  type: z.string(),
  args: z.array(z.object({ value: z.json().optional(), description: z.string().optional() })),
});

const exceptionEvent = z.object({ exceptionDetails: z.object({ text: z.string() }) });

const logEvent = z.object({
  entry: z.object({ level: z.string(), text: z.string(), url: z.string().optional() }),
});

class Connection {
  readonly #socket: WebSocket;
  readonly #pending = new Map<
    number,
    { resolve: (frame: Frame) => void; reject: (error: Error) => void }
  >();
  readonly #problems: string[] = [];
  #nextId = 1;

  constructor(socket: WebSocket) {
    this.#socket = socket;
    this.#socket.onmessage = (event: MessageEvent) => this.#receive(event.data);
  }

  static async open(wsUrl: string): Promise<Connection> {
    const socket = new WebSocket(wsUrl);

    await new Promise<void>((done, fail) => {
      socket.onopen = () => done();
      socket.onerror = () => fail(new Error(`could not open a CDP socket to ${wsUrl}`));
    });

    return new Connection(socket);
  }

  problems(): readonly string[] {
    return this.#problems;
  }

  clearProblems(): void {
    this.#problems.length = 0;
  }

  call(method: string, params: CdpParams = {}): Promise<Frame> {
    const id = this.#nextId;

    this.#nextId += 1;

    return new Promise((done, fail) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        fail(new Error(`${method} timed out after 90s`));
      }, 90_000);

      this.#pending.set(id, {
        resolve: (frame) => {
          clearTimeout(timer);
          done(frame);
        },
        reject: (error) => {
          clearTimeout(timer);
          fail(error);
        },
      });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async query<Schema extends z.ZodType>(
    method: string,
    params: CdpParams,
    schema: Schema,
  ): Promise<z.infer<Schema>> {
    const frame = await this.call(method, params);

    const parsed = schema.safeParse(frame.result);

    if (!parsed.success) {
      throw new Error(
        `${method} answered in an unexpected shape: ${JSON.stringify(frame.result).slice(0, 400)}`,
      );
    }

    return parsed.data;
  }

  #receive(raw: string): void {
    const frame = Frame.safeParse(JSON.parse(raw));

    if (!frame.success) return;

    const message = frame.data;

    if (message.id !== undefined) {
      const pending = this.#pending.get(message.id);

      if (!pending) return;

      this.#pending.delete(message.id);

      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message);

      return;
    }

    this.#recordProblem(message);
  }

  #recordProblem(message: Frame): void {
    if (message.params === undefined) return;

    if (message.method === "Runtime.consoleAPICalled") {
      const event = consoleEvent.safeParse(message.params);

      if (!event.success || !["error", "warning", "assert"].includes(event.data.type)) return;

      const text = event.data.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");

      if (text.includes("Reduced Motion enabled")) return;

      this.#problems.push(`${event.data.type}: ${text}`.slice(0, 240));

      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      const event = exceptionEvent.safeParse(message.params);

      if (event.success)
        this.#problems.push(`exception: ${event.data.exceptionDetails.text}`.slice(0, 240));

      return;
    }

    if (message.method === "Log.entryAdded") {
      const event = logEvent.safeParse(message.params);

      if (!event.success || event.data.entry.level !== "error") return;

      this.#problems.push(
        `log: ${event.data.entry.text} ${event.data.entry.url ?? ""}`.trim().slice(0, 240),
      );
    }
  }

  close(): void {
    this.#socket.close();
  }
}

export class Driver {
  readonly #connection: Connection;

  readonly #closeUrl: string;

  constructor(connection: Connection, closeUrl: string) {
    this.#connection = connection;
    this.#closeUrl = closeUrl;
  }

  static async open(cdp: string, reducedMotion: boolean): Promise<Driver> {
    const created = await fetch(`${cdp}/json/new?about:blank`, { method: "PUT" });

    if (!created.ok)
      throw new Error(`could not open a browser target at ${cdp} (${created.status})`);

    const target = Target.parse(await created.json());
    const connection = await Connection.open(target.webSocketDebuggerUrl);

    await connection.call("Page.enable");
    await connection.call("Runtime.enable");
    await connection.call("Log.enable");
    await connection.call("Network.enable");
    await connection.call("Network.setCacheDisabled", { cacheDisabled: true });

    if (reducedMotion) {
      await connection.call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
    }

    return new Driver(connection, `${cdp}/json/close/${target.id}`);
  }

  problems(): readonly string[] {
    return this.#connection.problems();
  }

  resetProblems(): void {
    this.#connection.clearProblems();
  }

  async evaluate<Schema extends z.ZodType>(
    expression: string,
    value: Schema,
  ): Promise<z.infer<Schema>> {
    const envelope = await this.#connection.query(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
      Evaluated,
    );

    const failure = envelope.exceptionDetails;

    if (failure) {
      throw new Error(
        `page script failed: ${failure.exception?.description ?? failure.text}`.slice(0, 400),
      );
    }

    return value.parse(envelope.result.value);
  }

  async resize(size: Size): Promise<void> {
    await this.#connection.call("Emulation.setDeviceMetricsOverride", {
      width: size.width,
      height: size.height,
      deviceScaleFactor: size.deviceScaleFactor,
      mobile: size.mobile,
    });
  }

  async visit(path: string): Promise<boolean> {
    await this.#connection.call("Page.bringToFront");
    await this.#connection.query("Page.navigate", { url: path }, z.json());

    const hydrated = await this.#hydrated();

    await this.#settle();

    return hydrated;
  }

  async #hydrated(): Promise<boolean> {
    return this.evaluate(
      `new Promise((resolve) => {
        const started = performance.now();
        const attached = () => Array.from(document.querySelectorAll("a, button")).slice(0, 40).some((node) => Object.keys(node).some((key) => key.startsWith("__reactProps")));
        const tick = () => {
          if (attached()) resolve(true);
          else if (performance.now() - started > 20000) resolve(false);
          else setTimeout(tick, 100);
        };
        tick();
      })`,
      Found,
    );
  }

  async openSelect(): Promise<void> {
    await this.click('[aria-haspopup="listbox"]');
    await this.waitFor('[aria-haspopup="listbox"][aria-expanded="true"]');
    await this.waitFor('[role="option"]');
    await new Promise((done) => setTimeout(done, 400));
  }

  async #settle(): Promise<void> {
    await this.evaluate(
      `Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 5000))]).then(() => new Promise((resolve) => {
        let previous = "";
        let stable = 0;
        const started = performance.now();
        const tick = () => {
          const body = document.body;
          const signature = body ? body.innerText.length + ":" + document.documentElement.scrollHeight : "";
          if (signature === previous) stable += 1;
          else { stable = 0; previous = signature; }
          if (stable >= 3 || performance.now() - started > 10000) {
            resolve({ stable, ms: Math.round(performance.now() - started), height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth });
            return;
          }
          setTimeout(tick, 200);
        };
        setTimeout(tick, 200);
      }))`,
      Spend,
    );
  }

  async press(key: string, keyCode: number): Promise<void> {
    await this.#connection.call("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code: key,
      windowsVirtualKeyCode: keyCode,
    });
    await this.#connection.call("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code: key,
      windowsVirtualKeyCode: keyCode,
    });
  }

  async click(selector: string): Promise<void> {
    const clicked = await this.evaluate(
      `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true; })()`,
      Found,
    );

    if (!clicked) throw new Error(`nothing matched ${selector}`);
  }

  async waitFor(selector: string, timeoutMs = 4000): Promise<void> {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const found = await this.evaluate(
        `Boolean(document.querySelector(${JSON.stringify(selector)}))`,
        Found,
      );

      if (found) return;

      await new Promise((done) => setTimeout(done, 100));
    }

    throw new Error(`${selector} never appeared`);
  }

  async probe(): Promise<z.infer<typeof Probe>> {
    return this.evaluate(
      `({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, height: document.documentElement.scrollHeight, text: document.body ? document.body.innerText.length : 0 })`,
      Probe,
    );
  }

  async href(selector: string): Promise<string | null> {
    return this.evaluate(
      `(() => { const node = document.querySelector(${JSON.stringify(selector)}); return node instanceof HTMLAnchorElement ? node.getAttribute("href") : null; })()`,
      Href,
    );
  }

  async capture(full: boolean): Promise<Buffer> {
    const shot = full
      ? await this.#connection.query(
          "Page.captureScreenshot",
          { format: "png", captureBeyondViewport: true, clip: await this.#contentClip() },
          Shot,
        )
      : await this.#connection.query("Page.captureScreenshot", { format: "png" }, Shot);

    return Buffer.from(shot.data, "base64");
  }

  async #contentClip(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  }> {
    const metrics = await this.#connection.query("Page.getLayoutMetrics", {}, Layout);
    const height = Math.min(Math.ceil(metrics.cssContentSize.height), 9000);

    return { x: 0, y: 0, width: Math.ceil(metrics.cssContentSize.width), height, scale: 1 };
  }

  async close(): Promise<void> {
    this.#connection.close();
    await fetch(this.#closeUrl).catch(() => null);
  }
}

export interface Size {
  label: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  mobile: boolean;
}

export const SIZES: readonly Size[] = [
  { label: "1440x900", width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  { label: "390x844", width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
];

export function captureIdentity(base: string) {
  return {
    source: execFileSync("/usr/bin/git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    worktree: execFileSync("/usr/bin/git", ["status", "--short"], { encoding: "utf8" }).trim(),
    capturedAt: new Date().toISOString(),
    base,
  };
}

export async function reachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });

    return response.ok;
  } catch {
    return false;
  }
}
