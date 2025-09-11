const fs = require('fs');
const path = require('path');

console.log('Clearing Render disk...');

// Paths for Render persistent disk
const persistentImagesPath = '/opt/render/project/src/public/images';
const persistentDbPath = '/opt/render/project/src/public/images/database.json';

// Check if we're on Render
if (process.env.RENDER) {
  console.log('Running on Render - clearing persistent disk...');
  
  try {
    // Clear all image directories except temp
    if (fs.existsSync(persistentImagesPath)) {
      const items = fs.readdirSync(persistentImagesPath);
      items.forEach(item => {
        if (item !== 'temp' && item !== 'database.json') {
          const itemPath = path.join(persistentImagesPath, item);
          if (fs.statSync(itemPath).isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
            console.log(`Removed directory: ${item}`);
          } else {
            fs.unlinkSync(itemPath);
            console.log(`Removed file: ${item}`);
          }
        }
      });
    }
    
    // Reset database to empty state
    const emptyDb = {
      images: [],
      countries: [],
      tags: []
    };
    
    fs.writeFileSync(persistentDbPath, JSON.stringify(emptyDb, null, 2));
    console.log('Database cleared and reset to empty state');
    
    console.log('Render disk cleared successfully!');
    console.log('You can now upload images with the new 2400x1600/1600x2400 settings.');
    
  } catch (error) {
    console.error('Error clearing Render disk:', error);
  }
} else {
  console.log('Not running on Render - this script only works on Render');
  console.log('To clear local development data, delete the database/images.json file');
}
