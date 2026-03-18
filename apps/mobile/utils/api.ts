import { env } from "./env";

export function getApiUrl(): string {
  const trpcUrl = env.EXPO_PUBLIC_TRPC_URL || "http://localhost:3001/trpc";
  return trpcUrl.replace(/\/trpc$/, "");
}
