const fs = require('fs').promises;
const path = require('path');

class ImageDatabase {
  constructor() {
    // Use persistent disk path on Render, fallback to local for development
    this.dbPath = process.env.RENDER 
      ? '/opt/render/project/src/public/images/database.json'
      : path.join(__dirname, 'images.json');
    this.cache = null;
    this.cacheTime = 0;
    this.cacheTimeout = 30000; // 30 seconds
  }

  clearCache() {
    this.cache = null;
    this.cacheTime = 0;
    console.log('Database cache cleared');
  }

  async loadDatabase() {
    const now = Date.now();
    if (this.cache && (now - this.cacheTime) < this.cacheTimeout) {
      return this.cache;
    }

    try {
      console.log('Loading database from:', this.dbPath);
      
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });
      
      // Try to read the database file
      let data;
      try {
        data = await fs.readFile(this.dbPath, 'utf8');
        console.log('Database loaded successfully');
      } catch (readError) {
        console.log('Database file not found, creating new one');
        // If database doesn't exist, try to copy from template
        const templatePath = path.join(__dirname, 'images.json.template');
        try {
          data = await fs.readFile(templatePath, 'utf8');
          // Save the template as the new database
          await fs.writeFile(this.dbPath, data);
          console.log('Database created from template');
        } catch (templateError) {
          // If template doesn't exist, create empty database
          data = JSON.stringify({ images: [], countries: [], tags: [] }, null, 2);
          await fs.writeFile(this.dbPath, data);
          console.log('Empty database created');
        }
      }
      
      this.cache = JSON.parse(data);
      this.cacheTime = now;
      console.log('Database loaded with', this.cache.images.length, 'images');
      return this.cache;
    } catch (error) {
      console.error('Error loading database:', error);
      return { images: [], countries: [], tags: [] };
    }
  }

  async saveDatabase(data) {
    try {
      console.log('Saving database to:', this.dbPath);
      await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
      this.cache = data;
      this.cacheTime = Date.now();
      console.log('Database saved successfully with', data.images.length, 'images');
      return true;
    } catch (error) {
      console.error('Error saving database:', error);
      return false;
    }
  }

  // Image operations
  async getAllImages() {
    const db = await this.loadDatabase();
    return db.images || [];
  }

  async getImageById(id) {
    const images = await this.getAllImages();
    return images.find(img => img.id === id);
  }

  async getImagesByCountry(country) {
    const images = await this.getAllImages();
    return images.filter(img => 
      img.country.toLowerCase() === country.toLowerCase()
    );
  }

  async getFeaturedImages() {
    const images = await this.getAllImages();
    return images.filter(img => img.featured);
  }

  async addImage(imageData) {
    const db = await this.loadDatabase();
    const newImage = {
      id: imageData.id || this.generateId(),
      filename: imageData.filename,
      country: imageData.country,
      location: imageData.location || imageData.country,
      date_taken: imageData.date_taken || new Date().toISOString().split('T')[0],
      camera: imageData.camera || 'RICOH GR IIIX',
      focal_length: imageData.focal_length || '28mm',
      aperture: imageData.aperture || 'f/2.8',
      shutter_speed: imageData.shutter_speed || '1/125s',
      iso: imageData.iso || '200',
      tags: imageData.tags || [],
      featured: imageData.featured || false,
      description: imageData.description || '',
      fileSize: imageData.fileSize || null,
      fileSizeBytes: imageData.fileSizeBytes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.images.push(newImage);
    await this.updateCountryStats(db);
    return await this.saveDatabase(db) ? newImage : null;
  }

  async updateImage(id, updateData) {
    const db = await this.loadDatabase();
    const imageIndex = db.images.findIndex(img => img.id === id);
    
    if (imageIndex === -1) return null;

    db.images[imageIndex] = {
      ...db.images[imageIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };

    await this.updateCountryStats(db);
    return await this.saveDatabase(db) ? db.images[imageIndex] : null;
  }

  async deleteImage(id) {
    const db = await this.loadDatabase();
    const imageIndex = db.images.findIndex(img => img.id === id);
    
    if (imageIndex === -1) return false;

    db.images.splice(imageIndex, 1);
    await this.updateCountryStats(db);
    return await this.saveDatabase(db);
  }

  // Country operations
  async getAllCountries() {
    const db = await this.loadDatabase();
    return db.countries || [];
  }

  async updateCountryStats(db) {
    const countryStats = {};
    
    db.images.forEach(img => {
      const country = img.country;
      if (!countryStats[country]) {
        countryStats[country] = {
          name: country,
          code: this.getCountryCode(country),
          image_count: 0,
          featured_image: null
        };
      }
      countryStats[country].image_count++;
      if (img.featured && !countryStats[country].featured_image) {
        countryStats[country].featured_image = img.id;
      }
    });

    db.countries = Object.values(countryStats);
  }

  getCountryCode(countryName) {
    const codes = {
      'Argentina': 'AR',
      'Japan': 'JP',
      'Colombia': 'CO',
      'Peru': 'PE',
      'Bolivia': 'BO',
      'Chile': 'CL',
      'Denmark': 'DK'
    };
    return codes[countryName] || countryName.substring(0, 2).toUpperCase();
  }

  // Tag operations
  async getAllTags() {
    const db = await this.loadDatabase();
    return db.tags || [];
  }

  async addTag(tag) {
    const db = await this.loadDatabase();
    if (!db.tags) db.tags = [];
    
    if (!db.tags.includes(tag)) {
      db.tags.push(tag);
      await this.saveDatabase(db);
    }
    return tag;
  }

  // Utility methods
  generateId() {
    return 'IMG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async syncWithFileSystem(imagesDir) {
    const fs = require('fs').promises;
    const countries = await fs.readdir(imagesDir, { withFileTypes: true });
    const newImages = [];

    for (const countryDir of countries) {
      if (countryDir.isDirectory()) {
        const countryName = countryDir.name;
        const countryPath = path.join(imagesDir, countryName);
        const files = await fs.readdir(countryPath);
        
        for (const file of files) {
          if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file)) {
            const id = path.parse(file).name;
            const existingImage = await this.getImageById(id);
            
            if (!existingImage) {
              newImages.push({
                id: id,
                filename: file,
                country: countryName,
                location: countryName,
                date_taken: new Date().toISOString().split('T')[0],
                camera: 'RICOH GR IIIX',
                focal_length: '28mm',
                aperture: 'f/2.8',
                shutter_speed: '1/125s',
                iso: '200',
                tags: [],
                featured: false,
                description: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    // Add new images to database
    for (const image of newImages) {
      await this.addImage(image);
    }

    return newImages.length;
  }
}

module.exports = new ImageDatabase();

