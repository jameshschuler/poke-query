'use client'

import * as React from 'react'
import { useAuth } from '@authabase/react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  SearchIcon,
  LayoutDashboardIcon,
  BookOpenIcon,
  GitForkIcon,
  HeartIcon,
} from 'lucide-react'
import { ApiRequestError, logout } from '#/lib/poke-query-api'
import { setCachedUser } from '#/lib/route-auth'
import { useMemo, useState } from 'react'

// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: <LayoutDashboardIcon />,
    },
    {
      title: 'Discover',
      url: '/discover',
      icon: <SearchIcon />,
      isActive: true,
    },
    {
      title: 'My Library',
      url: '/library',
      icon: <BookOpenIcon />,
    },
    {
      title: 'Forked',
      url: '/forked',
      icon: <GitForkIcon />,
    },
    {
      title: 'Favorites',
      url: '/favorites',
      icon: <HeartIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const sidebarUser = useMemo(
    () => ({
      name:
        typeof user?.user_metadata?.username === 'string' &&
        user.user_metadata.username.length > 0
          ? user.user_metadata.username
          : (user?.email?.split('@')[0] ?? 'trainer'),
      email: user?.email ?? 'Signed in',
      avatar:
        typeof user?.user_metadata?.avatarUrl === 'string'
          ? user.user_metadata.avatarUrl
          : '',
    }),
    [user],
  )

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      try {
        await logout()
      } catch (error) {
        if (!(error instanceof ApiRequestError && error.status === 401)) {
          // Best effort: still clear the local auth session even if the
          // backend logout endpoint fails.
        }
      }

      setCachedUser(null)
      await signOut()
      void navigate({ to: '/login', replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navMainItems = useMemo(
    () =>
      data.navMain.map((item) => ({
        ...item,
        isActive: pathname === item.url,
      })),
    [pathname],
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={sidebarUser}
          isLoggingOut={isLoggingOut}
          onLogout={handleLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
