export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getDb } = await import("./server/db");
  const { getAuth } = await import("./server/auth");
  const { bootstrapSchema } = await import("./server/schema");
  await bootstrapSchema(getDb(), getAuth());
}
