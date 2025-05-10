'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  UserCircleIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
  { name: 'Clients', href: '/clients', icon: UsersIcon },
]

export function SidebarNav() {
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              flex items-center px-4 py-2 text-sm font-medium rounded-lg
              ${isActive 
                ? 'text-primary bg-primary/10'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <item.icon className={`
              mr-3 h-5 w-5
              ${isActive ? 'text-primary' : 'text-gray-400'}
            `} />
            {item.name}
          </Link>
        )
      })}

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg mt-4"
      >
        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
        Sign Out
      </button>
    </nav>
  )
}
