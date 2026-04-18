import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";

export default withMiddlewareAuthRequired();

export const config = {
  matcher: ["/dashboard/:path*", "/achievements/:path*", "/profile/:path*", "/history/:path*"],
};
