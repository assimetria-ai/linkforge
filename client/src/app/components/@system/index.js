// @system — Component exports
// Central export file for all reusable system components

// Layout & Navigation
export { DashboardLayout } from './Dashboard/DashboardLayout.jsx'
export { PageLayout } from './layout/PageLayout.jsx'
export { Sidebar, SidebarLogo, SidebarSection, SidebarItem } from './Sidebar/Sidebar.jsx'
export { Breadcrumbs, BreadcrumbItem, BreadcrumbsFromPath } from './Breadcrumbs/Breadcrumbs.jsx'

// UI Components
export { Button } from './ui/button.jsx'
export { Switch } from './ui/switch.jsx'
export { Badge } from './ui/badge.jsx'
export { Card } from './Card/Card.jsx'
export { Alert } from './Alert/Alert.jsx'
export { Modal, ConfirmModal } from './Modal/Modal.jsx'
export { Avatar, AvatarGroup } from './Avatar/Avatar.jsx'
export {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  DropdownSubmenu,
} from './Dropdown/Dropdown.jsx'

// Form Components
export { Input } from './Form/Form.jsx'
export { Textarea } from './Textarea/Textarea.jsx'
export { FileUpload } from './FileUpload/FileUpload.jsx'

// Feedback & Status
export { Spinner } from './Loading/Spinner.jsx'
export { Skeleton } from './Skeleton/Skeleton.jsx'
export { EmptyState } from './EmptyState/EmptyState.jsx'
export { Toast, Toaster } from './Toast/Toaster.jsx'
export { ProgressBar, CircularProgress } from './ProgressBar/ProgressBar.jsx'

// Navigation
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs/Tabs.jsx'
export { Pagination, SimplePagination } from './Pagination/Pagination.jsx'
export { CommandPalette, useCommandPalette } from './CommandPalette/CommandPalette.jsx'

// Dashboard Components
export { StatCard } from './Dashboard/StatCard.jsx'
export { WelcomeCard } from './Dashboard/WelcomeCard.jsx'
export { QuickActions } from './Dashboard/QuickActions.jsx'
export { RecentActivityList } from './Dashboard/RecentActivityList.jsx'
export { DataTable } from './Dashboard/DataTable.jsx'
export { MobileTable } from './Dashboard/MobileTable.jsx'
export { FiltersBar } from './Dashboard/FiltersBar.jsx'
export { BulkActions } from './Dashboard/BulkActions.jsx'
export { MetricCard, MetricGroup, CompactMetric } from './MetricCard/MetricCard.jsx'

// User Settings
export {
  UserSettings,
  SettingsSection,
  SettingsRow,
} from './UserSettings/UserSettings.jsx'
export { ProfileSettings } from './UserSettings/ProfileSettings.jsx'
export { SecuritySettings } from './UserSettings/SecuritySettings.jsx'
export { NotificationSettings } from './UserSettings/NotificationSettings.jsx'
export { PreferencesSettings } from './UserSettings/PreferencesSettings.jsx'

// Onboarding
export { OnboardingWizard } from './Onboarding/OnboardingWizard.jsx'
export { GuidedTour } from './Onboarding/GuidedTour.jsx'
export { ProgressChecklist } from './Onboarding/ProgressChecklist.jsx'

// Auth & Security
export { ProtectedRoute } from './ProtectedRoute/ProtectedRoute.jsx'
export { TwoFactorSetup } from './TwoFactor/TwoFactorSetup.jsx'
export { OAuthButtons } from './OAuthButtons/OAuthButtons.jsx'

// Marketing Components
export { FeaturesSection } from './FeaturesSection/FeaturesSection.jsx'
export { TestimonialsSection } from './TestimonialsSection/TestimonialsSection.jsx'
export { Footer } from './Footer/Footer.jsx'
export { AnnouncementBanner } from './AnnouncementBanner/AnnouncementBanner.jsx'

// Tables
export { Table } from './Table/Table.jsx'
export { ResponsiveTable } from './Table/ResponsiveTable.jsx'

// Misc
export { NotificationCenter } from './NotificationCenter/NotificationCenter.jsx'
export { BottomSheet } from './BottomSheet/BottomSheet.jsx'
