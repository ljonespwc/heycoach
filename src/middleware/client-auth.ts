import { NextResponse, type NextRequest } from 'next/server'

export function clientAuthMiddleware(request: NextRequest) {
  const clientId = request.cookies.get('client_id')?.value

  // Public client routes that don't require authentication
  // Public routes that don't require authentication
  const publicRoutes = ['/client-portal']
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // If no client ID is found and we're not on a public route, redirect to access page
  if (!clientId) {
    const url = request.nextUrl.clone()
    url.pathname = '/client'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
