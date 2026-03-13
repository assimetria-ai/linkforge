// @custom — workspace invitation client API
// Provides workspace-specific invite endpoints (wraps teams)
import { api } from '../@system/api'

export const workspacesApi = {
  /**
   * Invite a member to a workspace via email
   * @param {number} workspaceId - Team/workspace ID
   * @param {object} params - { email, role, name }
   */
  async invite(workspaceId, params) {
    return api.post(`/workspaces/${workspaceId}/invite`, params)
  },

  /**
   * Accept a workspace invitation using JWT token
   * @param {string} token - JWT invite token
   */
  async acceptInvite(token) {
    return api.post('/workspaces/accept-invite', { token })
  },

  /**
   * Update a workspace member's role
   * @param {number} membershipId - team_members record ID
   * @param {string} role - 'owner' | 'admin' | 'member'
   */
  async updateMemberRole(membershipId, role) {
    return api.patch(`/workspace-members/${membershipId}`, { role })
  },

  /**
   * List workspace members
   * @param {number} workspaceId
   */
  async listMembers(workspaceId, params = {}) {
    const qs = new URLSearchParams()
    if (params.limit) qs.set('limit', params.limit)
    if (params.offset) qs.set('offset', params.offset)
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return api.get(`/workspaces/${workspaceId}/members${query}`)
  },

  /**
   * List pending invitations for a workspace
   * @param {number} workspaceId
   */
  async listInvitations(workspaceId) {
    return api.get(`/workspaces/${workspaceId}/invitations`)
  },

  /**
   * Revoke a workspace invitation
   * @param {number} workspaceId
   * @param {number} invitationId
   */
  async revokeInvitation(workspaceId, invitationId) {
    return api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`)
  },
}
