export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api|login|register|manifest.webmanifest|icons|sw.js|_next/static|_next/image|favicon.ico).*)"],
};
