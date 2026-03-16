// @system — top nav header with auth-aware user menu + mobile hamburger
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings, Shield, Menu, X, ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Button } from '../ui/button'
import { useAuthContext } from '@/app/store/@system/auth'
import { api } from '@/app/lib/@system/api'
import { info } from '@/config'
import { cn } from '@/app/lib/@system/utils'

export function Header({ className = '' }) {
  const { user, isAuthenticated, logout, refreshOnboardingStatus } = useAuthContext()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [brands, setBrands] = useState([])
  const activeBrand = brands.find((brand) => brand.is_active) || brands[0] || null

  useEffect(() => {
    if (!isAuthenticated) {
      setBrands([])
      return
    }

    api.get('/brands')
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(() => setBrands([]))
  }, [isAuthenticated])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  async function switchBrand(brandId) {
    try {
      await api.post(`/brands/${brandId}/switch`, {})
      setBrands((prev) => prev.map((brand) => ({ ...brand, is_active: brand.id === brandId })))
      await refreshOnboardingStatus()
      navigate('/app')
    } catch {
      // no-op UI fallback
    }
  }

  return (
    <header className={cn('border-b border-border bg-background', className)}>
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="font-semibold text-foreground hover:opacity-80 transition-opacity">
          {info.name}
        </Link>

        <nav className="hidden sm:flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              {activeBrand && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeBrand.primary_color || '#2563eb' }} />
                      <span className="max-w-[140px] truncate">{activeBrand.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className="z-50 min-w-[220px] rounded-md border bg-popover p-1 shadow-md"
                    >
                      {brands.map((brand) => (
                        <DropdownMenu.Item
                          key={brand.id}
                          onSelect={() => switchBrand(brand.id)}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent"
                        >
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brand.primary_color || '#2563eb' }} />
                          <span className="flex-1 truncate">{brand.name}</span>
                          {brand.is_active && <span className="text-xs text-muted-foreground">Active</span>}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}

              <Link to="/app">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {(user.name ?? user.email).charAt(0).toUpperCase()}
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-50 min-w-[180px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
                  >
                    <div className="px-3 py-2 text-sm">
                      <p className="font-medium truncate">{user.name ?? 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenu.Separator className="h-px bg-border my-1" />

                    <DropdownMenu.Item
                      onSelect={() => navigate('/app/settings')}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </DropdownMenu.Item>

                    {user.role === 'admin' && (
                      <DropdownMenu.Item
                        onSelect={() => navigate('/app/admin')}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                      >
                        <Shield className="h-4 w-4" />
                        Admin
                      </DropdownMenu.Item>
                    )}

                    <DropdownMenu.Separator className="h-px bg-border my-1" />

                    <DropdownMenu.Item
                      onSelect={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 outline-none"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </nav>

        <button
          className="sm:hidden flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
          {isAuthenticated && user ? (
            <>
              <div className="px-1 pb-2 border-b border-border">
                <p className="font-medium text-sm">{user.name ?? 'User'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              {activeBrand && <p className="text-xs text-muted-foreground">Brand: {activeBrand.name}</p>}
              <Link to="/app" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Dashboard
                </Button>
              </Link>
              <Link to="/app/settings" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              {user.role === 'admin' && (
                <Link to="/app/admin" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
