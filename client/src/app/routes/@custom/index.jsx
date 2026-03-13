import { Route } from 'react-router-dom'
import { LinksPage } from '../../pages/app/@custom/LinksPage'
import { LinkAnalyticsPage } from '../../pages/app/@custom/LinkAnalyticsPage'
import { UTMBuilderPage } from '../../pages/app/@custom/UTMBuilderPage'
import { TeamsPage } from '../../pages/app/@custom/TeamsPage'
import { TeamDetailPage } from '../../pages/app/@custom/TeamDetailPage'
import { PrivateRoute } from '@/app/components/@system/PrivateRoute/PrivateRoute'

// @custom — Linkforge product-specific routes
export const customRoutes = [
  <Route
    key="links"
    path="/app/links"
    element={
      <PrivateRoute>
        <LinksPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="link-analytics"
    path="/app/links/:id"
    element={
      <PrivateRoute>
        <LinkAnalyticsPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="utm-builder"
    path="/app/utm"
    element={
      <PrivateRoute>
        <UTMBuilderPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="teams"
    path="/app/teams"
    element={
      <PrivateRoute>
        <TeamsPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="team-detail"
    path="/app/teams/:id"
    element={
      <PrivateRoute>
        <TeamDetailPage />
      </PrivateRoute>
    }
  />,
]
