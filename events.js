// events.js - Event handlers for user interactions

async function handleMultipleGPXUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    loadedGPXFiles = []; // Clear previous files
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = async function(e) {
            const gpxContent = e.target.result;
            await parseGPXForMultiUpload(gpxContent, file.name);
        };
        reader.readAsText(file);
    }
}

async function parseGPX(gpxContent, filename) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');

    // Extract track points
    const trackPoints = [];
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    let hasElevation = false;

    for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat'));
        const lon = parseFloat(trkpts[i].getAttribute('lon'));
        const eleNode = trkpts[i].getElementsByTagName('ele')[0];
        const ele = eleNode ? parseFloat(eleNode.textContent) : null;

        if (ele !== null && ele !== 0) {
            hasElevation = true;
        }

        trackPoints.push({ lat, lon, ele });
    }

    if (trackPoints.length === 0) {
        alert('No track points found in the GPX file');
        return;
    }

    // Fetch elevation data if missing
    if (!hasElevation) {
        showLoadingMessage('Fetching elevation data...');
        await fetchElevationData(trackPoints);
        hideLoadingMessage();
    } else {
        elevationSource = 'GPX File';
    }

    // Extract waypoints from GPX
    const gpxWaypoints = [];
    const wpts = xmlDoc.getElementsByTagName('wpt');

    for (let i = 0; i < wpts.length; i++) {
        const lat = parseFloat(wpts[i].getAttribute('lat'));
        const lon = parseFloat(wpts[i].getAttribute('lon'));
        const eleNode = wpts[i].getElementsByTagName('ele')[0];
        const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
        const nameNode = wpts[i].getElementsByTagName('name')[0];
        const name = nameNode ? nameNode.textContent : `Waypoint ${i + 1}`;

        gpxWaypoints.push({ lat, lon, ele, name });
    }

    // Process the route data
    routeData = processRouteData(trackPoints, gpxWaypoints);

    // Store the original route data for reset functionality
    originalRouteData = {
        points: routeData.points.map(p => ({ ...p })),
        waypoints: routeData.waypoints.map(wp => ({ ...wp })),
        totalDistance: routeData.totalDistance,
        totalGain: routeData.totalGain,
        totalLoss: routeData.totalLoss
    };

    // Store and display the filename
    currentGpxFilename = filename.replace('.gpx', ''); // Remove .gpx extension
    updateFilenameDisplay();

    // Show content
    document.getElementById('content').classList.remove('hidden');

    // Update UI
    updateStatistics();
    renderMap(true); // Fit to bounds for new GPX file
    renderElevationChart();
    renderWaypointsTable();
}

function handleResetRoute() {
    if (!originalRouteData) {
        alert('No original route data available to reset to.');
        return;
    }

    // Restore the original route data
    routeData = {
        points: originalRouteData.points.map(p => ({ ...p })),
        waypoints: originalRouteData.waypoints.map(wp => ({ ...wp })),
        totalDistance: originalRouteData.totalDistance,
        totalGain: originalRouteData.totalGain,
        totalLoss: originalRouteData.totalLoss
    };

    // Reset other state variables that might have been modified
    activeWaypointIndex = null;
    customWaypoints = [];
    customWaypointIdCounter = 1;

    // Update UI
    updateStatistics();
    renderMap(true); // Fit to bounds when resetting
    renderElevationChart();
    renderWaypointsTable();
}

function handleReverseRoute() {
    if (!routeData) {
        return;
    }

    const reversed = reverseRouteData(routeData);

    // Remap waypoints to nearest points in reversed order to update distances and elevations accurately
    const remappedWaypoints = reversed.waypoints.map(wp => {
        const nearestPoint = findNearestTrackPoint(reversed.points, wp.lat, wp.lon);
        return {
            ...wp,
            distance: nearestPoint.distance,
            gain: nearestPoint.gain,
            loss: nearestPoint.loss,
            ele: nearestPoint.ele
        };
    });

    // Ensure start and end waypoints are properly maintained
    const finalWaypoints = ensureStartEndWaypoints(remappedWaypoints, reversed.points);

    routeData = {
        ...reversed,
        waypoints: finalWaypoints
    };

    activeWaypointIndex = null;

    updateStatistics();
    renderMap();
    renderElevationChart();
    renderWaypointsTable();
}


function deleteWaypoint(index) {
    const waypoint = routeData.waypoints[index];

    // If deleting start or end waypoint, we need to truncate the route
    if (waypoint && (waypoint.isStart || waypoint.isEnd)) {
        if (waypoint.isStart) {
            // Deleting start - find next waypoint and make it the new start
            if (routeData.waypoints.length <= 2) {
                alert('Cannot delete start waypoint when there are only 2 waypoints total.');
                return;
            }

            // Find the next waypoint (should be the one after start)
            const newStartIndex = 1;
            const newStartWaypoint = routeData.waypoints[newStartIndex];

            // Truncate route from the beginning up to new start point
            const newStartPointIndex = routeData.points.findIndex(p =>
                Math.abs(p.distance - newStartWaypoint.distance) < 0.001
            );

            if (newStartPointIndex > 0) {
                // Recalculate route data starting from new start point
                routeData = truncateRouteFromStart(newStartPointIndex);

                // Make the waypoint that is now at the beginning the start waypoint
                if (routeData.waypoints.length > 0) {
                    routeData.waypoints[0].isStart = true;
                    routeData.waypoints[0].name = 'Start'; // Ensure it has the right name
                }
            }
        } else if (waypoint.isEnd) {
            // Deleting end - find previous waypoint and make it the new end
            if (routeData.waypoints.length <= 2) {
                alert('Cannot delete end waypoint when there are only 2 waypoints total.');
                return;
            }

            // Find the previous waypoint (should be the one before end)
            const newEndIndex = routeData.waypoints.length - 2;
            const newEndWaypoint = routeData.waypoints[newEndIndex];

            // Truncate route from the end back to new end point
            const newEndPointIndex = routeData.points.findIndex(p =>
                Math.abs(p.distance - newEndWaypoint.distance) < 0.001
            );

            if (newEndPointIndex >= 0 && newEndPointIndex < routeData.points.length - 1) {
                // Recalculate route data ending at new end point
                routeData = truncateRouteFromEnd(newEndPointIndex);

                // Make the waypoint that is now at the end the end waypoint
                if (routeData.waypoints.length > 0) {
                    routeData.waypoints[routeData.waypoints.length - 1].isEnd = true;
                    routeData.waypoints[routeData.waypoints.length - 1].name = 'End'; // Ensure it has the right name
                }
            }
        }
    } else {
        // Regular waypoint deletion
        routeData.waypoints.splice(index, 1);

        // Ensure start and end waypoints are properly maintained after deletion
        routeData.waypoints = ensureStartEndWaypoints(routeData.waypoints, routeData.points);
    }

    // Re-render everything
    renderMap();
    renderElevationChart();
    renderWaypointsTable();
}

function addWaypointFromMapClick(lat, lon) {
    // Find nearest point on the route
    const nearestPoint = findNearestTrackPoint(routeData.points, lat, lon);

    // Create new waypoint
    const newWaypoint = {
        ...nearestPoint,
        name: '',
        isCustom: true
    };

    // Add to waypoints array
    routeData.waypoints.push(newWaypoint);

    // Ensure start and end waypoints are properly maintained
    routeData.waypoints = ensureStartEndWaypoints(routeData.waypoints, routeData.points);

    // Re-render everything
    renderMap();
    renderElevationChart();
    renderWaypointsTable();
}

function addWaypointFromChartClick(distance) {
    // Find the nearest point at this distance
    let nearestPoint = routeData.points[0];
    let minDiff = Math.abs(routeData.points[0].distance - distance);

    for (const point of routeData.points) {
        const diff = Math.abs(point.distance - distance);
        if (diff < minDiff) {
            minDiff = diff;
            nearestPoint = point;
        }
    }

    // Create new waypoint
    const newWaypoint = {
        ...nearestPoint,
        name: '',
        isCustom: true
    };

    // Add to waypoints array
    routeData.waypoints.push(newWaypoint);

    // Ensure start and end waypoints are properly maintained
    routeData.waypoints = ensureStartEndWaypoints(routeData.waypoints, routeData.points);

    // Re-render everything
    renderMap();
    renderElevationChart();
    renderWaypointsTable();
}

function exportWaypointsExcel() {
    if (!routeData || !routeData.waypoints || routeData.waypoints.length === 0) {
        alert('No waypoints available to export.');
        return;
    }

    // Create CSV header
    let csvContent = 'Number,Name,Latitude,Longitude,Segment Distance (km),Elevation (m),Cumulative Distance (km),Cumulative Gain (m),Cumulative Loss (m),Segment Time,Cumulative Time,Type\n';

    // Add waypoint data
    routeData.waypoints.forEach((wp, index) => {
        const segmentDistance = index === 0 ? 0 : wp.distance - routeData.waypoints[index - 1].distance;
        const prevDistance = index === 0 ? 0 : routeData.waypoints[index - 1].distance;
        const estimatedTime = calculateEstimatedTimeToPoint(wp.distance);
        const segmentTime = index === 0 ? 0 : estimatedTime - calculateEstimatedTimeToPoint(prevDistance);

        const waypointType = wp.isStart ? 'Start' : (wp.isEnd ? 'End' : 'Waypoint');

        // Escape commas and quotes in the name
        const escapedName = (wp.name || `Waypoint ${index + 1}`).replace(/"/g, '""');

        const rowData = [
            index + 1,
            `"${escapedName}"`,
            wp.lat.toFixed(6),
            wp.lon.toFixed(6),
            segmentDistance.toFixed(2),
            wp.ele.toFixed(1),
            wp.distance.toFixed(2),
            wp.gain.toFixed(0),
            wp.loss.toFixed(0),
            `"${formatTime(segmentTime)}"`,
            `"${formatTime(estimatedTime)}"`,
            waypointType
        ];

        csvContent += rowData.join(',') + '\n';
    });

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waypoints_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportWaypointsTable() {
    if (!routeData || !routeData.waypoints || routeData.waypoints.length === 0) {
        alert('No waypoints available to export.');
        return;
    }

    // Create table data as comment
    let tableComment = '\n<!-- WAYPOINT TABLE\n';
    tableComment += '================================================================================\n';
    tableComment += ' # | Name                    | Seg Dist | Elev | Cumul Dist | Gain/Loss | Time  |\n';
    tableComment += '================================================================================\n';

    routeData.waypoints.forEach((wp, index) => {
        const segmentDistance = index === 0 ? 0 : wp.distance - routeData.waypoints[index - 1].distance;
        const prevDistance = index === 0 ? 0 : routeData.waypoints[index - 1].distance;
        const estimatedTime = calculateEstimatedTimeToPoint(wp.distance);
        const segmentTime = index === 0 ? 0 : estimatedTime - calculateEstimatedTimeToPoint(prevDistance);

        const name = (wp.name || `Waypoint ${index + 1}`).padEnd(23).substring(0, 23);
        const segDist = segmentDistance.toFixed(2).padStart(8);
        const elev = wp.ele.toFixed(0).padStart(4);
        const cumDist = wp.distance.toFixed(2).padStart(10);
        const gainLoss = `+${wp.gain.toFixed(0)}/-${wp.loss.toFixed(0)}`.padStart(9);
        const time = formatTime(segmentTime).padStart(6);

        tableComment += ` ${String(index + 1).padStart(2)} | ${name} | ${segDist} | ${elev} | ${cumDist} | ${gainLoss} | ${time} |\n`;
    });
    tableComment += '================================================================================\n';
    tableComment += '-->\n';

    // Create GPX content
    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>${tableComment}
<gpx version="1.1" creator="GPX Route Analyzer" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Route and Waypoints Export</name>
    <desc>Exported route and waypoints from GPX Route Analyzer</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
`;

    // Add route track
    gpxContent += `
  <trk>
    <name>Route Track</name>
    <desc>Main route track with elevation data</desc>
    <trkseg>
`;

    // Add all track points from routeData.points
    if (routeData.points && routeData.points.length > 0) {
        routeData.points.forEach(point => {
            gpxContent += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <ele>${point.ele.toFixed(1)}</ele>
      </trkpt>
`;
        });
    }

    gpxContent += `    </trkseg>
  </trk>
`;

    // Add waypoints
    routeData.waypoints.forEach((wp, index) => {
        const waypointType = wp.isStart ? 'Start' : (wp.isEnd ? 'End' : 'Waypoint');
        gpxContent += `
  <wpt lat="${wp.lat}" lon="${wp.lon}">
    <ele>${wp.ele.toFixed(1)}</ele>
    <name>${wp.name || `Waypoint ${index + 1}`}</name>
    <desc>${waypointType} - Distance: ${wp.distance.toFixed(2)} km, Elevation: ${wp.ele.toFixed(0)} m</desc>
    <type>${waypointType}</type>
  </wpt>`;
    });

    gpxContent += `
</gpx>`;

    // Create and download the GPX file
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route_waypoints_${new Date().toISOString().split('T')[0]}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
