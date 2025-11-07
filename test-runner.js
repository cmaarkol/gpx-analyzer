/**
 * GPX Route Analyzer - Automated Test Runner
 *
 * This file contains automated tests for the core functionality
 * of the GPX Route Analyzer application.
 *
 * Run with: node test-runner.js (requires Node.js with jsdom)
 */

(function() {
    'use strict';

    // Test framework
    const tests = [];
    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        tests.push({ name, fn });
    }

    function runTests() {
        console.log('🧪 Running GPX Route Analyzer Tests\n');

        const runTest = (test) => {
            try {
                test.fn();
                console.log(`✅ PASS: ${test.name}`);
                passed++;
            } catch (error) {
                console.log(`❌ FAIL: ${test.name}`);
                console.log(`   Error: ${error.message}`);
                failed++;
            }
        };

        // Run tests sequentially
        tests.reduce((promise, test) => {
            return promise.then(() => runTest(test));
        }, Promise.resolve()).then(() => {
            console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
            if (failed === 0) {
                console.log('🎉 All tests passed!');
            }
        });
    }

    // Mock browser environment for testing
    function setupMockEnvironment() {
        if (typeof window === 'undefined') {
            // Running in Node.js - set up basic mocks
            global.window = {};
            global.document = {
                createElement: () => ({}),
                getElementById: () => null,
                addEventListener: () => {},
                body: { appendChild: () => {} }
            };
            global.DOMParser = class {
                parseFromString(xml) {
                    // Very basic XML mock for testing
                    return {
                        getElementsByTagName: (tagName) => {
                            if (tagName === 'trkpt') {
                                return xml.match(/<trkpt[^>]*>.*?<\/trkpt>/gs)?.map(() => ({
                                    getAttribute: (attr) => attr === 'lat' ? '22.3193' : '114.1694',
                                    getElementsByTagName: () => [{ textContent: '100' }]
                                })) || [];
                            }
                            return [];
                        }
                    };
                }
            };
        }
    }

    // Utility function tests
    test('Haversine distance calculation', function() {
        if (typeof haversineDistance !== 'function') {
            throw new Error('haversineDistance function not found');
        }

        // Test basic distance calculation
        const distance = haversineDistance(22.3193, 114.1694, 22.3264, 114.1776);
        if (typeof distance !== 'number' || distance <= 0) {
            throw new Error('Invalid distance calculation result');
        }

        // Test same point distance (should be 0)
        const samePointDistance = haversineDistance(22.3193, 114.1694, 22.3193, 114.1694);
        if (Math.abs(samePointDistance) > 0.001) {
            throw new Error('Same point distance should be 0');
        }
    });

    test('Coordinate validation', function() {
        // Test valid coordinates
        const validCoords = [
            [0, 0],
            [22.3193, 114.1694],
            [90, 180],
            [-90, -180]
        ];

        validCoords.forEach(([lat, lon]) => {
            if (lat < -90 || lat > 90) {
                throw new Error(`Invalid latitude: ${lat}`);
            }
            if (lon < -180 || lon > 180) {
                throw new Error(`Invalid longitude: ${lon}`);
            }
        });
    });

    test('Time formatting', function() {
        if (typeof formatTime !== 'function') {
            throw new Error('formatTime function not found');
        }

        // Test basic time formatting
        const formatted = formatTime(3661); // 1 hour, 1 minute, 1 second
        if (typeof formatted !== 'string') {
            throw new Error('formatTime should return a string');
        }
    });

    test('Elevation data processing', function() {
        // Test elevation array processing
        const elevations = [100, 120, 140, 160, 180];
        const gains = [];
        const losses = [];

        let totalGain = 0;
        let totalLoss = 0;

        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) {
                totalGain += diff;
                gains.push(diff);
            } else if (diff < 0) {
                totalLoss += Math.abs(diff);
                losses.push(Math.abs(diff));
            }
        }

        if (totalGain !== 80) {
            throw new Error(`Expected total gain of 80m, got ${totalGain}m`);
        }

        if (totalLoss !== 0) {
            throw new Error(`Expected total loss of 0m, got ${totalLoss}m`);
        }
    });

    test('Route data structure validation', function() {
        const mockRouteData = {
            points: [
                { lat: 22.3193, lon: 114.1694, ele: 100, distance: 0 },
                { lat: 22.3264, lon: 114.1776, ele: 120, distance: 1.0 },
                { lat: 22.3333, lon: 114.1857, ele: 140, distance: 2.0 }
            ],
            waypoints: [
                { lat: 22.3193, lon: 114.1694, ele: 100, name: 'Start', distance: 0, isStart: true },
                { lat: 22.3333, lon: 114.1857, ele: 140, name: 'End', distance: 2.0, isEnd: true }
            ],
            totalDistance: 2.0,
            totalGain: 40,
            totalLoss: 0
        };

        // Validate route data structure
        if (!Array.isArray(mockRouteData.points)) {
            throw new Error('Route points should be an array');
        }

        if (!Array.isArray(mockRouteData.waypoints)) {
            throw new Error('Route waypoints should be an array');
        }

        if (mockRouteData.points.length === 0) {
            throw new Error('Route should have at least one point');
        }

        if (mockRouteData.waypoints.length === 0) {
            throw new Error('Route should have at least one waypoint');
        }

        // Validate waypoint types
        const hasStart = mockRouteData.waypoints.some(wp => wp.isStart);
        const hasEnd = mockRouteData.waypoints.some(wp => wp.isEnd);

        if (!hasStart) {
            throw new Error('Route should have a start waypoint');
        }

        if (!hasEnd) {
            throw new Error('Route should have an end waypoint');
        }
    });

    test('GPX parsing basic structure', function() {
        const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <trk>
    <trkseg>
      <trkpt lat="22.3193" lon="114.1694"><ele>100</ele></trkpt>
      <trkpt lat="22.3264" lon="114.1776"><ele>120</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

        if (typeof DOMParser !== 'undefined') {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
            const trackPoints = xmlDoc.getElementsByTagName('trkpt');

            if (trackPoints.length !== 2) {
                throw new Error(`Expected 2 track points, got ${trackPoints.length}`);
            }
        }
    });

    test('Waypoint management logic', function() {
        // Test waypoint addition logic
        const baseWaypoints = [
            { lat: 22.3193, lon: 114.1694, name: 'Start', isStart: true },
            { lat: 22.3333, lon: 114.1857, name: 'End', isEnd: true }
        ];

        // Simulate adding a waypoint
        const newWaypoint = {
            lat: 22.3264,
            lon: 114.1776,
            name: 'Mid Point',
            isCustom: true
        };

        const updatedWaypoints = [...baseWaypoints, newWaypoint];

        if (updatedWaypoints.length !== 3) {
            throw new Error('Waypoint addition failed');
        }

        if (!updatedWaypoints.find(wp => wp.isCustom)) {
            throw new Error('Custom waypoint not found');
        }
    });

    test('Time calculation validation', function() {
        // Test basic time calculation logic
        const flatSpeed = 5; // km/h
        const climbRate = 300; // m/h

        const segmentDistance = 1.0; // 1 km
        const elevationGain = 50; // 50 meters

        // Calculate horizontal time
        const horizontalTime = segmentDistance / flatSpeed; // hours

        // Calculate elevation time
        const elevationTime = elevationGain / climbRate; // hours

        // Total time is the maximum of horizontal and elevation time
        const totalTime = Math.max(horizontalTime, elevationTime);

        if (totalTime <= 0) {
            throw new Error('Invalid time calculation');
        }

        // Elevation time should be greater than horizontal time in this case
        if (elevationTime <= horizontalTime) {
            throw new Error('Elevation time should dominate in steep terrain');
        }
    });

    // Setup and run tests
    setupMockEnvironment();
    runTests();

})();
