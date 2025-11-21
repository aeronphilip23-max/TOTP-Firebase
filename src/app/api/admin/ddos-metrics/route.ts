import { NextRequest, NextResponse } from 'next/server';
import { getDDoSMetrics } from '@/src/lib/services/ratelimitservice';

export async function GET(request: NextRequest) {
  try {
    // Only allow admin access
    const token = request.cookies.get('idToken')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const metrics = getDDoSMetrics();
    
    return NextResponse.json({
      metrics: {
        requestCount: metrics.requestCount,
        uniqueIPs: Array.from(metrics.uniqueIPs),
        blockedIPs: Array.from(metrics.blockedIPs),
        startTime: metrics.startTime,
        duration: Date.now() - metrics.startTime,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting DDoS metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}