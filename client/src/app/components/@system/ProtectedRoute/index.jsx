import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/store/@system/auth'
import Layout from '@/app/components/@system/Layout'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
