export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function errorJson(status: number, error: string) {
  return Response.json({ error }, { status });
}
