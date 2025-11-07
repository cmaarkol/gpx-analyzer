// multi-gpx.js - Multi-GPX file handling and linking

async function parseGPXForMultiUpload(gpxContent, filename) {
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
        alert(`No track points found in ${filename}`);
        return;
    }

    // Fetch elevation data if missing
    if (!hasElevation) {
        showLoadingMessage(`Fetching elevation data for ${filename}...`);
        await fetchElevationData(trackPoints);
        hideLoadingMessage();
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

    // Store the GPX file data
    loadedGPXFiles.push({
        name: filename.replace('.gpx', ''),
        points: trackPoints,
        waypoints: gpxWaypoints
    });

    // Update UI to show loaded files
    updateGPXFilesList();
}

function updateGPXFilesList() {
    const container = document.getElementById('gpx-files-container');
    const section = document.getElementById('gpx-files-section');
    const linkingSection = document.getElementById('gpx-linking-section');

    if (loadedGPXFiles.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    // Build file list
    container.innerHTML = '';
    loadedGPXFiles.forEach((gpxFile, index) => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'gpx-file-item';
        fileDiv.innerHTML = `
            <div class="gpx-file-info">
                <strong>${gpxFile.name}</strong>
                <span class="gpx-file-stats">${gpxFile.points.length} points, ${gpxFile.waypoints.length} waypoints</span>
            </div>
            <button class="btn-secondary" onclick="selectGPXFile(${index})">View</button>
        `;
        container.appendChild(fileDiv);
    });

    // Show linking section if we have 2+ files
    if (loadedGPXFiles.length >= 2) {
        linkingSection.style.display = 'block';
        updateGPXFileSelects();
    }
}

function updateGPXFileSelects() {
    const select1 = document.getElementById('gpx-file-1');
    const select2 = document.getElementById('gpx-file-2');

    select1.innerHTML = '';
    select2.innerHTML = '';

    loadedGPXFiles.forEach((gpxFile, index) => {
        const option1 = document.createElement('option');
        option1.value = index;
        option1.textContent = gpxFile.name;
        if (index === 0) option1.selected = true;
        select1.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = index;
        option2.textContent = gpxFile.name;
        if (index === 1) option2.selected = true;
        select2.appendChild(option2);
    });
}

function selectGPXFile(index) {
    if (index < 0 || index >= loadedGPXFiles.length) return;

    selectedGPXIndex = index;
    const gpxFile = loadedGPXFiles[index];

    // Process and display the selected GPX file
    const processedData = processRouteData(gpxFile.points, gpxFile.waypoints);

    routeData = processedData;
    originalRouteData = {
        points: processedData.points.map(p => ({ ...p })),
        waypoints: processedData.waypoints.map(wp => ({ ...wp })),
        totalDistance: processedData.totalDistance,
        totalGain: processedData.totalGain,
        totalLoss: processedData.totalLoss
    };

    currentGpxFilename = gpxFile.name;
    updateFilenameDisplay();

    // Show content
    document.getElementById('content').classList.remove('hidden');

    // Update UI
    updateStatistics();
    renderMap(true);
    renderElevationChart();
    renderWaypointsTable();
}

function linkSelectedGPXFiles() {
    const file1Index = parseInt(document.getElementById('gpx-file-1').value);
    const point1 = document.getElementById('gpx-point-1').value; // 'start' or 'end'
    const file2Index = parseInt(document.getElementById('gpx-file-2').value);
    const point2 = document.getElementById('gpx-point-2').value; // 'start' or 'end'

    if (file1Index === file2Index) {
        alert('Please select two different GPX files to link');
        return;
    }

    const gpxFile1 = loadedGPXFiles[file1Index];
    const gpxFile2 = loadedGPXFiles[file2Index];

    // Get the connection points
    const points1 = gpxFile1.points;
    const points2 = gpxFile2.points;

    let startPoints1, endPoints1, startPoints2, endPoints2;

    // Determine which end of file1 to use
    if (point1 === 'start') {
        startPoints1 = points1;
    } else {
        startPoints1 = [...points1].reverse();
    }

    // Determine which end of file2 to use
    if (point2 === 'start') {
        startPoints2 = points2;
    } else {
        startPoints2 = [...points2].reverse();
    }

    // Combine the routes
    const linkedPoints = [...startPoints1, ...startPoints2];

    // Combine waypoints
    const linkedWaypoints = [...gpxFile1.waypoints, ...gpxFile2.waypoints];

    // Process the combined route
    const processedData = processRouteData(linkedPoints, linkedWaypoints);

    routeData = processedData;
    originalRouteData = {
        points: processedData.points.map(p => ({ ...p })),
        waypoints: processedData.waypoints.map(wp => ({ ...wp })),
        totalDistance: processedData.totalDistance,
        totalGain: processedData.totalGain,
        totalLoss: processedData.totalLoss
    };

    currentGpxFilename = `${gpxFile1.name} + ${gpxFile2.name}`;
    updateFilenameDisplay();

    // Show content
    document.getElementById('content').classList.remove('hidden');

    // Update UI
    updateStatistics();
    renderMap(true);
    renderElevationChart();
    renderWaypointsTable();

    alert(`Successfully linked ${gpxFile1.name} and ${gpxFile2.name}!`);
}
