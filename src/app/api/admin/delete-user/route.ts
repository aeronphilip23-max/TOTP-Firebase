import { NextRequest, NextResponse } from 'next/server'
import admin from '@/src/lib/firebase-admin'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(userId)
    
    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(userId).delete()

    return NextResponse.json({ 
      success: true, 
      message: 'User account deleted successfully' 
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    
    // Handle specific errors
    if (error.code === 'auth/user-not-found') {
      // User might not exist in Auth but exists in Firestore, so just delete from Firestore
      try {
        const { userId } = await request.json()
        await admin.firestore().collection('users').doc(userId).delete()
        return NextResponse.json({ 
          success: true, 
          message: 'User deleted from Firestore (user not found in Authentication)' 
        })
      } catch (firestoreError) {
        console.error('Error deleting from Firestore:', firestoreError)
        return NextResponse.json(
          { error: 'Failed to delete user from Firestore' },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to delete user account',
        details: error.message 
      },
      { status: 500 }
    )
  }
}