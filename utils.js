// utils.js - Utility functions for GPX Analyzer

// Global variables
let routeData = null;
let originalRouteData = null; // Store original uploaded GPX data for reset
let currentGpxFilename = null; // Store current GPX filename
let map = null;
let elevationChart = null;
let routeLayer = null;
let waypointMarkers = [];
let elevationSource = 'Unknown';
let activeWaypointIndex = null;
let originalTrackPoints = [];
let currentTrackPoints = [];
let baselineTrackPoints = [];
let baseGpxWaypoints = [];
let customWaypoints = [];
let customWaypointIdCounter = 1;
let originalHasElevation = false;
let isRouteReversed = false;
let shouldResetMapView = false;
let hoverMarker = null; // Global hover marker for map synchronization
let chartHoverLine = null; // Global hover line for chart synchronization

// Multi-GPX support
let loadedGPXFiles = []; // Array of {name, points, waypoints}
let selectedGPXIndex = 0; // Index of currently displayed GPX file

function showLoadingMessage(message) {
    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const loadingContent = document.createElement('div');
        loadingContent.style.cssText = `
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        `;

        const messageElement = document.createElement('div');
        messageElement.id = 'loading-message';
        messageElement.style.cssText = `
            font-size: 1.1rem;
            color: #333;
            font-weight: 500;
        `;

        loadingContent.appendChild(spinner);
        loadingContent.appendChild(messageElement);
        loadingOverlay.appendChild(loadingContent);
        document.body.appendChild(loadingOverlay);
    }

    const messageElement = document.getElementById('loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }

    loadingOverlay.style.display = 'flex';
}

function updateLoadingMessage(message) {
    const messageElement = document.getElementById('loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

function hideLoadingMessage() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Distance and coordinate calculations
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Time calculations and formatting
function calculateEstimatedTime() {
    const flatSpeed = parseFloat(document.getElementById('flat-speed').value); // km/h
    const climbRate = parseFloat(document.getElementById('climb-speed').value); // m/h vertical

    let totalTime = 0; // in hours

    for (let i = 1; i < routeData.points.length; i++) {
        const prevPoint = routeData.points[i - 1];
        const currentPoint = routeData.points[i];

        const segmentDistance = currentPoint.distance - prevPoint.distance; // km
        const elevationDiff = currentPoint.ele - prevPoint.ele; // meters

        // Time for horizontal distance
        const horizontalTime = segmentDistance / flatSpeed;

        // Time for elevation gain (only positive elevation changes)
        let elevationTime = 0;
        if (elevationDiff > 0) {
            elevationTime = elevationDiff / climbRate;
        }

        // Total time is the sum of both components
        totalTime += horizontalTime + elevationTime;
    }

    return totalTime;
}

function calculateEstimatedTimeToPoint(targetDistance) {
    const flatSpeed = parseFloat(document.getElementById('flat-speed').value); // km/h
    const climbRate = parseFloat(document.getElementById('climb-speed').value); // m/h vertical

    let totalTime = 0; // in hours

    for (let i = 1; i < routeData.points.length; i++) {
        const prevPoint = routeData.points[i - 1];
        const currentPoint = routeData.points[i];

        if (currentPoint.distance > targetDistance) {
            // Interpolate for the exact distance
            const ratio = (targetDistance - prevPoint.distance) / (currentPoint.distance - prevPoint.distance);
            const segmentDistance = targetDistance - prevPoint.distance;
            const elevationDiff = (currentPoint.ele - prevPoint.ele) * ratio;

            const horizontalTime = segmentDistance / flatSpeed;
            let elevationTime = 0;
            if (elevationDiff > 0) {
                elevationTime = elevationDiff / climbRate;
            }
            totalTime += horizontalTime + elevationTime;
            break;
        }

        const segmentDistance = currentPoint.distance - prevPoint.distance;
        const elevationDiff = currentPoint.ele - prevPoint.ele;

        const horizontalTime = segmentDistance / flatSpeed;
        let elevationTime = 0;
        if (elevationDiff > 0) {
            elevationTime = elevationDiff / climbRate;
        }
        totalTime += horizontalTime + elevationTime;
    }

    return totalTime;
}

function formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}

function recalculateEstimatedTime() {
    const estimatedTime = calculateEstimatedTime();
    document.getElementById('estimated-time').textContent = formatTime(estimatedTime);
    // Re-render waypoints table to update time calculations
    renderWaypointsTable();
}

// Data manipulation utilities
function cloneTrackPoints(points) {
    return points.map(point => ({ ...point }));
}

function findNearestTrackPoint(trackPoints, lat, lon) {
    let minDistance = Infinity;
    let nearestPoint = trackPoints[0];

    for (const point of trackPoints) {
        const distance = haversineDistance(lat, lon, point.lat, point.lon);
        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = point;
        }
    }

    return nearestPoint;
}
