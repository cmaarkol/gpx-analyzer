// route.js - Route processing and waypoint management

function cloneTrackPoints(points) {
    return points.map(point => ({ ...point }));
}

function buildRouteDataFromPoints(trackPoints) {
    const gpxWaypoints = baseGpxWaypoints.map(wp => ({ ...wp }));
    let data = processRouteData(trackPoints, gpxWaypoints);

    if (customWaypoints.length > 0) {
        const customEntries = customWaypoints.map(custom => {
            const nearestPoint = findNearestTrackPoint(data.points, custom.lat, custom.lon);
            return {
                ...nearestPoint,
                name: custom.name && custom.name.trim() ? custom.name : `Custom ${custom.id}`,
                isCustom: true,
                customId: custom.id
            };
        });
        data.waypoints = [...data.waypoints, ...customEntries].sort((a, b) => a.distance - b.distance);
    }

    return data;
}

function processRouteData(trackPoints, gpxWaypoints) {
    // Calculate distances and cumulative values
    let cumulativeDistance = 0;
    let cumulativeGain = 0;
    let cumulativeLoss = 0;

    const processedPoints = trackPoints.map((point, index) => {
        if (index > 0) {
            const prevPoint = trackPoints[index - 1];
            const distance = haversineDistance(
                prevPoint.lat, prevPoint.lon,
                point.lat, point.lon
            );
            cumulativeDistance += distance;

            const elevationDiff = point.ele - prevPoint.ele;
            if (elevationDiff > 0) {
                cumulativeGain += elevationDiff;
            } else {
                cumulativeLoss += Math.abs(elevationDiff);
            }
        }

        return {
            ...point,
            distance: cumulativeDistance,
            gain: cumulativeGain,
            loss: cumulativeLoss
        };
    });

    // Determine waypoints
    let waypoints = [];

    if (gpxWaypoints.length > 0) {
        // Use GPX waypoints and find nearest track points
        waypoints = gpxWaypoints.map(wp => {
            const nearestPoint = findNearestTrackPoint(processedPoints, wp.lat, wp.lon);
            return {
                name: wp.name,
                ...nearestPoint
            };
        });
    } else {
        // Generate waypoints: start, peaks, and end
        waypoints = generateWaypoints(processedPoints);
    }

    // Ensure start and end waypoints always exist
    waypoints = ensureStartEndWaypoints(waypoints, processedPoints);

    return {
        points: processedPoints,
        waypoints: waypoints,
        totalDistance: cumulativeDistance,
        totalGain: cumulativeGain,
        totalLoss: cumulativeLoss
    };
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

// Helper function to ensure start and end waypoints exist
function ensureStartEndWaypoints(waypoints, processedPoints) {
    // Always ensure we have start and end waypoints at correct positions
    // Remove any existing start/end waypoints first
    const filteredWaypoints = waypoints.filter(wp => !wp.isStart && !wp.isEnd);

    // Add start waypoint
    const startWaypoint = {
        name: 'Start',
        ...processedPoints[0],
        isStart: true
    };
    filteredWaypoints.unshift(startWaypoint);

    // Add end waypoint
    const endWaypoint = {
        name: 'End',
        ...processedPoints[processedPoints.length - 1],
        isEnd: true
    };
    filteredWaypoints.push(endWaypoint);

    // Sort waypoints by distance (this will put start at 0 and end at max distance)
    filteredWaypoints.sort((a, b) => a.distance - b.distance);

    // Re-assign isStart and isEnd flags based on position to be extra sure
    filteredWaypoints.forEach((wp, idx) => {
        wp.isStart = idx === 0;
        wp.isEnd = idx === filteredWaypoints.length - 1;
    });

    return filteredWaypoints;
}

function generateWaypoints(processedPoints) {
    const waypoints = [];

    // Add start point
    waypoints.push({
        name: 'Start',
        ...processedPoints[0],
        isStart: true
    });

    // Add end point
    waypoints.push({
        name: 'End',
        ...processedPoints[processedPoints.length - 1],
        isEnd: true
    });

    return waypoints;
}

function findPeaks(points, threshold = 50) {
    const peaks = [];
    const windowSize = Math.max(5, Math.floor(points.length / 50));

    for (let i = windowSize; i < points.length - windowSize; i++) {
        const currentEle = points[i].ele;
        let isPeak = true;

        // Check if it's higher than surrounding points
        for (let j = i - windowSize; j <= i + windowSize; j++) {
            if (j !== i && points[j].ele > currentEle) {
                isPeak = false;
                break;
            }
        }

        // Check if the peak is significant enough
        if (isPeak) {
            const leftEle = points[i - windowSize].ele;
            const rightEle = points[i + windowSize].ele;
            if (currentEle - leftEle >= threshold || currentEle - rightEle >= threshold) {
                peaks.push(points[i]);
            }
        }
    }

    return peaks;
}

function reverseRouteData(data) {
    const reversedPoints = data.points.slice().reverse().map(point => ({ ...point }));

    // Reset cumulative fields before recalculating
    reversedPoints.forEach(point => {
        point.distance = 0;
        point.gain = 0;
        point.loss = 0;
    });

    let cumulativeDistance = 0;
    let cumulativeGain = 0;
    let cumulativeLoss = 0;

    for (let i = 1; i < reversedPoints.length; i++) {
        const prev = reversedPoints[i - 1];
        const current = reversedPoints[i];

        const segmentDistance = haversineDistance(prev.lat, prev.lon, current.lat, current.lon);
        cumulativeDistance += segmentDistance;

        const elevationDiff = current.ele - prev.ele;
        if (elevationDiff > 0) {
            cumulativeGain += elevationDiff;
        } else {
            cumulativeLoss += Math.abs(elevationDiff);
        }

        current.distance = cumulativeDistance;
        current.gain = cumulativeGain;
        current.loss = cumulativeLoss;
    }

    const reversedWaypoints = data.waypoints.slice().reverse().map(wp => ({ ...wp }));

    return {
        points: reversedPoints,
        waypoints: reversedWaypoints,
        totalDistance: cumulativeDistance,
        totalGain: cumulativeGain,
        totalLoss: cumulativeLoss
    };
}

function truncateRouteFromStart(newStartPointIndex) {
    // Truncate the route from the beginning up to newStartPointIndex
    const truncatedPoints = routeData.points.slice(newStartPointIndex);

    // Recalculate distances and elevations for the truncated route
    let cumulativeDistance = 0;
    let cumulativeGain = 0;
    let cumulativeLoss = 0;

    const recalculatedPoints = truncatedPoints.map((point, index) => {
        if (index > 0) {
            const prevPoint = truncatedPoints[index - 1];
            const distance = haversineDistance(
                prevPoint.lat, prevPoint.lon,
                point.lat, point.lon
            );
            cumulativeDistance += distance;

            const elevationDiff = point.ele - prevPoint.ele;
            if (elevationDiff > 0) {
                cumulativeGain += elevationDiff;
            } else {
                cumulativeLoss += Math.abs(elevationDiff);
            }
        }

        return {
            ...point,
            distance: cumulativeDistance,
            gain: cumulativeGain,
            loss: cumulativeLoss
        };
    });

    // Update waypoints to match the truncated route
    const updatedWaypoints = routeData.waypoints
        .map(wp => {
            const nearestPoint = findNearestTrackPoint(recalculatedPoints, wp.lat, wp.lon);
            return {
                ...wp,
                ...nearestPoint
            };
        })
        .filter(wp => wp.distance >= 0 && wp.distance <= recalculatedPoints[recalculatedPoints.length - 1].distance)
        .sort((a, b) => a.distance - b.distance);

    // Ensure start and end waypoints
    const finalWaypoints = ensureStartEndWaypoints(updatedWaypoints, recalculatedPoints);

    return {
        points: recalculatedPoints,
        waypoints: finalWaypoints,
        totalDistance: cumulativeDistance,
        totalGain: cumulativeGain,
        totalLoss: cumulativeLoss
    };
}

function truncateRouteFromEnd(newEndPointIndex) {
    // Truncate the route from newEndPointIndex to the end
    const truncatedPoints = routeData.points.slice(0, newEndPointIndex + 1);

    // Recalculate distances and elevations for the truncated route
    let cumulativeDistance = 0;
    let cumulativeGain = 0;
    let cumulativeLoss = 0;

    const recalculatedPoints = truncatedPoints.map((point, index) => {
        if (index > 0) {
            const prevPoint = truncatedPoints[index - 1];
            const distance = haversineDistance(
                prevPoint.lat, prevPoint.lon,
                point.lat, point.lon
            );
            cumulativeDistance += distance;

            const elevationDiff = point.ele - prevPoint.ele;
            if (elevationDiff > 0) {
                cumulativeGain += elevationDiff;
            } else {
                cumulativeLoss += Math.abs(elevationDiff);
            }
        }

        return {
            ...point,
            distance: cumulativeDistance,
            gain: cumulativeGain,
            loss: cumulativeLoss
        };
    });

    // Update waypoints to match the truncated route
    const updatedWaypoints = routeData.waypoints
        .map(wp => {
            const nearestPoint = findNearestTrackPoint(recalculatedPoints, wp.lat, wp.lon);
            return {
                ...wp,
                ...nearestPoint
            };
        })
        .filter(wp => wp.distance >= 0 && wp.distance <= recalculatedPoints[recalculatedPoints.length - 1].distance)
        .sort((a, b) => a.distance - b.distance);

    // Ensure start and end waypoints
    const finalWaypoints = ensureStartEndWaypoints(updatedWaypoints, recalculatedPoints);

    return {
        points: recalculatedPoints,
        waypoints: finalWaypoints,
        totalDistance: cumulativeDistance,
        totalGain: cumulativeGain,
        totalLoss: cumulativeLoss
    };
}

function renameWaypoint(index, newName) {
    if (routeData && routeData.waypoints && routeData.waypoints[index]) {
        routeData.waypoints[index].name = newName.trim() || 'Custom waypoint';
        renderWaypointsTable();
    }
}
