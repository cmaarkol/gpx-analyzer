# SRTM Elevation Data Setup Guide

This guide will help you download and install SRTM elevation data for **Hong Kong** to enable offline, instant elevation lookups.

## 📋 What You Need

Hong Kong's coordinates span approximately:
- **Latitude**: 22.15°N to 22.58°N
- **Longitude**: 113.83°E to 114.41°E

This requires **2 SRTM tiles**:
- `N22E113.tif` (covers western Hong Kong)
- `N22E114.tif` (covers eastern Hong Kong & most of the territory)

---

## 🌍 Option 1: Download from OpenTopography (Recommended)

### Step 1: Visit OpenTopography
Go to: https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1

### Step 2: Select Region
1. Click "Select a Region" button
2. Enter coordinates for Hong Kong:
   - **North**: 23
   - **South**: 22
   - **East**: 115
   - **West**: 113
3. Click "Submit"

### Step 3: Download Options
- **Format**: Choose `GeoTiff`
- **Resolution**: SRTM 1 Arc-Second (30m) for best quality
- Click "Submit" to download

### Step 4: Extract Files
You'll receive a single GeoTIFF file that covers the region. You may need to split it into 1° tiles.

---

## 🛰️ Option 2: Download from NASA EarthData

### Step 1: Create Account (if needed)
1. Go to: https://urs.earthdata.nasa.gov/users/new
2. Create a free NASA EarthData account

### Step 2: Access SRTM Data
Visit: https://search.earthdata.nasa.gov/search

### Step 3: Search for Tiles
1. Search for: "SRTM GL1" or "NASADEM"
2. Draw a box around Hong Kong on the map
3. Filter results for:
   - N22E113
   - N22E114

### Step 4: Download
1. Click each tile
2. Download the `.hgt` or `.tif` file
3. If you get `.hgt` files, you'll need to convert them (see below)

---

## 🛠️ Option 3: Use SRTM Downloader Tool

### Install srtm.py
```bash
pip install srtm.py
```

### Download Tiles
```bash
# Download SRTM tiles for Hong Kong coordinates
srtm download 22.15 113.83 22.58 114.41
```

This will automatically download the required tiles to your current directory.

---

## 📁 File Setup

### Step 1: Create Directory
In your project folder, create:
```
gpx-analyzer/
├── srtm_tiles/          ← Create this folder
│   ├── N22E113.tif
│   └── N22E114.tif
├── index.html
├── app.js
└── ...
```

### Step 2: File Naming
Ensure files are named exactly as:
- `N22E113.tif` (Latitude 22°N, Longitude 113°E)
- `N22E114.tif` (Latitude 22°N, Longitude 114°E)

Format: `[N/S][LAT][E/W][LON].tif`

---

## 🔄 Converting HGT to GeoTIFF

If you downloaded `.hgt` files, convert them to `.tif`:

### Using GDAL
```bash
# Install GDAL
brew install gdal  # macOS
# or
sudo apt-get install gdal-bin  # Linux

# Convert HGT to GeoTIFF
gdal_translate -of GTiff N22E113.hgt N22E113.tif
gdal_translate -of GTiff N22E114.hgt N22E114.tif
```

### Using Python
```python
from osgeo import gdal

# Convert HGT to GeoTIFF
gdal.Translate('N22E113.tif', 'N22E113.hgt', format='GTiff')
gdal.Translate('N22E114.tif', 'N22E114.hgt', format='GTiff')
```

---

## ✅ Verify Installation

### Check File Structure
```bash
ls -lh srtm_tiles/
# Should show:
# N22E113.tif  (~50MB)
# N22E114.tif  (~50MB)
```

### Test in App
1. Open your GPX analyzer in a browser
2. Upload a Hong Kong GPX file
3. Watch the console (F12)
4. You should see: `✓ Loaded SRTM tile: N22E113.tif` or `N22E114.tif`
5. The elevation source banner should show: **🏔️ Local SRTM Data**

---

## 🎯 Expected Results

**With SRTM tiles:**
- ✅ Instant elevation lookups (no API calls)
- ✅ Works offline
- ✅ 100% reliable for Hong Kong routes
- ✅ 30m resolution accuracy
- ✅ No rate limits

**Without SRTM tiles:**
- ⚠️ Falls back to Open-Elevation API
- ⚠️ Requires internet connection
- ⚠️ May experience rate limits/timeouts

---

## 📊 Coverage Areas

### Hong Kong Tiles Coverage:
- **N22E113.tif**: Covers Lantau Island, Tuen Mun, western New Territories
- **N22E114.tif**: Covers Hong Kong Island, Kowloon, most of New Territories, Sai Kung

### Neighboring Areas:
If your routes extend beyond Hong Kong:
- **N22E112.tif**: Western areas (Zhuhai border)
- **N23E113.tif**: Northern areas (Shenzhen)
- **N23E114.tif**: Northeastern areas (Shenzhen East)

---

## 🐛 Troubleshooting

### Problem: "SRTM tile not found"
**Solution**: Check file naming is exactly `N22E113.tif` (case-sensitive) in `srtm_tiles/` folder

### Problem: "Failed to load SRTM tile"
**Solution**: Ensure files are valid GeoTIFF format. Try opening in QGIS or `gdalinfo N22E113.tif`

### Problem: Elevation values seem wrong
**Solution**: Check file coordinate system is WGS84 (EPSG:4326). Convert if needed:
```bash
gdalwarp -t_srs EPSG:4326 input.tif N22E113.tif
```

### Problem: Files are too large
**Solution**: Compress GeoTIFF with:
```bash
gdal_translate -co COMPRESS=LZW -co TILED=YES N22E113_raw.tif N22E113.tif
```

---

## 📚 Additional Resources

- **SRTM Data Overview**: https://www2.jpl.nasa.gov/srtm/
- **OpenTopography**: https://opentopography.org/
- **GDAL Documentation**: https://gdal.org/
- **GeoTIFF.js Library**: https://geotiffjs.github.io/

---

## 💡 Pro Tips

1. **Compression**: Use LZW compression to reduce file size by ~50%
2. **Caching**: Tiles are cached in browser memory after first load
3. **Bilinear Interpolation**: The app uses bilinear interpolation for smoother elevation profiles
4. **Expand Coverage**: Download neighboring tiles for routes near borders

---

## 🎉 You're All Set!

Once tiles are in place, your GPX analyzer will:
1. ✅ Check for local SRTM data first
2. ✅ Use it if available (instant, offline)
3. ✅ Fall back to APIs if coordinates outside coverage

Enjoy fast, reliable elevation data for all your Hong Kong routes! 🏔️
