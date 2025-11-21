
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }


    if (typeof idToken === 'string' && idToken.length > 10) {

      
      return NextResponse.json({
        user: {
          uid: 'temp-user-id', 
          email: 'user@example.com', 
          role: 'user' 
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}