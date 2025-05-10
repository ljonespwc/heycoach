import { NextResponse, type NextRequest } from 'next/server'

export function clientAuthMiddleware(request: NextRequest) {
  const clientSession = request.cookies.get('client_session')?.value

  // Public client routes that don't require authentication
  const publicRoutes = ['/client-portal']
  const hasTokenParam = request.nextUrl.searchParams.has('token')
  
  // Allow access to public routes or routes with a token parameter
  if (publicRoutes.includes(request.nextUrl.pathname) || hasTokenParam) {
    return NextResponse.next()
  }

  // Check if the client is authenticated via session
  if (!clientSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/client-portal'
    return NextResponse.redirect(url)
  }
  
  try {
    // Verify the session is valid
    const session = JSON.parse(clientSession)
    
    // Check if the session has expired
    if (new Date(session.expires) < new Date() || !session.authenticated) {
      const url = request.nextUrl.clone()
      url.pathname = '/client-portal'
      return NextResponse.redirect(url)
    }
    
    // Valid session, allow access
    return NextResponse.next()
  } catch {
    // Invalid session format, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/client-portal'
    return NextResponse.redirect(url)
  }
}
