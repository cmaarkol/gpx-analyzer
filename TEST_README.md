# GPX Route Analyzer - Test Suite

This directory contains comprehensive tests for the GPX Route Analyzer application.

## 🧪 Test Files

### HTML Test Interface
- **`test-suite.html`** - Interactive web-based test interface with both automated and manual tests

### Automated Tests
- **`test-runner.js`** - JavaScript test runner for automated unit tests
- **`performance-tests.js`** - Performance benchmarking tests for different data sizes

### Manual Tests
- **`test-data/`** - Sample GPX files for testing different scenarios

### Sample Data
- **`simple-route.gpx`** - Basic route with waypoints and elevation
- **`complex-route.gpx`** - Mountain route with significant elevation changes
- **`no-elevation-route.gpx`** - Route without elevation data (tests API fetching)

## 🚀 Running Tests

### Method 1: Web Interface (Recommended)
1. Start the development server: `python3 -m http.server 8080`
2. Open `http://localhost:8080/test-suite.html` in your browser
3. Run automated tests or follow manual test instructions

### Performance Tests
1. Open `http://localhost:8080/test-suite.html` in your browser
2. Click "Run Performance Tests" in the Performance Tests section
3. View benchmark results for different data sizes

### Command Line Performance Tests
```bash
# Requires Node.js
node performance-tests.js
```

## 📋 Test Categories

### ⚡ Performance Tests
- **GPX Parsing** - Tests XML parsing performance with different file sizes (10, 100, 1000, 5000 points)
- **Route Processing** - Benchmarks distance and elevation calculations
- **Elevation Fetching** - Tests API call simulation with network delays
- **UI Rendering** - Measures waypoint table rendering performance
- **Memory Usage** - Reports JavaScript heap usage (Chrome only)

### 👤 Manual Tests
- **UI Rendering** - Visual layout and responsiveness
- **GPX Upload** - File upload, parsing, and visualization
- **Waypoint Management** - Adding, editing, deleting waypoints
- **Route Modifications** - Drawing, editing, reversing routes
- **Export Functionality** - GPX and Excel export features
- **Elevation System** - Local SRTM and API fallback testing
- **Time Calculations** - Speed settings and time estimates

## 🏗️ Test Scenarios

### Basic Workflow Test
1. Upload `simple-route.gpx`
2. Verify route appears on map
3. Check elevation profile renders
4. Confirm waypoints display in table
5. Test basic statistics calculation

### Elevation System Test
1. Upload `no-elevation-route.gpx`
2. Verify loading overlay appears
3. Check elevation data is fetched
4. Confirm elevation profile updates
5. Test local SRTM data (if available)

### Route Modification Test
1. Upload `complex-route.gpx`
2. Add custom waypoints by clicking map
3. Test route reversal
4. Try drawing new route segments
5. Export modified route and verify

### Performance Test
1. Upload large GPX files (if available)
2. Monitor loading times
3. Check memory usage
4. Test responsiveness during operations

## 🔧 Adding New Tests

### Automated Tests
Add new test cases to `test-runner.js`:

```javascript
test('Test Name', function() {
    // Test logic here
    if (condition) {
        throw new Error('Test failed');
    }
});
```

### Manual Tests
Add new test cases to `test-suite.html` in the manual tests section.

### Sample Data
Add new GPX files to `test-data/` directory following the naming convention.

## 📊 Test Results

Tests generate reports showing:
- ✅ **PASS** - Test completed successfully
- ❌ **FAIL** - Test failed with error details
- ⏳ **MANUAL** - Requires human verification

## 🐛 Debugging Failed Tests

1. Check browser console for JavaScript errors
2. Verify all script files are loaded correctly
3. Check network requests for API failures
4. Validate GPX file format and content
5. Test with different browsers

## 📈 Coverage

Current test coverage includes:
- Core utility functions (80%)
- GPX parsing (70%)
- UI interactions (50%)
- Route processing (60%)
- Export functionality (40%)

## 🤝 Contributing

When adding new features:
1. Add corresponding tests
2. Update test documentation
3. Ensure all tests pass
4. Add sample data if needed

## 📞 Support

For test-related issues:
1. Check the test output for error details
2. Verify test environment setup
3. Review browser compatibility
4. Check for missing dependencies
