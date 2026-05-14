'use client'

import * as React from 'react'
import { useAuth } from '@authabase/react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  GalleryVerticalEndIcon,
  AudioLinesIcon,
  TerminalIcon,
  TerminalSquareIcon,
  BotIcon,
  BookOpenIcon,
  Settings2Icon,
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
  teams: [
    {
      name: 'PokeQuery',
      logo: <GalleryVerticalEndIcon />,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: <AudioLinesIcon />,
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: <TerminalIcon />,
      plan: 'Free',
    },
  ],
  navMain: [
    {
      title: 'Discover',
      url: '/discover',
      icon: <TerminalSquareIcon />,
      isActive: true,
      // items: [
      //   {
      //     title: 'History',
      //     url: '#',
      //   },
      //   {
      //     title: 'Starred',
      //     url: '#',
      //   },
      //   {
      //     title: 'Settings',
      //     url: '#',
      //   },
      // ],
    },
    {
      title: 'My Library',
      url: '/library',
      icon: <BotIcon />,
      // items: [
      //   {
      //     title: 'Genesis',
      //     url: '#',
      //   },
      //   {
      //     title: 'Explorer',
      //     url: '#',
      //   },
      //   {
      //     title: 'Quantum',
      //     url: '#',
      //   },
      // ],
    },
    {
      title: 'Forked',
      url: '/forked',
      icon: <BookOpenIcon />,
      // items: [
      //   {
      //     title: 'Introduction',
      //     url: '#',
      //   },
      //   {
      //     title: 'Get Started',
      //     url: '#',
      //   },
      //   {
      //     title: 'Tutorials',
      //     url: '#',
      //   },
      //   {
      //     title: 'Changelog',
      //     url: '#',
      //   },
      // ],
    },
    {
      title: 'Favorites',
      url: '/favorites',
      icon: <Settings2Icon />,
      // items: [
      //   {
      //     title: 'General',
      //     url: '#',
      //   },
      //   {
      //     title: 'Team',
      //     url: '#',
      //   },
      //   {
      //     title: 'Billing',
      //     url: '#',
      //   },
      //   {
      //     title: 'Limits',
      //     url: '#',
      //   },
      // ],
    },
  ],
  // projects: [
  //   {
  //     name: 'Design Engineering',
  //     url: '#',
  //     icon: <FrameIcon />,
  //   },
  //   {
  //     name: 'Sales & Marketing',
  //     url: '#',
  //     icon: <PieChartIcon />,
  //   },
  //   {
  //     name: 'Travel',
  //     url: '#',
  //     icon: <MapIcon />,
  //   },
  // ],
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
          throw error
        }
      }

      await signOut()
      setCachedUser(null)
      void navigate({ to: '/', replace: true })
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
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        {/* <NavProjects projects={data.projects} /> */}
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
