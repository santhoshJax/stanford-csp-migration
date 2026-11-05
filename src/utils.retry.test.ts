import { isTransientHttpError, withTransientRetry } from "./utils";

/** A network error with no HTTP response, as axios raises for "socket hang up". */
const hangUp = (): Error =>
  Object.assign(new Error("socket hang up"), { code: "ECONNRESET" });

/** An axios-style error carrying an HTTP status. */
const httpError = (status: number): Error =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe("isTransientHttpError", () => {
  it("treats a dropped connection (no response) as transient", () => {
    expect(isTransientHttpError(hangUp())).toBe(true);
  });
  it("treats 429 and 5xx as transient", () => {
    expect(isTransientHttpError(httpError(429))).toBe(true);
    expect(isTransientHttpError(httpError(503))).toBe(true);
  });
  it("does not retry 4xx errors such as 401 or 404", () => {
    expect(isTransientHttpError(httpError(401))).toBe(false);
    expect(isTransientHttpError(httpError(404))).toBe(false);
  });
});

describe("withTransientRetry", () => {
  it("succeeds after a socket hang up on the first attempt", async () => {
    let calls = 0;
    const retries: number[] = [];
    const result = await withTransientRetry(
      () => {
        calls++;
        return calls === 1 ? Promise.reject(hangUp()) : Promise.resolve("ok");
      },
      { baseDelayMs: 1, onRetry: (attempt) => retries.push(attempt) },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(2);
    expect(retries).toEqual([1]);
  });
  it("gives up after the attempt limit", async () => {
    let calls = 0;
    await expect(
      withTransientRetry(
        () => {
          calls++;
          return Promise.reject(hangUp());
        },
        { attempts: 3, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("socket hang up");
    expect(calls).toBe(3);
  });
  it("does not retry a non-transient error", async () => {
    let calls = 0;
    await expect(
      withTransientRetry(
        () => {
          calls++;
          return Promise.reject(httpError(401));
        },
        { baseDelayMs: 1 },
      ),
    ).rejects.toThrow("HTTP 401");
    expect(calls).toBe(1);
  });
  it("stops retrying when the next wait would pass the deadline", async () => {
    let calls = 0;
    await expect(
      withTransientRetry(
        () => {
          calls++;
          return Promise.reject(hangUp());
        },
        { baseDelayMs: 60_000, deadlineMs: Date.now() + 1_000 },
      ),
    ).rejects.toThrow("socket hang up");
    expect(calls).toBe(1);
  });
});
