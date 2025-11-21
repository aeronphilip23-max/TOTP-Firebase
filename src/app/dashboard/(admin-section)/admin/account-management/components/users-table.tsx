"use client"

import { MoreVertical, Mail, MailCheck, Trash2, Loader2, Crown, Users, AlertTriangle } from "lucide-react"
import { UserData, UserRole } from "../types/user"
import { useState } from "react"

interface UsersTableProps {
  users: UserData[]
  onRoleChange: (userId: string, newRole: UserRole) => void
  onUserAction: (action: string, userId: string) => void
  actionLoading: string | null
  roles: Array<{ value: UserRole; label: string; icon: any }>
}

export default function UsersTable({ 
  users, 
  onRoleChange, 
  onUserAction, 
  actionLoading,
  roles 
}: UsersTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)

  const getRoleIcon = (role: UserRole) => {
    const roleConfig = roles.find(r => r.value === role)
    return roleConfig?.icon || Users
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeleteClick = (user: UserData) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
    setActiveDropdown(null)
  }

  const confirmDelete = async () => {
    if (userToDelete) {
      await onUserAction("delete", userToDelete.id)
      setDeleteModalOpen(false)
      setUserToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteModalOpen(false)
    setUserToDelete(null)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[oklch(0.96_0_0)]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">User</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Created</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[oklch(0.88_0_0)]">
            {users.map((user) => {
              const RoleIcon = getRoleIcon(user.role)
              const isActionLoading = actionLoading === user.id
              
              return (
                <tr key={user.id} className="hover:bg-[oklch(0.98_0_0)]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-[oklch(0.18_0.08_250)]">
                        {user.name}
                      </p>
                      <p className="text-sm text-[oklch(0.45_0_0)] flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                        {user.emailVerified && (
                          <span className="flex items-center gap-1" title="Email verified">
                            <MailCheck className="h-3 w-3 text-green-500" />
                          </span>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
                      disabled={isActionLoading}
                      className="flex items-center gap-2 px-3 py-1 text-sm border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] disabled:opacity-50"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                        className="p-1 hover:bg-[oklch(0.96_0_0)] rounded-lg transition-colors"
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[oklch(0.68_0.19_35)]" />
                        ) : (
                          <MoreVertical className="h-4 w-4 text-[oklch(0.45_0_0)]" />
                        )}
                      </button>

                      {activeDropdown === user.id && (
                        <div className="absolute right-0 top-8 bg-white border border-[oklch(0.88_0_0)] rounded-lg shadow-lg z-10 min-w-32">
                          {!user.emailVerified && (
                            <button
                              onClick={() => {
                                onUserAction("resend-verification", user.id)
                                setActiveDropdown(null)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Mail className="h-4 w-4" />
                              Resend Verification
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-[oklch(0.88_0_0)] mx-auto mb-4" />
            <p className="text-[oklch(0.45_0_0)]">No users found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[oklch(0.18_0.08_250)]">
                  Delete User Account
                </h3>
                <p className="text-sm text-[oklch(0.45_0_0)]">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                Are you sure you want to delete <strong>{userToDelete.name}</strong> ({userToDelete.email})? 
                This will permanently remove their account and all associated data from both Authentication and Firestore.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                disabled={actionLoading === userToDelete.id}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading === userToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading === userToDelete.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {actionLoading === userToDelete.id ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}