import { renderInvitePreview } from "@/lib/email";

// Dev-only: renders the invite email so its layout can be reviewed in a browser.
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  return new Response(renderInvitePreview(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
