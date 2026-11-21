export default async function hello(): Promise<Response> {
  return Response.json({ service: "boundless-boston-navigator", status: "ok" });
}
