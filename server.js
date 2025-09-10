const path = require('path');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve images from persistent disk on Render
if (process.env.RENDER) {
  // Copy static images to persistent disk on startup
  const staticImagesPath = path.join(__dirname, 'public', 'images');
  const persistentImagesPath = '/opt/render/project/src/public/images';
  const persistentDbPath = '/opt/render/project/src/database';
  
  // Ensure persistent disk directories exist
  if (!fs.existsSync(persistentImagesPath)) {
    fs.mkdirSync(persistentImagesPath, { recursive: true });
  }
  if (!fs.existsSync(persistentDbPath)) {
    fs.mkdirSync(persistentDbPath, { recursive: true });
  }
  
  // Copy static images to persistent disk
  try {
    const files = fs.readdirSync(staticImagesPath);
    files.forEach(file => {
      if (file !== 'temp') { // Skip temp directory
        const srcPath = path.join(staticImagesPath, file);
        const destPath = path.join(persistentImagesPath, file);
        
        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied ${file} to persistent disk`);
        } else if (fs.statSync(srcPath).isDirectory()) {
          // Copy directory recursively
          const copyDir = (src, dest) => {
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true });
            }
            const items = fs.readdirSync(src);
            items.forEach(item => {
              const srcItem = path.join(src, item);
              const destItem = path.join(dest, item);
              if (fs.statSync(srcItem).isDirectory()) {
                copyDir(srcItem, destItem);
              } else {
                fs.copyFileSync(srcItem, destItem);
              }
            });
          };
          copyDir(srcPath, destPath);
          console.log(`Copied directory ${file} to persistent disk`);
        }
      }
    });
  } catch (error) {
    console.error('Error copying static images to persistent disk:', error);
  }
  
  app.use('/images', express.static(persistentImagesPath));
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use Render's persistent disk path if available, otherwise fallback to local
      const basePath = process.env.RENDER ? '/opt/render/project/src/public/images' : path.join(__dirname, 'public', 'images');
      const tempPath = path.join(basePath, 'temp');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
      }
      
      cb(null, tempPath);
    },
    filename: (req, file, cb) => {
      // Keep original filename
      cb(null, file.originalname);
    }
  }),
  // No file size limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Root route
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Photos API with database metadata
app.get('/api/photos', async (req, res) => {
	try {
		const { country, featured, tags } = req.query;
		let images = await db.getAllImages();
		
		// Filter by country
		if (country && country !== 'all') {
			images = images.filter(img => 
				img.country.toLowerCase() === country.toLowerCase()
			);
		}
		
		// Filter by featured
		if (featured === 'true') {
			images = images.filter(img => img.featured);
		}
		
		// Filter by tags
		if (tags) {
			const tagList = tags.split(',').map(t => t.trim().toLowerCase());
			images = images.filter(img => 
				img.tags.some(tag => tagList.includes(tag.toLowerCase()))
			);
		}
		
		// Add src path to each image
		const response = images.map(img => ({
			...img,
			src: `/images/${img.country}/${img.filename}`
		}));
		
		res.json(response);
	} catch (err) {
		console.error('Error fetching photos:', err);
		res.status(500).json({ error: 'Failed to fetch photos' });
	}
});

// Get single image by ID
app.get('/api/photos/:id', async (req, res) => {
	try {
		const image = await db.getImageById(req.params.id);
		if (!image) {
			return res.status(404).json({ error: 'Image not found' });
		}
		
		const response = {
			...image,
			src: `/images/${image.country}/${image.filename}`
		};
		
		res.json(response);
	} catch (err) {
		console.error('Error fetching image:', err);
		res.status(500).json({ error: 'Failed to fetch image' });
	}
});

// Get countries
app.get('/api/countries', async (req, res) => {
	try {
		const countries = await db.getAllCountries();
		res.json(countries);
	} catch (err) {
		console.error('Error fetching countries:', err);
		res.status(500).json({ error: 'Failed to fetch countries' });
	}
});

// Get tags
app.get('/api/tags', async (req, res) => {
	try {
		const tags = await db.getAllTags();
		res.json(tags);
	} catch (err) {
		console.error('Error fetching tags:', err);
		res.status(500).json({ error: 'Failed to fetch tags' });
	}
});

// Upload form page
app.get('/api/upload', (req, res) => {
	res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Image - tsa</title>
    <link rel="icon" type="image/svg+xml" href="/images/camera.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="shortcut icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Proxima+Nova:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { 
            box-sizing: border-box; 
            font-family: 'Proxima Nova', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        body { 
            margin: 0; 
            padding: 0; 
            background: #ffffff; 
            color: #111111; 
            line-height: 1.6;
            min-height: 100vh;
        }
        .back-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.95);
            border: 1px solid rgba(0,0,0,0.1);
            color: #111;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            border-radius: 6px;
            backdrop-filter: blur(10px);
            transition: all 0.2s ease;
            z-index: 1000;
        }
        .back-button:hover {
            background: rgba(255,255,255,1);
            border-color: rgba(0,0,0,0.2);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            padding: 80px 20px 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 32px;
            font-weight: 600;
            color: #111;
            margin-bottom: 8px;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            font-weight: 400;
        }
        .form {
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .form-group { 
            margin-bottom: 24px; 
        }
        .form-group:last-child {
            margin-bottom: 0;
        }
        label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 500; 
            font-size: 14px;
            color: #111;
        }
        .required {
            color: #dc2626;
        }
        input, select, textarea { 
            width: 100%; 
            padding: 12px 16px; 
            border: 1px solid #d1d5db; 
            border-radius: 8px; 
            font-size: 14px; 
            font-family: inherit;
            background: #ffffff;
            transition: all 0.2s ease;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #111;
            box-shadow: 0 0 0 3px rgba(17,17,17,0.1);
        }
        input[type="file"] {
            padding: 8px 12px;
            border: 2px dashed #d1d5db;
            background: #f9fafb;
            cursor: pointer;
        }
        input[type="file"]:hover {
            border-color: #9ca3af;
            background: #f3f4f6;
        }
        button { 
            background: #111; 
            color: white; 
            padding: 14px 32px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 14px; 
            font-weight: 500;
            font-family: inherit;
            width: 100%;
            transition: all 0.2s ease;
        }
        button:hover { 
            background: #000;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        button:active {
            transform: translateY(0);
        }
        .status { 
            padding: 16px; 
            margin: 24px 0; 
            border-radius: 8px; 
            font-size: 14px;
        }
        .success { 
            background: #f0fdf4; 
            border: 1px solid #bbf7d0; 
            color: #166534; 
        }
        .error { 
            background: #fef2f2; 
            border: 1px solid #fecaca; 
            color: #dc2626; 
        }
        .loading {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #475569;
        }
        .success a {
            color: #166534;
            text-decoration: underline;
        }
        .success a:hover {
            color: #0f5132;
        }
    </style>
</head>
<body>
    <a href="/" class="back-button">← Back to Gallery</a>
    
    <div class="container">
        <div class="header">
            <div class="logo">tsa</div>
            <div class="subtitle">Upload Image</div>
        </div>
        
        <form id="uploadForm" class="form" enctype="multipart/form-data">
        <div class="form-group">
            <label for="image">Image File *</label>
            <input type="file" id="image" name="image" accept="image/*" required>
        </div>
        
        <div class="form-group">
            <label for="country">Country *</label>
            <select id="country" name="country" required>
                <option value="">Select Country</option>
                <option value="Argentina">Argentina</option>
                <option value="Japan">Japan</option>
                <option value="Colombia">Colombia</option>
                <option value="Peru">Peru</option>
                <option value="Bolivia">Bolivia</option>
                <option value="Chile">Chile</option>
                <option value="Denmark">Denmark</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="location">Location *</label>
            <input type="text" id="location" name="location" placeholder="e.g., Tokyo, Buenos Aires" required>
        </div>
        
        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="3" placeholder="Describe your photo..."></textarea>
        </div>
        
        <div class="form-group">
            <label for="tags">Tags (comma-separated)</label>
            <input type="text" id="tags" name="tags" placeholder="landscape, city, architecture">
        </div>
        
        
            <button type="submit">Upload Image</button>
        </form>
        
        <div id="status"></div>
    </div>
    
    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const statusDiv = document.getElementById('status');
            
            try {
                statusDiv.innerHTML = '<div class="status loading">Uploading...</div>';
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    statusDiv.innerHTML = \`
                        <div class="status success">
                            <strong>Success!</strong> Image uploaded successfully.<br>
                            <strong>ID:</strong> \${result.id}<br>
                            <strong>Country:</strong> \${result.country}<br>
                            <strong>Location:</strong> \${result.location}<br>
                            <a href="\${result.src}" target="_blank">View Image</a>
                        </div>
                    \`;
                    e.target.reset();
                } else {
                    statusDiv.innerHTML = \`<div class="status error"><strong>Error:</strong> \${result.error}</div>\`;
                }
            } catch (error) {
                statusDiv.innerHTML = \`<div class="status error"><strong>Error:</strong> \${error.message}</div>\`;
            }
        });
    </script>
</body>
</html>
	`);
});

// Hidden upload endpoint (not visible in UI)
app.post('/api/upload', upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No image file provided' });
		}

		const { country, location, description, tags } = req.body;
		
		// Validate required fields
		if (!location || location.trim() === '') {
			return res.status(400).json({ error: 'Location is required' });
		}
		
		const filename = req.file.filename;
		const tempFilePath = req.file.path;
		
		// Generate unique ID from filename
		const id = path.parse(filename).name;
		
		// Create country directory
		const basePath = process.env.RENDER ? '/opt/render/project/src/public/images' : path.join(__dirname, 'public', 'images');
		const countryDir = path.join(basePath, country || 'Unknown');
		if (!fs.existsSync(countryDir)) {
			fs.mkdirSync(countryDir, { recursive: true });
		}
		
		// Move file from temp to country folder
		const finalFilePath = path.join(countryDir, filename);
		fs.renameSync(tempFilePath, finalFilePath);
		
		// Prepare image data
		const imageData = {
			id: id,
			filename: filename,
			country: country || 'Unknown',
			location: location || country || 'Unknown',
			description: description || '',
			tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
			featured: false,
			camera: 'RICOH GR IIIX',
			focal_length: '28mm',
			aperture: 'f/2.8',
			shutter_speed: '1/125s',
			iso: '200'
		};

		// Add to database
		const image = await db.addImage(imageData);
		if (!image) {
			// Clean up uploaded file if database save fails
			fs.unlinkSync(finalFilePath);
			return res.status(400).json({ error: 'Failed to save image metadata' });
		}

		res.status(201).json({
			...image,
			src: `/images/${image.country}/${image.filename}`,
			message: 'Image uploaded successfully'
		});
	} catch (err) {
		console.error('Error uploading image:', err);
		res.status(500).json({ error: 'Failed to upload image' });
	}
});

// Add new image (metadata only)
app.post('/api/photos', async (req, res) => {
	try {
		const image = await db.addImage(req.body);
		if (!image) {
			return res.status(400).json({ error: 'Failed to add image' });
		}
		
		const response = {
			...image,
			src: `/images/${image.country}/${image.filename}`
		};
		
		res.status(201).json(response);
	} catch (err) {
		console.error('Error adding image:', err);
		res.status(500).json({ error: 'Failed to add image' });
	}
});

// Update image
app.put('/api/photos/:id', async (req, res) => {
	try {
		const image = await db.updateImage(req.params.id, req.body);
		if (!image) {
			return res.status(404).json({ error: 'Image not found' });
		}
		
		const response = {
			...image,
			src: `/images/${image.country}/${image.filename}`
		};
		
		res.json(response);
	} catch (err) {
		console.error('Error updating image:', err);
		res.status(500).json({ error: 'Failed to update image' });
	}
});

// Delete image
app.delete('/api/photos/:id', async (req, res) => {
	try {
		const success = await db.deleteImage(req.params.id);
		if (!success) {
			return res.status(404).json({ error: 'Image not found' });
		}
		
		res.json({ message: 'Image deleted successfully' });
	} catch (err) {
		console.error('Error deleting image:', err);
		res.status(500).json({ error: 'Failed to delete image' });
	}
});

// Sync database with file system
app.post('/api/sync', async (req, res) => {
	try {
		const imagesDir = path.join(__dirname, 'public', 'images');
		const newCount = await db.syncWithFileSystem(imagesDir);
		res.json({ 
			message: `Synced ${newCount} new images`,
			new_images: newCount
		});
	} catch (err) {
		console.error('Error syncing database:', err);
		res.status(500).json({ error: 'Failed to sync database' });
	}
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});


