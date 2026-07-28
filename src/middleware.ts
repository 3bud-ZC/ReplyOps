import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    if (token?.forcePasswordChange && req.nextUrl.pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/admin/:path*",
  ]
}
