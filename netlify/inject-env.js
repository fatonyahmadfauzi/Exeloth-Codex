// netlify/inject-env.js
const fs = require('fs');
const path = require('path');

function injectEnvironmentVariables() {
  try {
    console.log('🔧 Injecting environment variables...');
    
    // Baca environment variables dari Netlify
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    const imgbbApiKey = process.env.IMGBB_API_KEY;
    const nodeEnv = process.env.NODE_ENV || 'development';

    console.log('Environment:', nodeEnv);
    console.log('Firebase API Key:', firebaseApiKey ? '***' + firebaseApiKey.slice(-4) : 'Not set');
    console.log('ImgBB API Key:', imgbbApiKey ? '***' + imgbbApiKey.slice(-4) : 'Not set');

    // Handle firebase-config.js
    const firebaseConfigPath = path.join(__dirname, '../assets/js/firebase-config.js');
    
    if (fs.existsSync(firebaseConfigPath)) {
      let firebaseConfig = fs.readFileSync(firebaseConfigPath, 'utf8');
      
      if (firebaseApiKey) {
        // Ganti API key dengan environment variable
        firebaseConfig = firebaseConfig.replace(
          /apiKey: ".*?"/,
          `apiKey: "${firebaseApiKey}"`
        );
        console.log('✅ Firebase API key injected');
      } else {
        console.log('⚠️  FIREBASE_API_KEY not set, using default');
      }
      
      fs.writeFileSync(firebaseConfigPath, firebaseConfig);
    } else {
      console.log('❌ firebase-config.js not found');
    }

    // Update Netlify function dengan ImgBB API key
    const imgbbFunctionPath = path.join(__dirname, 'functions/imgbb-upload.js');
    
    if (fs.existsSync(imgbbFunctionPath) && imgbbApiKey) {
      let imgbbFunction = fs.readFileSync(imgbbFunctionPath, 'utf8');
      
      // Pastikan function menggunakan process.env
      if (!imgbbFunction.includes('process.env.IMGBB_API_KEY')) {
        imgbbFunction = imgbbFunction.replace(
          /const IMGBB_API_KEY = ".*?";/,
          'const IMGBB_API_KEY = process.env.IMGBB_API_KEY;'
        );
        console.log('✅ ImgBB function updated to use environment variables');
      }
      
      fs.writeFileSync(imgbbFunctionPath, imgbbFunction);
    }

    // Create environment config file untuk frontend
    const envConfig = `
// Auto-generated configuration - Do not edit manually
window.ENV_CONFIG = {
  NODE_ENV: "${nodeEnv}",
  BUILD_TIME: "${new Date().toISOString()}"
  // Note: Sensitive keys are NOT exposed to frontend
};
`;
    
    const envConfigPath = path.join(__dirname, '../assets/js/env-config.js');
    fs.writeFileSync(envConfigPath, envConfig);
    console.log('✅ Environment config generated');
    
    console.log('🎉 Build process completed!');
    
  } catch (error) {
    console.error('❌ Error in build process:', error);
    process.exit(1);
  }
}

injectEnvironmentVariables();