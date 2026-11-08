// Browser-side API client. Requests go to same-origin /api (proxied to FastAPI).

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function messageFrom(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const d = detail[0] as { msg?: string; loc?: (string | number)[] };
    const field = d.loc?.filter((p) => p !== "body").join(".");
    return `${field ? field + ": " : ""}${(d.msg || "Invalid input").replace(/^Value error, /, "")}`;
  }
  return status >= 500 ? "Something went wrong. Please try again." : "Request failed";
}

export async function api<T = unknown>(
  path: string,
  init: { method?: string; json?: unknown; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = { "X-Requested-With": "hcpp" };
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  } else if (init.form) {
    body = init.form;
  }
  const res = await fetch(`/api${path}`, {
    method: init.method || (body ? "POST" : "GET"),
    headers,
    body,
    credentials: "same-origin",
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
      window.location.href = "/login";
    }
    throw new ApiError(res.status, messageFrom(data, res.status));
  }
  return data as T;
}
