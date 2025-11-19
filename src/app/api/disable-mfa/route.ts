import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Initialize Firebase Admin
const apps = getApps()
if (!apps.length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()
    
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 })
    }

    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Get the user
    const user = await getAuth().getUser(uid)
    
    // Check if MFA is enrolled - safer TypeScript approach
    const hasMFA = user.multiFactor?.enrolledFactors && user.multiFactor.enrolledFactors.length > 0
    
    if (hasMFA) {
      // Disable MFA by setting enrolled factors to empty array
      await getAuth().updateUser(uid, {
        multiFactor: {
          enrolledFactors: [],
        },
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'MFA disabled successfully' 
      })
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'No MFA enrolled' 
      })
    }
  } catch (error: any) {
    console.error('Error disabling MFA:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to disable MFA' 
    }, { status: 500 })
  }
}