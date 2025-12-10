// netlify/functions/create-group.js
// ⚡ ENHANCED VERSION - SUPER FAST API PROXY FOR 5-PLAYER GROUP CREATION

exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  console.log('📥 Received 5-player group request:', {
    httpMethod: event.httpMethod,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers
  });
  
  // ✅ Quick method check
  if (event.httpMethod !== 'GET') {
    console.log('❌ Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const params = event.queryStringParameters;
    
    console.log('🔧 Processing group parameters:', params);
    
    // ✅ Fast validation with single condition
    if (!params?.uid) {
      console.log('❌ Missing required parameters:', {
        uid: !!params?.uid
      });
      
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          required: ['uid'],
          provided: Object.keys(params || {})
        })
      };
    }
    
    // ✅ Validate UID format (9-12 digits)
    if (!/^\d{9,12}$/.test(params.uid)) {
      console.log('❌ Invalid UID format:', params.uid);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Invalid UID format. Must be 9-12 digits.',
          uid: params.uid
        })
      };
    }
    
    // ✅ Build the target API URL
    // This is the actual API endpoint that creates the 5-player group
    const targetApiUrl = `https://pnfr9aj17.localto.net:3566/5?uid=${encodeURIComponent(params.uid)}`;
    
    console.log('⚡ Calling 5-player group API:', targetApiUrl);

    // ✅ Fast fetch with timeout protection and optimized headers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(targetApiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NOVRA-X-Bot/1.0',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    // ✅ Get response data
    const responseText = await response.text();
    const contentType = response.headers.get('content-type');
    
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Group API Response in ${elapsed}ms - Status: ${response.status}`);

    // ✅ Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        success: true,
        status: response.status,
        elapsed: elapsed,
        message: '5-player group created successfully',
        data: responseText,
        contentType: contentType
      })
    };

  } catch (error) {
    const elapsed = Date.now() - startTime;
    
    console.error(`❌ Error after ${elapsed}ms:`, error.message);
    
    // ✅ Handle timeout specifically
    const isTimeout = error.name === 'AbortError';
    
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: isTimeout ? 'Request timeout (10s)' : error.message,
        elapsed: elapsed
      })
    };
  }
};
