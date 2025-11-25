import { NextRequest, NextResponse } from 'next/server';
import admin from '@/src/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { auth } from '@/src/lib/firebase'; 
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, requireEmailVerification = true } = await request.json();

    console.log('Create User API called');
    console.log('Request data:', { name, email, role, requireEmailVerification });

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let userRecord;
    let firebaseUser;

    // Use Client SDK (same as your register page) 
    try {
      console.log('Creating user with Client SDK...');
      
      // Create user using Client SDK (this will trigger email sending)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;
      
      // Update profile
      await updateProfile(firebaseUser, {
        displayName: name,
      });

      console.log('User created with Client SDK:', firebaseUser.uid);
      
      // Send email verification using Client SDK with continue URL
      if (requireEmailVerification) {
        console.log('Sending verification email with Client SDK...');
        
        const actionCodeSettings = {
          url: `${process.env.NEXTAUTH_URL || 'https://logitrack-wine.vercel.app/'}/landingpage`, // Your verification success page
          handleCodeInApp: true
        };

        await sendEmailVerification(firebaseUser, actionCodeSettings);
        console.log('✅ Verification email sent via Client SDK');
      }

      userRecord = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: name,
        emailVerified: firebaseUser.emailVerified,
      };

    } catch (clientError: any) {
      console.log('Client SDK failed, trying Admin SDK...', clientError);
      
      // Fallback to Admin SDK if Client SDK fails
      userRecord = await getAuth().createUser({
        email,
        password,
        displayName: name,
        emailVerified: !requireEmailVerification,
      });
      
      console.log('User created with Admin SDK:', userRecord.uid);

      // If using Admin SDK and verification is required, generate verification link
      if (requireEmailVerification) {
        const actionCodeSettings = {
          url: `${process.env.NEXTAUTH_URL || 'https://logitrack-wine.vercel.app/'}/landingpage`,
          handleCodeInApp: true
        };

        const verificationLink = await getAuth().generateEmailVerificationLink(
          email, 
          actionCodeSettings
        );
        // Admin 
        console.log('Verification link (send via your email service):', verificationLink);
      }
    }

    // Create/update user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      role: role || 'user',
      createdAt: new Date().toISOString(),
      emailVerified: userRecord.emailVerified || !requireEmailVerification,
      updatedAt: new Date().toISOString(),
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userData, { merge: true });
    console.log('Firestore document created/updated');

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        role: role || 'staff',
        emailVerified: userRecord.emailVerified,
      },
      verificationSent: requireEmailVerification,
    });

  } catch (error: any) {
    console.error('Error creating user:', error);

    if (error.code === 'auth/email-already-exists' || error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}