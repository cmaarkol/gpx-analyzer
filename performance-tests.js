/**
 * GPX Route Analyzer - Performance Test Suite
 *
 * Tests application performance with different GPX file sizes
 * and operation complexity levels.
 */

(function() {
    'use strict';

    const performance = {
        results: {},
        startTime: null,
        endTime: null,

        start: function(testName) {
            this.startTime = performance.now();
            console.log(`⏱️  Starting: ${testName}`);
        },

        end: function(testName) {
            this.endTime = performance.now();
            const duration = this.endTime - this.startTime;
            this.results[testName] = duration;
            console.log(`✅ Completed: ${testName} (${duration.toFixed(2)}ms)`);
            return duration;
        },

        report: function() {
            console.log('\n📊 Performance Test Results:');
            console.log('=====================================');

            let totalTime = 0;
            for (const [test, time] of Object.entries(this.results)) {
                console.log(`${test.padEnd(30)}: ${time.toFixed(2).padStart(8)}ms`);
                totalTime += time;
            }

            console.log('=====================================');
            console.log(`Total Time${''.padEnd(22)}: ${totalTime.toFixed(2).padStart(8)}ms`);
            console.log(`Average Time${''.padEnd(20)}: ${(totalTime / Object.keys(this.results).length).toFixed(2).padStart(8)}ms`);
        }
    };

    // Generate test GPX data of various sizes
    function generateTestGPX(pointCount, includeElevation = true) {
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="Performance Test">\n';
        gpx += '  <trk>\n';
        gpx += '    <trkseg>\n';

        // Generate track points
        const baseLat = 22.3193;
        const baseLon = 114.1694;
        const latStep = 0.001; // ~100m steps
        const lonStep = 0.001;

        for (let i = 0; i < pointCount; i++) {
            const lat = baseLat + (i * latStep);
            const lon = baseLon + (i * lonStep);
            const ele = includeElevation ? 100 + (i * 2) : '';

            gpx += `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">\n`;
            if (includeElevation) {
                gpx += `        <ele>${ele.toFixed(1)}</ele>\n`;
            }
            gpx += '      </trkpt>\n';
        }

        gpx += '    </trkseg>\n';
        gpx += '  </trk>\n';
        gpx += '</gpx>\n';

        return gpx;
    }

    // Mock DOM elements for testing
    function setupMockDOM() {
        if (typeof document === 'undefined') {
            global.document = {
                createElement: () => ({
                    style: {},
                    classList: {
                        add: () => {},
                        remove: () => {},
                        contains: () => false
                    },
                    appendChild: () => {},
                    setAttribute: () => {}
                }),
                getElementById: () => ({
                    style: {},
                    textContent: '',
                    innerHTML: '',
                    appendChild: () => {},
                    addEventListener: () => {}
                }),
                body: {
                    appendChild: () => {}
                }
            };
        }
    }

    // Test GPX parsing performance
    function testGPXParsing() {
        const testCases = [
            { name: 'Small GPX (10 points)', points: 10 },
            { name: 'Medium GPX (100 points)', points: 100 },
            { name: 'Large GPX (1000 points)', points: 1000 },
            { name: 'Very Large GPX (5000 points)', points: 5000 }
        ];

        testCases.forEach(testCase => {
            performance.start(`Parse ${testCase.name}`);

            const gpxContent = generateTestGPX(testCase.points);

            // Mock GPX parsing (simplified for performance testing)
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
            const trackPoints = xmlDoc.getElementsByTagName('trkpt');

            // Simulate processing
            const points = [];
            for (let i = 0; i < trackPoints.length; i++) {
                points.push({
                    lat: parseFloat(trackPoints[i].getAttribute('lat')),
                    lon: parseFloat(trackPoints[i].getAttribute('lon')),
                    ele: 100 + (i * 2)
                });
            }

            performance.end(`Parse ${testCase.name}`);
        });
    }

    // Test route processing performance
    function testRouteProcessing() {
        const testCases = [
            { name: 'Small Route (10 points)', points: 10 },
            { name: 'Medium Route (100 points)', points: 100 },
            { name: 'Large Route (1000 points)', points: 1000 }
        ];

        testCases.forEach(testCase => {
            // Generate test data
            const points = [];
            for (let i = 0; i < testCase.points; i++) {
                points.push({
                    lat: 22.3193 + (i * 0.001),
                    lon: 114.1694 + (i * 0.001),
                    ele: 100 + (i * 2)
                });
            }

            performance.start(`Process ${testCase.name}`);

            // Simulate route processing (distance, elevation calculations)
            let totalDistance = 0;
            let totalGain = 0;
            let totalLoss = 0;

            for (let i = 0; i < points.length; i++) {
                points[i].distance = totalDistance;

                if (i > 0) {
                    // Calculate distance (simplified)
                    const dist = haversineDistance(
                        points[i-1].lat, points[i-1].lon,
                        points[i].lat, points[i].lon
                    );
                    totalDistance += dist;

                    // Calculate elevation change
                    const eleDiff = points[i].ele - points[i-1].ele;
                    if (eleDiff > 0) {
                        totalGain += eleDiff;
                    } else {
                        totalLoss += Math.abs(eleDiff);
                    }
                }
            }

            performance.end(`Process ${testCase.name}`);
        });
    }

    // Test elevation API simulation
    function testElevationFetching() {
        const testCases = [
            { name: 'Small Elevation Fetch (10 points)', points: 10 },
            { name: 'Medium Elevation Fetch (50 points)', points: 50 },
            { name: 'Large Elevation Fetch (100 points)', points: 100 }
        ];

        testCases.forEach(testCase => {
            performance.start(`Fetch Elevation ${testCase.name}`);

            // Simulate API calls (with delays)
            const promises = [];
            for (let i = 0; i < testCase.points; i++) {
                promises.push(new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ elevation: 100 + (i * 2) });
                    }, Math.random() * 100); // Simulate network delay
                }));
            }

            // Wait for all elevation fetches to complete
            Promise.all(promises).then(() => {
                performance.end(`Fetch Elevation ${testCase.name}`);
            });
        });
    }

    // Test UI rendering performance
    function testUIRendering() {
        const testCases = [
            { name: 'Small UI Render (10 waypoints)', waypoints: 10 },
            { name: 'Medium UI Render (50 waypoints)', waypoints: 50 },
            { name: 'Large UI Render (100 waypoints)', waypoints: 100 }
        ];

        testCases.forEach(testCase => {
            performance.start(`Render UI ${testCase.name}`);

            // Simulate waypoint table rendering
            let tableHTML = '<table>';
            for (let i = 0; i < testCase.waypoints; i++) {
                tableHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>Waypoint ${i + 1}</td>
                        <td>${(22.3193 + i * 0.001).toFixed(6)}</td>
                        <td>${(114.1694 + i * 0.001).toFixed(6)}</td>
                        <td>${(i * 0.1).toFixed(2)} km</td>
                        <td>${(100 + i * 2).toFixed(1)} m</td>
                    </tr>
                `;
            }
            tableHTML += '</table>';

            performance.end(`Render UI ${testCase.name}`);
        });
    }

    // Memory usage estimation
    function testMemoryUsage() {
        if (typeof performance.memory !== 'undefined') {
            console.log('\n🧠 Memory Usage:');
            console.log(`Used JS Heap: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Total JS Heap: ${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Heap Limit: ${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
        }
    }

    // Run all performance tests
    function runPerformanceTests() {
        console.log('🚀 Running GPX Route Analyzer Performance Tests\n');

        setupMockDOM();

        // Run synchronous tests
        testGPXParsing();
        testRouteProcessing();
        testUIRendering();

        // Run asynchronous tests
        testElevationFetching();

        // Wait a bit for async tests to complete, then report
        setTimeout(() => {
            performance.report();
            testMemoryUsage();
        }, 2000);
    }

    // Export for use in different environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { runPerformanceTests, generateTestGPX };
    } else if (typeof window !== 'undefined') {
        window.GPXPerformanceTests = { runPerformanceTests, generateTestGPX };
    }

    // Auto-run if this script is executed directly
    if (typeof window !== 'undefined' && window.location) {
        // Running in browser
        runPerformanceTests();
    } else if (typeof require !== 'undefined' && require.main === module) {
        // Running in Node.js
        runPerformanceTests();
    }

})();
