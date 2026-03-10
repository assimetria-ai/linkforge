// @system — user settings page using the UserSettings component
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../../../components/@system/Dashboard'
import { UserSettings } from '../../../components/@system/UserSettings'
import { useAuthContext } from '../../../store/@system/auth'
import { SettingsPageSkeleton } from '../../../components/@system/Skeleton/Skeleton'
import { api } from '../../../lib/@system/api'

export function SettingsPage() {
  const { user, loading: authLoading, updateUser } = useAuthContext()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get tab from URL query parameter, default to 'profile'
  const activeTab = searchParams.get('tab') ?? 'profile'

  // Handle tab changes by updating URL
  function handleTabChange(tab) {
    setSearchParams({ tab }, { replace: true })
  }

  // Handle user data updates
  async function handleUpdate(updates) {
    try {
      await updateUser(updates)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update',
      }
    }
  }

  return (
    <DashboardLayout>
      <DashboardLayout.Content>
        <DashboardLayout.Header
          title="Settings"
          description="Manage your account preferences and security settings."
        />

        {authLoading ? (
          <SettingsPageSkeleton />
        ) : (
          <div className="max-w-4xl">
            <UserSettings
              user={user}
              onUpdate={handleUpdate}
              defaultTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        )}
      </DashboardLayout.Content>
    </DashboardLayout>
  )
}
