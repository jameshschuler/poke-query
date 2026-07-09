import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  ChevronsUpDownIcon,
  CircleAlertIcon,
  BadgeCheckIcon,
  BellIcon,
  LogOutIcon,
  UsersIcon,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

interface NavUserProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  onLogout?: () => void | Promise<void>
  isLoggingOut?: boolean
  showAccountAlert?: boolean
  unreadCount?: number
}

export function NavUser({
  user,
  onLogout,
  isLoggingOut = false,
  showAccountAlert = false,
  unreadCount = 0,
}: NavUserProps) {
  const navigate = useNavigate()
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {unreadCount > 0 ? (
                <span
                  className="size-2 rounded-full bg-destructive"
                  aria-label="You have unread notifications"
                  title="Unread notifications"
                />
              ) : null}
              <ChevronsUpDownIcon className="size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  void navigate({ to: '/account' })
                }}
              >
                <BadgeCheckIcon />
                <span>Account</span>
                {showAccountAlert ? (
                  <CircleAlertIcon className="ml-auto size-4 text-amber-500" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void navigate({ to: '/notifications' })
                }}
              >
                <BellIcon />
                Notifications
                {unreadCount > 0 ? (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void navigate({ to: '/following' })
                }}
              >
                <UsersIcon />
                Following
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isLoggingOut}
              onClick={() => {
                void onLogout?.()
              }}
            >
              <LogOutIcon />
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
