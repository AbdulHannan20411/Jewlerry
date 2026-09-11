/**
 * Next.js server-startup hook (runs once before any request is handled).
 *
 * supabase-js v2's SupabaseClient constructor unconditionally initializes a
 * RealtimeClient internally, which requires a global `WebSocket`
 * constructor to exist — even though this app deliberately never uses
 * Supabase Realtime (spec explicitly rules out WebSockets for
 * notifications; polling/refetch is used instead). Native `WebSocket` was
 * only added as a Node.js global in v22; on Node 20 every server-side
 * Supabase client call throws "native WebSocket not found" without this
 * polyfill.
 *
 * Safe to delete once this project's minimum Node version is 22+.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !globalThis.WebSocket) {
    const { default: WebSocket } = await import("ws");
    // @ts-expect-error -- `ws`'s WebSocket is API-compatible for
    // supabase-js's purposes but not identical to the DOM/undici type.
    globalThis.WebSocket = WebSocket;
  }
}
