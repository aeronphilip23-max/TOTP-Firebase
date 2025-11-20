"use client"

import { useState, useEffect } from "react"
import { UserPlus, Search, Filter, Crown, Users, Loader2 } from "lucide-react"
import { useAuth } from "@/src/context/authcontext"
import { db } from "@/src/lib/firebase"
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot,
  query,
  where 
} from "firebase/firestore"
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import CreateUserModal from "./components/create-user-modal"
import UsersTable from "./components/users-table"
import { UserData, UserRole } from "./types/user"

export default function AccountManagementPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const roles = [
    { value: "admin" as UserRole, label: "Admin", icon: Crown, description: "Full system access" },
    { value: "user" as UserRole, label: "Staff", icon: Users, description: "Staff access" },
  ]

  useEffect(() => {
    fetchUsers()
    
    // Set up real-time listener for user updates
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: UserData[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        usersData.push({
          id: doc.id,
          name: data.name || "",
          email: data.email || "",
          role: data.role || "staff",
          emailVerified: data.emailVerified || false,
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || "active",
          lastLogin: data.lastLogin || null,
        })
      })
      setUsers(usersData)
    })

    return () => unsubscribe()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData: UserData[] = []
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        usersData.push({
          id: doc.id,
          name: data.name || "",
          email: data.email || "",
          role: data.role || "staff",
          emailVerified: data.emailVerified || false,
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || "active",
          lastLogin: data.lastLogin || null,
        })
      })
      
      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === "all" || user.role === selectedRole
    return matchesSearch && matchesRole
  })

const handleCreateUser = async (userData: {
  name: string
  email: string
  password: string
  role: UserRole
  sendCredentials: boolean
  requireEmailVerification: boolean
}) => {
  try {
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        requireEmailVerification: userData.requireEmailVerification,
      }),
    });

    const result = await response.json();

    console.log('API Response:', { status: response.status, result });

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user');
    }

    // Refresh users list
    await fetchUsers();

    toast({
      title: "Success",
      description: result.message || `User ${userData.name} created successfully!`,
    });

    return true;
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    toast({
      title: "Error",
      description: error.message || "Failed to create user",
      variant: "destructive",
    });
    return false;
  }
}

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId)
    try {
      // Update the user document directly using the document ID
      const userDocRef = doc(db, 'users', userId)
      await updateDoc(userDocRef, { role: newRole })

      toast({
        title: "Success",
        description: "User role updated successfully",
      })
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleUserAction = async (action: string, userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    setActionLoading(userId)

    try {
      const userDocRef = doc(db, 'users', userId)

      switch (action) {
        case "disable":
          await updateDoc(userDocRef, { status: "inactive" })
          toast({
            title: "Success",
            description: `${user.name} has been disabled`,
          })
          break

        case "enable":
          await updateDoc(userDocRef, { status: "active" })
          toast({
            title: "Success",
            description: `${user.name} has been enabled`,
          })
          break

        case "delete":
          await deleteDoc(userDocRef)
          toast({
            title: "Success",
            description: `${user.name} has been deleted`,
          })
          break

        case "resend-verification":
          const { auth } = await import('@/src/lib/firebase')
          toast({
            title: "Info",
            description: "Please use Firebase Console to resend verification emails, or implement a Cloud Function for this feature.",
          })
          break
      }
    } catch (error) {
      console.error('Action error:', error)
      toast({
        title: "Error",
        description: "Failed to perform action",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[oklch(0.68_0.19_35)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Account Management</h1>
          <p className="text-sm text-[oklch(0.45_0_0)] mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[oklch(0.45_0_0)]" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[oklch(0.45_0_0)]" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | "all")}
              className="px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-[oklch(0.88_0_0)] overflow-hidden">
        <UsersTable
          users={filteredUsers}
          onRoleChange={handleRoleChange}
          onUserAction={handleUserAction}
          actionLoading={actionLoading}
          roles={roles}
        />
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreateUser={handleCreateUser}
          roles={roles}
        />
      )}
    </div>
  )
}