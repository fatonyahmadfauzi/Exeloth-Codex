// netlify/functions/render-template.js
const nunjucks = require('nunjucks');

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/render-template', '');
  
  const headers = {
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Configure Nunjucks
    nunjucks.configure('templates', { 
      autoescape: true,
      noCache: process.env.NODE_ENV === 'production'
    });

    let templateData = {};
    let templateName = '';

    // Route based on path
    if (path === '/game' || path.startsWith('/game/')) {
      const slug = event.queryStringParameters.slug;
      templateName = 'game.njk';
      
      // Mock data - in real implementation, fetch from Firestore
      templateData = {
        game: {
          title: 'Honkai: Star Rail',
          slug: slug,
          description: 'Space fantasy RPG with turn-based combat',
          thumbnailURL: 'https://i.ibb.co/example/honkai-thumbnail.jpg',
          includes: ['main_story', 'character_story']
        },
        sections: {
          main_story: [
            { title: 'Chapter 1: The Journey Begins', content: '<p>Story content here...</p>' },
            { title: 'Chapter 2: New Worlds', content: '<p>More story content...</p>' }
          ]
        }
      };
    } else {
      templateName = 'home.njk';
      templateData = {
        games: [
          {
            title: 'Honkai: Star Rail',
            slug: 'honkai-star-rail',
            description: 'Space fantasy RPG with turn-based combat',
            thumbnailURL: 'https://i.ibb.co/example/honkai-thumbnail.jpg'
          },
          {
            title: 'Wuthering Waves', 
            slug: 'wuthering-waves',
            description: 'Open-world action RPG',
            thumbnailURL: 'https://i.ibb.co/example/wuthering-thumbnail.jpg'
          }
        ]
      };
    }

    const html = nunjucks.render(templateName, templateData);
    
    return {
      statusCode: 200,
      headers,
      body: html
    };

  } catch (error) {
    console.error('Template rendering error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: nunjucks.render('error.njk', { error: error.message })
    };
  }
};