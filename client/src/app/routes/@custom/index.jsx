import { Route } from 'react-router-dom'
import { LinksPage } from '../../pages/app/@custom/LinksPage'
import { LinkAnalyticsPage } from '../../pages/app/@custom/LinkAnalyticsPage'
import { UTMBuilderPage } from '../../pages/app/@custom/UTMBuilderPage'
import { TeamsPage } from '../../pages/app/@custom/TeamsPage'
import { TeamDetailPage } from '../../pages/app/@custom/TeamDetailPage'
import { CustomDomainsPage } from '../../pages/app/@custom/CustomDomainsPage'
import { AcceptInvitePage } from '../../pages/static/@custom/AcceptInvitePage'
import WebhooksPage from '../../pages/app/@custom/WebhooksPage'
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
  <Route
    key="custom-domains"
    path="/app/domains"
    element={
      <PrivateRoute>
        <CustomDomainsPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="webhooks"
    path="/app/webhooks"
    element={
      <PrivateRoute>
        <WebhooksPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="accept-invite"
    path="/accept-invite"
    element={<AcceptInvitePage />}
  />,
]
