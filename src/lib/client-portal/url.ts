export function generateClientPortalUrl(token: string): string {
  // In production, use the heycoach.health domain
  // In development, fall back to localhost
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://app.heycoach.health' 
      : 'http://localhost:3001')
  
  return `${baseUrl}/client-portal?token=${token}`
}
