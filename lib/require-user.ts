import { auth } from "./auth";

export class UnauthorizedError extends Error {}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new UnauthorizedError("Not authenticated");
  return id;
}
