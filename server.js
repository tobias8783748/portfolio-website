const path = require('path');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use a temporary directory first, then move to country folder
      const tempPath = path.join(__dirname, 'public', 'images', 'temp');
      
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
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: 600; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #111; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #333; }
        .status { margin-top: 20px; padding: 15px; border-radius: 4px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    </style>
</head>
<body>
    <h1>Upload Image</h1>
    <form id="uploadForm" enctype="multipart/form-data">
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
            <label for="location">Location</label>
            <input type="text" id="location" name="location" placeholder="e.g., Tokyo, Buenos Aires">
        </div>
        
        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="3" placeholder="Describe your photo..."></textarea>
        </div>
        
        <div class="form-group">
            <label for="tags">Tags (comma-separated)</label>
            <input type="text" id="tags" name="tags" placeholder="landscape, city, architecture">
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" id="featured" name="featured" value="true">
                Featured Image
            </label>
        </div>
        
        <button type="submit">Upload Image</button>
    </form>
    
    <div id="status"></div>
    
    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const statusDiv = document.getElementById('status');
            
            try {
                statusDiv.innerHTML = '<div class="status">Uploading...</div>';
                
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

		const { country, location, description, tags, featured } = req.body;
		const filename = req.file.filename;
		const tempFilePath = req.file.path;
		
		// Generate unique ID from filename
		const id = path.parse(filename).name;
		
		// Create country directory
		const countryDir = path.join(__dirname, 'public', 'images', country || 'Unknown');
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
			featured: featured === 'true' || featured === true,
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


