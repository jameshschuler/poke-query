'use client'

import * as React from 'react'
import { useAuth } from '#/lib/auth-context'
import { useQuery } from '@tanstack/react-query'
import { useUnreadNotificationCount } from '#/hooks/use-unread-notification-count'
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
  ArrowLeftRightIcon,
  SearchIcon,
  LayoutDashboardIcon,
  BookOpenIcon,
  GitForkIcon,
  HeartIcon,
  ShieldAlertIcon,
  UsersIcon,
} from 'lucide-react'
import {
  ApiRequestError,
  getModerationAccess,
  getMe,
  logout,
} from '#/lib/poke-query-api'
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
    },
    {
      title: 'My Library',
      url: '/library',
      icon: <BookOpenIcon />,
    },
    {
      title: 'Forks',
      url: '/forks',
      icon: <GitForkIcon />,
    },
    {
      title: 'Favorites',
      url: '/favorites',
      icon: <HeartIcon />,
    },
    {
      title: 'Following',
      url: '/following',
      icon: <UsersIcon />,
    },
    {
      title: 'Tools',
      url: '/tools',
      icon: <ArrowLeftRightIcon />,
      collapsible: false,
      items: [
        {
          title: 'Dex Converter',
          url: '/dex-converter',
        },
      ],
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

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: false,
  })

  const { data: unreadCountData } = useUnreadNotificationCount()

  const { data: moderationAccess } = useQuery({
    queryKey: ['moderation', 'access'],
    queryFn: getModerationAccess,
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
  })

  const sidebarUser = useMemo(
    () => ({
      name:
        (typeof me?.displayName === 'string' && me.displayName.length > 0
          ? me.displayName
          : null) ??
        (typeof me?.username === 'string' && me.username.length > 0
          ? me.username
          : null) ??
        (typeof user?.user_metadata.username === 'string' &&
        user.user_metadata.username.length > 0
          ? user.user_metadata.username
          : (user?.email?.split('@')[0] ?? 'trainer')),
      email: me?.email ?? user?.email ?? 'Signed in',
      avatar:
        typeof me?.avatarUrl === 'string' && me.avatarUrl.length > 0
          ? me.avatarUrl
          : typeof user?.user_metadata.avatarUrl === 'string'
            ? user.user_metadata.avatarUrl
            : '',
    }),
    [me, user],
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

  const navMainItems = useMemo(() => {
    const baseItems = [...data.navMain]
    const adminItems = [] as {
      title: string
      url: string
      icon?: React.ReactNode
    }[]

    if (me?.role === 'admin') {
      adminItems.push({
        title: 'Discover Performance',
        url: '/admin/discover-performance',
        icon: <SearchIcon />,
      })

      adminItems.push({
        title: 'Weekly Picks',
        url: '/admin/weekly-picks',
      })
    }

    if (moderationAccess?.isReviewer) {
      adminItems.push({
        title: 'Moderation',
        url: '/moderation',
        icon: <ShieldAlertIcon />,
      })
    }

    if (adminItems.length > 0) {
      baseItems.splice(baseItems.length - 1, 0, {
        title: 'Admin',
        url: '/dashboard',
        icon: <ShieldAlertIcon />,
        collapsible: false,
        items: adminItems,
      })
    }

    return baseItems.map((item) => ({
      ...item,
      isActive:
        pathname === item.url ||
        Boolean(item.items?.some((subItem) => subItem.url === pathname)),
    }))
  }, [me?.role, moderationAccess?.isReviewer, pathname])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={sidebarUser}
          isLoggingOut={isLoggingOut}
          showAccountAlert={Boolean(user) && me ? !me.profileCompleted : false}
          unreadCount={unreadCountData?.unreadCount ?? 0}
          onLogout={handleLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
