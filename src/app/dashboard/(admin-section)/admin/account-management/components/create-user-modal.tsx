"use client"

import { useState } from "react"
import { X, Eye, EyeOff, Loader2, Check, X as XIcon } from "lucide-react"
import { UserRole } from "../types/user"

interface CreateUserModalProps {
  onClose: () => void
  onCreateUser: (userData: {
    name: string
    email: string
    password: string
    role: UserRole
    sendCredentials: boolean
    requireEmailVerification: boolean
  }) => Promise<boolean>
  roles: Array<{ value: UserRole; label: string; icon: any; description: string }>
}

export default function CreateUserModal({ onClose, onCreateUser, roles }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user" as UserRole,
    sendCredentials: false,
    requireEmailVerification: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  // Password validation checks
  const passwordChecks = {
    hasMinLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*]/.test(formData.password),
  }

  const isPasswordValid = Object.values(passwordChecks).every(Boolean)
  const doPasswordsMatch = formData.password === formData.confirmPassword
  const canSubmit = formData.name && formData.email && formData.password && isPasswordValid && doPasswordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isPasswordValid || !doPasswordsMatch) {
      return
    }

    setLoading(true)

    try {
      const userData = {
        ...formData,
        // Remove confirmPassword from the final data
        confirmPassword: undefined,
      }

      const success = await onCreateUser(userData)
      if (success) {
        onClose()
      }
    } catch (error) {
      console.error('Error creating user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePassword = () => {
    const newPassword = generatePassword()
    setFormData(prev => ({ 
      ...prev, 
      password: newPassword,
      confirmPassword: newPassword 
    }))
  }

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <XIcon className="h-4 w-4 text-red-500" />
      )}
      <span className={`text-sm ${met ? 'text-green-600' : 'text-red-600'}`}>
        {text}
      </span>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Create New User</h2>
          <button
            onClick={onClose}
            className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
              Last Name, First Name, M.I.
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Doe, John A."
              className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter a strong password"
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-[oklch(0.45_0_0)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Confirm Password
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm your password"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    formData.confirmPassword && !doPasswordsMatch
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[oklch(0.88_0_0)] focus:ring-[oklch(0.68_0.19_35)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-[oklch(0.45_0_0)]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {formData.confirmPassword && !doPasswordsMatch && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <XIcon className="h-4 w-4" />
                  Passwords do not match
                </p>
              )}

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-sm text-[oklch(0.68_0.19_35)] hover:underline"
              >
                Generate secure password
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-medium text-amber-800 mb-2">Password Requirements:</h4>
              <div className="space-y-1">
                <PasswordRequirement 
                  met={passwordChecks.hasMinLength} 
                  text="At least 8 characters long" 
                />
                <PasswordRequirement 
                  met={passwordChecks.hasUpperCase} 
                  text="At least one uppercase letter (A-Z)" 
                />
                <PasswordRequirement 
                  met={passwordChecks.hasLowerCase} 
                  text="At least one lowercase letter (a-z)" 
                />
                <PasswordRequirement 
                  met={passwordChecks.hasNumber} 
                  text="At least one number (0-9)" 
                />
                <PasswordRequirement 
                  met={passwordChecks.hasSpecialChar} 
                  text="At least one special character (!@#$%^&*)" 
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Email verification is required. The account needs to be verified before the user can login.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}