// netlify/functions/imgbb-upload.js
const fetch = require('node-fetch');
// Impor URLSearchParams karena ini environment Node.js
const { URLSearchParams } = require('url');

exports.handler = async (event) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { image, fileName = 'image.jpg' } = JSON.parse(event.body);
    
    // Use environment variable for API key (secure)
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    
    if (!IMGBB_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: IMGBB_API_KEY not set' })
      };
    }

    // Extract base64 data from data URL
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // === 👇 AWAL PERBAIKAN ===
    // Buat body menggunakan URLSearchParams, bukan FormData
    const body = new URLSearchParams();
    // Kirim gambar sebagai string base64, ImgBB mendukung ini
    body.append('image', base64Data);

    // Upload to ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      headers: {
        // Tentukan tipe konten yang benar
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      // Kirim body sebagai string
      body: body.toString()
    });
    // === 👆 AKHIR PERBAIKAN ===

    const data = await response.json();

    if (data.success) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          url: data.data.url,
          delete_url: data.data.delete_url 
        })
      };
    } else {
      // Kirim pesan error dari ImgBB jika ada
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: data.error?.message || 'Upload failed' 
        })
      };
    }
  } catch (error) {
    console.error('ImgBB upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error: ' + error.message 
      })
    };
  }
};