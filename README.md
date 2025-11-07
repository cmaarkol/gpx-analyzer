# 🗺️ GPX Route Analyzer

A modern web application for analyzing GPX files with interactive map visualization, elevation profiles, and waypoint editing and route statistics. Perfect for hikers, cyclists, and outdoor enthusiasts planning routes in Hong Kong and beyond.

## 🚀 Quick Start

### 1. Basic Usage
```bash
# Clone or download the repository
# Open index.html in any modern web browser
# No server required - works completely offline!
```

### 2. Enhanced Experience with Local Elevation Data
For the best experience with Hong Kong routes, set up local SRTM elevation data (one-time setup):

#### Option A: Download from OpenTopography (Recommended)
1. **Visit OpenTopography**: https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1
2. **Select Region**: Click "Select a Region" button
3. **Enter Hong Kong Coordinates**:
   - **North**: 23.0
   - **South**: 22.0
   - **East**: 115.0
   - **West**: 113.0
4. **Download Options**:
   - **Format**: GeoTiff
   - **Resolution**: SRTM 1 Arc-Second (30m)
   - Click "Submit" to download

#### Option B: Direct SRTM Tile Download
For Hong Kong specifically, download these two SRTM tiles:
- **N22E113.tif** (Western Hong Kong)
- **N22E114.tif** (Eastern Hong Kong & most territory)

**Download Links**:
- [N22E113](https://e4ftl01.cr.usgs.gov//DP104/SRTM/SRTMGL1.003/2000.02.11/N22E113.SRTMGL1.hgt.zip)
- [N22E114](https://e4ftl01.cr.usgs.gov//DP104/SRTM/SRTMGL1.003/2000.02.11/N22E114.SRTMGL1.hgt.zip)

**Note**: These are .hgt.zip files - extract them to get .tif files, or use conversion tools if needed.

#### Installation
1. **Create folder**: `gpx-analyzer/srtm_tiles/`
2. **Place tiles**:
   ```
   gpx-analyzer/
   ├── srtm_tiles/
   │   ├── N22E113.tif
   │   └── N22E114.tif
   └── ...
   ```
3. **Refresh browser** - elevation data loads instantly!

**Benefits**: ~100MB one-time download, 100% offline, instant elevation lookups, no API limits or failures!

---

## 🛠️ How to Use

### 🎯 Core Functionality
- 📤 **File Upload**: Drag-and-drop GPX file upload with instant processing
- 🗺️ **Interactive Map**: Full-screen route visualization using OpenStreetMap tiles
- 📊 **Elevation Profile**: Dynamic Chart.js visualization with waypoint annotations
- 🏔️ **Smart Elevation System**: Local SRTM data with automatic API fallbacks
- 📏 **Advanced Statistics**: Distance, elevation gain/loss, customizable time estimates
- 📍 **Intelligent Waypoints**: Start/end detection, GPX waypoint support, interactive creation
- ✏️ **Route Drawing**: Draw new route segments directly on the map
- 🔧 **Route Editing**: Modify existing route geometry (basic implementation)

### Basic Workflow
1. **Upload GPX**: Click upload area to upload GPX file
2. **View Route**: Interactive map shows complete route with waypoints
3. **Analyze Elevation**: Chart displays elevation profile with clickable waypoints
4. **Customize Settings**: Adjust speeds for accurate time calculations
5. **Modify Route**: Add/delete waypoints, draw new segments, reverse route, or reset to original
6. **Export Data**: Download modified GPX or waypoint CSV/Excel files

### Advanced Features

### 🎮 Interactive Features
- **Renamable Route Titles**: Click to edit GPX filenames displayed above the map
- **Waypoint Management**: Add/delete waypoints by clicking map or elevation chart
- **Route Modification**: Reverse routes and reset to original GPX data
- **Route Drawing Mode**: ✏️ Click on map to draw new route segments from scratch
- **Route Editing Mode**: 🔧 Edit existing route geometry (basic implementation)
- **Real-time Synchronization**: Hover effects between map, chart, and waypoint table
- **Export Options**: Download modified routes as GPX or waypoint data as CSV/Excel

#### Route Drawing & Editing
- **Draw New Routes**: Click "✏️ Draw Route" to enter drawing mode, then click on the map to create new route segments
- **Edit Existing Routes**: Click "🔧 Edit Route" to modify existing route geometry (basic implementation)
- **Visual Feedback**: Drawn routes appear as dashed red lines until finalized
- **Integration**: Drawn segments are automatically added to your route with recalculated statistics
- **Elevation Handling**: New route segments get elevation data from available sources

**Route Drawing Workflow**:
1. Click "✏️ Draw Route" button (turns green when active)
2. Click points on the map to create your route
3. Click "✅ Finish Drawing" to integrate the route
4. Elevation data is fetched and statistics recalculated

#### Speed & Time Calculations
The app uses a realistic hiking model combining horizontal and vertical movement:

**Parameters**:
- **Flat Speed** (km/h): Horizontal speed on flat terrain (default: 5 km/h)
- **Climb Rate** (m/h): Vertical ascent rate when climbing (default: 300 m/h)

**Calculation Method**:
For each segment: `Total Time = Horizontal Time + Elevation Time`
- Horizontal Time = `distance / flat_speed`
- Elevation Time = `elevation_gain / climb_rate` (only for uphill segments)

**Recommended Settings**:
- Casual hiker: 4 km/h flat, 250 m/h climb
- Moderate hiker: 5 km/h flat, 300 m/h climb
- Fast hiker: 6 km/h flat, 400 m/h climb
- Trail runner: 8-10 km/h flat, 500-600 m/h climb

---

## 🏗️ Technical Architecture

### Technologies
- **Leaflet.js**: Interactive mapping with OpenStreetMap tiles
- **Chart.js**: Elevation profile with annotation plugin
- **GeoTIFF.js**: Local SRTM elevation data processing
- **Vanilla JavaScript**: Modular ES6 architecture
- **Modern CSS**: Responsive design with CSS Grid and Flexbox

### Code Structure
```
gpx-analyzer/
├── index.html          # Main HTML structure
├── styles.css          # Responsive styling
├── utils.js            # Core utilities & global variables
├── elevation.js        # Elevation data fetching & processing
├── route.js            # Route processing & waypoint management
├── ui.js               # User interface rendering & interactions
├── events.js           # Event handlers & GPX processing
├── app.js              # Application initialization
├── srtm_tiles/         # Local elevation data (optional)
│   ├── N22E113.tif
│   └── N22E114.tif
└── README.md
```

### Elevation Data Priority
1. **Local SRTM Tiles** (offline, instant) ⭐
2. **Open-Elevation API** (batch processing)
3. **OpenTopoData API** (alternative service)
4. **Point-by-Point API** (last resort)
5. **Flat Profile** (fallback if all services fail)

---

## 🌍 Browser Compatibility

Works on all modern browsers supporting:
- ES6 JavaScript modules
- Canvas API (Chart.js)
- FileReader API (GPX upload)
- Fetch API (elevation services)

**Tested Browsers**: Chrome, Firefox, Safari, Edge

---

## 📊 Use Cases

### 🥾 Hiking & Trekking
- Plan routes with accurate elevation profiles
- Calculate realistic hiking times
- Identify challenging sections
- Share modified routes with waypoints

### 🚴 Cycling
- Analyze bike routes with gradient information
- Plan rest stops and water points
- Optimize routes for energy efficiency

### 🏃‍♂️ Running & Trail Running
- Pace planning with distance markers
- Elevation-based effort estimation
- Training route customization

### 🧭 Outdoor Navigation
- GPX file validation and visualization
- Route modification for safety
- Emergency waypoint planning

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with various GPX files
5. Submit a pull request

### Development Setup
```bash
# No build process required - pure HTML/CSS/JS
# Just open index.html in your browser
# For development, use a local server for proper file loading
python3 -m http.server 8080
```

---

## 📄 License

MIT License - Free to use, modify, and distribute!

---

## 🙏 Acknowledgments

- **OpenStreetMap** contributors for map tiles
- **NASA SRTM** for elevation data
- **Open-Elevation** and **OpenTopoData** for API services
- **Chart.js** and **Leaflet.js** for amazing visualization libraries

---

*Made with ❤️ for outdoor enthusiasts in Hong Kong and beyond*
