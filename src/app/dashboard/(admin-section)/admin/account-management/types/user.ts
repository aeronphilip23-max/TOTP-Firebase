export type UserRole = "admin" | "staff"

export interface UserData {
  id: string
  name: string
  email: string
  role: UserRole
  emailVerified: boolean
  createdAt: string
  status: "active" | "inactive"
  lastLogin?: string | null
}