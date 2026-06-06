import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If authenticated, allow access
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        // Return true if the user has a valid token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protect these routes — anyone not authenticated is redirected to /login
export const config = {
  matcher: ["/dashboard/:path*", "/map/:path*", "/profile/:path*"],
};
