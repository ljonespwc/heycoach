export function generateClientPortalUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || 'http://localhost:3001'
  return `${baseUrl}/client-portal?token=${token}`
}
