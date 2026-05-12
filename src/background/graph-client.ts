export async function graphGet<T>(
  path: string,
  token: string,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com${path}`, {
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new GraphAuthError(res.status)
    throw new GraphError(res.status, path)
  }
  return res.json() as Promise<T>
}

export async function graphPost<T>(
  path: string,
  token: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com${path}`, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new GraphAuthError(res.status)
    throw new GraphError(res.status, path)
  }
  return res.json() as Promise<T>
}

export class GraphAuthError extends Error {
  constructor(public status: number) {
    super(`Graph auth error (${status}) — session may have expired`)
    this.name = 'GraphAuthError'
  }
}

export class GraphError extends Error {
  constructor(
    public status: number,
    public path: string
  ) {
    super(`Graph ${status} for ${path}`)
    this.name = 'GraphError'
  }
}
