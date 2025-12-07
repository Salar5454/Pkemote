// netlify/functions/send-emote.js
// ⚡ ENHANCED VERSION - SUPER FAST API PROXY

exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // ✅ Quick method check
  if (event.httpMethod !== 'GET') {
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
    
    // ✅ Fast validation with single condition
    if (!params?.server || !params?.tc || !params?.uid1 || !params?.emote_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          required: ['server', 'tc', 'uid1', 'emote_id']
        })
      };
    }

    // ✅ Optimized URL building using array join (faster than string concatenation)
    const urlParts = [`${params.server}/join?tc=${encodeURIComponent(params.tc)}`];
    
    // Add UIDs efficiently (up to 5)
    for (let i = 1; i <= 5; i++) {
      if (params[`uid${i}`]) {
        urlParts.push(`uid${i}=${encodeURIComponent(params[`uid${i}`])}`);
      }
    }
    
    urlParts.push(`emote_id=${encodeURIComponent(params.emote_id)}`);
    
    const apiUrl = urlParts.join('&');

    console.log('⚡ API Call:', apiUrl);

    // ✅ Fast fetch with timeout protection and optimized headers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NOVRA-X-Bot/1.0',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    // ✅ Stream response for faster processing
    const responseText = await response.text();
    
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Response in ${elapsed}ms - Status: ${response.status}`);

    // ✅ Minimal response payload for speed
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
        message: 'Emote sent successfully',
        data: responseText
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
        error: isTimeout ? 'Request timeout (8s)' : error.message,
        elapsed: elapsed
      })
    };
  }
};