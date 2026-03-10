// @system — Component exports
// Central export file for all reusable system components

// Layout & Navigation
export { DashboardLayout } from './Dashboard/DashboardLayout'
export { PageLayout } from './layout/PageLayout'
export { Sidebar, SidebarLogo, SidebarSection, SidebarItem } from './Sidebar/Sidebar'
export { Breadcrumbs, BreadcrumbItem, BreadcrumbsFromPath } from './Breadcrumbs/Breadcrumbs'

// UI Components
export { Button } from './ui/button'
export { Switch } from './ui/switch'
export { Badge } from './ui/badge'
export { Card } from './Card/Card'
export { Alert } from './Alert/Alert'
export { Modal, ConfirmModal } from './Modal/Modal'
export { Avatar, AvatarGroup } from './Avatar/Avatar'
export {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  DropdownSubmenu,
} from './Dropdown/Dropdown'

// Form Components
export { Input } from './Form/Form'
export { Textarea } from './Textarea/Textarea'
export { FileUpload } from './FileUpload/FileUpload'

// Feedback & Status
export { Spinner } from './Loading/Spinner'
export { Skeleton } from './Skeleton/Skeleton'
export { EmptyState } from './EmptyState/EmptyState'
export { Toast, Toaster } from './Toast/Toaster'
export { ProgressBar, CircularProgress } from './ProgressBar/ProgressBar'

// Navigation
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs/Tabs'
export { Pagination, SimplePagination } from './Pagination/Pagination'
export { CommandPalette, useCommandPalette } from './CommandPalette/CommandPalette'

// Dashboard Components
export { StatCard } from './Dashboard/StatCard'
export { WelcomeCard } from './Dashboard/WelcomeCard'
export { QuickActions } from './Dashboard/QuickActions'
export { RecentActivityList } from './Dashboard/RecentActivityList'
export { DataTable } from './Dashboard/DataTable'
export { MobileTable } from './Dashboard/MobileTable'
export { FiltersBar } from './Dashboard/FiltersBar'
export { BulkActions } from './Dashboard/BulkActions'
export { MetricCard, MetricGroup, CompactMetric } from './MetricCard/MetricCard'

// User Settings
export {
  UserSettings,
  SettingsSection,
  SettingsRow,
} from './UserSettings/UserSettings'
export { ProfileSettings } from './UserSettings/ProfileSettings'
export { SecuritySettings } from './UserSettings/SecuritySettings'
export { NotificationSettings } from './UserSettings/NotificationSettings'
export { PreferencesSettings } from './UserSettings/PreferencesSettings'

// Onboarding
export { OnboardingWizard } from './Onboarding/OnboardingWizard'
export { GuidedTour } from './Onboarding/GuidedTour'
export { ProgressChecklist } from './Onboarding/ProgressChecklist'

// Auth & Security
export { ProtectedRoute } from './ProtectedRoute/ProtectedRoute'
export { TwoFactorSetup } from './TwoFactor/TwoFactorSetup'
export { OAuthButtons } from './OAuthButtons/OAuthButtons'

// Marketing Components
export { FeaturesSection } from './FeaturesSection/FeaturesSection'
export { TestimonialsSection } from './TestimonialsSection/TestimonialsSection'
export { Footer } from './Footer/Footer'
export { AnnouncementBanner } from './AnnouncementBanner/AnnouncementBanner'

// Tables
export { Table } from './Table/Table'
export { ResponsiveTable } from './Table/ResponsiveTable'

// Misc
export { NotificationCenter } from './NotificationCenter/NotificationCenter'
export { BottomSheet } from './BottomSheet/BottomSheet'
