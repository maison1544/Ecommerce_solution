import { projectId } from './supabase/info';

/**
 * Test API connectivity
 * Call this function to verify the Edge Function is accessible
 */
export async function testAPIConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-94a0507e`;
  
  console.log('🔍 Testing API connection...');
  console.log('📍 Base URL:', baseUrl);
  
  try {
    // Test 1: Health check endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    
    if (!healthResponse.ok) {
      return {
        success: false,
        message: `Health check failed with status ${healthResponse.status}`,
        details: {
          status: healthResponse.status,
          statusText: healthResponse.statusText,
          url: `${baseUrl}/api/health`
        }
      };
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
    
    return {
      success: true,
      message: 'API is accessible',
      details: healthData
    };
    
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    return {
      success: false,
      message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        error: error instanceof Error ? error.message : String(error),
        baseUrl
      }
    };
  }
}
