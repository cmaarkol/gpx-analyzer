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
