// elevation.js - Elevation data fetching and processing

// SRTM tile cache
let srtmTileCache = {};

// SRTM Elevation Functions
async function loadSRTMTile(lat, lon) {
    const tileLat = Math.floor(lat);
    const tileLon = Math.floor(lon);
    const tileKey = `${tileLat}_${tileLon}`;

    // Return cached tile if available
    if (srtmTileCache[tileKey]) {
        return srtmTileCache[tileKey];
    }

    try {
        // Try to load local SRTM tile
        // File naming convention: N22E114.tif (for tile at 22°N, 114°E)
        const latPrefix = tileLat >= 0 ? 'N' : 'S';
        const lonPrefix = tileLon >= 0 ? 'E' : 'W';
        const latStr = Math.abs(tileLat).toString().padStart(2, '0');
        const lonStr = Math.abs(tileLon).toString().padStart(3, '0');
        const filename = `${latPrefix}${latStr}${lonPrefix}${lonStr}.tif`;

        const response = await fetch(`./srtm_tiles/${filename}`);
        if (!response.ok) {
            console.log(`SRTM tile not found: ${filename}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const data = await image.readRasters();

        const tileData = {
            width: image.getWidth(),
            height: image.getHeight(),
            bbox: image.getBoundingBox(),
            data: data[0], // First band contains elevation
            image: image
        };

        srtmTileCache[tileKey] = tileData;
        console.log(`✓ Loaded SRTM tile: ${filename}`);
        return tileData;
    } catch (error) {
        console.warn(`Failed to load SRTM tile for ${tileKey}:`, error.message);
        return null;
    }
}

async function getElevationFromSRTM(lat, lon) {
    const tile = await loadSRTMTile(lat, lon);
    if (!tile) return null;

    const [minX, minY, maxX, maxY] = tile.bbox;

    // Convert lat/lon to pixel coordinates
    const x = ((lon - minX) / (maxX - minX)) * tile.width;
    const y = ((maxY - lat) / (maxY - minY)) * tile.height; // Y is flipped in images

    // Use bilinear interpolation for smoother results
    const x0 = Math.floor(x);
    const x1 = Math.min(x0 + 1, tile.width - 1);
    const y0 = Math.floor(y);
    const y1 = Math.min(y0 + 1, tile.height - 1);

    const dx = x - x0;
    const dy = y - y0;

    const getPixel = (px, py) => {
        const idx = py * tile.width + px;
        return tile.data[idx];
    };

    const v00 = getPixel(x0, y0);
    const v10 = getPixel(x1, y0);
    const v01 = getPixel(x0, y1);
    const v11 = getPixel(x1, y1);

    // Bilinear interpolation
    const elevation = (1 - dx) * (1 - dy) * v00 +
                     dx * (1 - dy) * v10 +
                     (1 - dx) * dy * v01 +
                     dx * dy * v11;

    return elevation;
}

async function tryFetchWithSRTM(trackPoints, sampledIndices) {
    try {
        updateLoadingMessage('Checking local SRTM data...');

        let successCount = 0;
        for (let i = 0; i < sampledIndices.length; i++) {
            const idx = sampledIndices[i];
            const point = trackPoints[idx];

            const elevation = await getElevationFromSRTM(point.lat, point.lon);
            if (elevation !== null && !isNaN(elevation)) {
                point.ele = elevation;
                successCount++;
            }

            if (i % 10 === 0) {
                const progress = Math.round((i / sampledIndices.length) * 100);
                updateLoadingMessage(`Reading SRTM data... ${progress}% (${successCount}/${sampledIndices.length} points)`);
            }
        }

        if (successCount >= sampledIndices.length * 0.8) {
            console.log(`✓ Fetched ${successCount}/${sampledIndices.length} points from local SRTM`);
            return true;
        }

        console.log(`Partial SRTM coverage: ${successCount}/${sampledIndices.length} points`);
        return false;
    } catch (error) {
        console.warn('SRTM reading failed:', error.message);
        return false;
    }
}

// API-based elevation fetching
async function tryFetchWithOpenElevation(trackPoints, sampledIndices, retries = 1) {
    const batchSize = 20; // Even smaller batches for better reliability
    let totalSuccessCount = 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (attempt > 0) {
                updateLoadingMessage(`Retrying Open-Elevation (attempt ${attempt + 1})...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            let successCount = 0;
            for (let i = 0; i < sampledIndices.length; i += batchSize) {
                const batchIndices = sampledIndices.slice(i, i + batchSize);

                // Skip points that already have elevation from previous attempts
                const needElevation = batchIndices.filter(idx => trackPoints[idx].ele === null);
                if (needElevation.length === 0) continue;

                const locations = needElevation.map(idx => ({
                    latitude: trackPoints[idx].lat,
                    longitude: trackPoints[idx].lon
                }));

                const progress = Math.round((i / sampledIndices.length) * 100);
                updateLoadingMessage(`Fetching elevation... ${progress}% (${totalSuccessCount + successCount}/${sampledIndices.length} points)`);

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000);

                    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ locations }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const data = await response.json();
                    data.results.forEach((result, idx) => {
                        trackPoints[needElevation[idx]].ele = result.elevation;
                    });

                    successCount += needElevation.length;
                    await new Promise(resolve => setTimeout(resolve, 600));
                } catch (batchError) {
                    console.warn(`Batch ${i}-${i + batchSize} failed:`, batchError.message);
                }
            }

            totalSuccessCount += successCount;

            // Lower threshold: 20% is enough with interpolation
            if (totalSuccessCount >= sampledIndices.length * 0.2) {
                console.log(`✓ Fetched ${totalSuccessCount}/${sampledIndices.length} points from Open-Elevation`);
                return true;
            }
        } catch (error) {
            console.error(`Open-Elevation attempt ${attempt + 1} failed:`, error.message);
        }
    }

    // Even partial data is useful
    if (totalSuccessCount >= Math.min(10, sampledIndices.length * 0.15)) {
        console.log(`✓ Partial success: ${totalSuccessCount}/${sampledIndices.length} points from Open-Elevation`);
        return true;
    }

    return false;
}

async function tryFetchWithOpenTopoData(trackPoints, sampledIndices) {
    try {
        updateLoadingMessage('Trying alternative service (OpenTopoData)...');

        // Reduce sample size for this slower method
        const reducedIndices = sampledIndices.filter((_, i) => i % 2 === 0);
        let successCount = 0;

        for (let i = 0; i < reducedIndices.length; i++) {
            const idx = reducedIndices[i];
            const lat = trackPoints[idx].lat;
            const lon = trackPoints[idx].lon;

            const progress = Math.round((i / reducedIndices.length) * 100);
            if (i % 5 === 0) {
                updateLoadingMessage(`OpenTopoData... ${progress}% (${i}/${reducedIndices.length})`);
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const response = await fetch(
                    `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lon}`,
                    { signal: controller.signal }
                );

                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                if (data.results && data.results[0]) {
                    trackPoints[idx].ele = data.results[0].elevation;
                    successCount++;
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
                // Silently continue - don't spam console
                if (i % 10 === 0) {
                    console.warn(`OpenTopoData point ${i} failed, continuing...`);
                }
            }
        }

        // Success if we got at least 30% of reduced points
        if (successCount >= reducedIndices.length * 0.3) {
            console.log(`✓ Fetched ${successCount}/${reducedIndices.length} points from OpenTopoData`);
            return true;
        }

        throw new Error(`Only fetched ${successCount}/${reducedIndices.length} points`);
    } catch (error) {
        console.error('OpenTopoData failed:', error.message);
        return false;
    }
}

async function tryFetchPointByPoint(trackPoints, sampledIndices) {
    try {
        updateLoadingMessage('Final attempt: point-by-point...');

        // Significantly reduce sample size for this slow method
        const reducedIndices = sampledIndices.filter((_, i) => i % 3 === 0);
        let successCount = 0;

        for (let i = 0; i < reducedIndices.length; i++) {
            const idx = reducedIndices[i];

            const progress = Math.round((i / reducedIndices.length) * 100);
            if (i % 3 === 0) {
                updateLoadingMessage(`Final attempt... ${progress}% (${successCount} points fetched)`);
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s per point

                const response = await fetch(
                    `https://api.open-elevation.com/api/v1/lookup?locations=${trackPoints[idx].lat},${trackPoints[idx].lon}`,
                    { signal: controller.signal }
                );

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data.results && data.results[0]) {
                        trackPoints[idx].ele = data.results[0].elevation;
                        successCount++;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                // Silently continue - don't spam errors
            }
        }

        // Success if we got at least a few points
        if (successCount >= Math.min(10, reducedIndices.length * 0.2)) {
            console.log(`✓ Fetched ${successCount}/${reducedIndices.length} points individually`);
            return true;
        }

        console.warn(`Only fetched ${successCount}/${reducedIndices.length} points`);
        return false;
    } catch (error) {
        console.error('Point-by-point fetch failed:', error.message);
        return false;
    }
}

// Main elevation fetching function with fallbacks
async function fetchElevationData(trackPoints) {
    // Sample points to avoid API rate limits
    const maxPoints = 100;
    const step = Math.max(1, Math.floor(trackPoints.length / maxPoints));
    const sampledIndices = [];

    for (let i = 0; i < trackPoints.length; i += step) {
        sampledIndices.push(i);
    }

    // Always include the last point
    if (sampledIndices[sampledIndices.length - 1] !== trackPoints.length - 1) {
        sampledIndices.push(trackPoints.length - 1);
    }

    // Try multiple elevation services with fallbacks
    // Priority: Local SRTM > Open-Elevation API > OpenTopoData > Point-by-point
    let success = await tryFetchWithSRTM(trackPoints, sampledIndices);
    if (success) {
        elevationSource = 'Local SRTM Data';
    } else {
        success = await tryFetchWithOpenElevation(trackPoints, sampledIndices);
        if (success) {
            elevationSource = 'Open-Elevation API';
        } else {
            success = await tryFetchWithOpenTopoData(trackPoints, sampledIndices);
            if (success) {
                elevationSource = 'OpenTopoData API';
            } else {
                success = await tryFetchPointByPoint(trackPoints, sampledIndices);
                if (success) {
                    elevationSource = 'Open-Elevation API (fallback)';
                }
            }
        }
    }

    if (!success) {
        alert('Unable to fetch elevation data from any service. Using flat elevation profile.');
        elevationSource = 'None (flat profile)';
        trackPoints.forEach(point => {
            if (point.ele === null) point.ele = 0;
        });
        return;
    }

    // Interpolate elevation for points between sampled points
    interpolateElevation(trackPoints);
}

// Elevation interpolation
function interpolateElevation(trackPoints) {
    for (let i = 0; i < trackPoints.length; i++) {
        if (trackPoints[i].ele === null) {
            let prevIdx = i - 1;
            while (prevIdx >= 0 && trackPoints[prevIdx].ele === null) prevIdx--;

            let nextIdx = i + 1;
            while (nextIdx < trackPoints.length && trackPoints[nextIdx].ele === null) nextIdx++;

            if (prevIdx >= 0 && nextIdx < trackPoints.length) {
                const prevEle = trackPoints[prevIdx].ele;
                const nextEle = trackPoints[nextIdx].ele;
                const ratio = (i - prevIdx) / (nextIdx - prevIdx);
                trackPoints[i].ele = prevEle + (nextEle - prevEle) * ratio;
            } else if (prevIdx >= 0) {
                trackPoints[i].ele = trackPoints[prevIdx].ele;
            } else if (nextIdx < trackPoints.length) {
                trackPoints[i].ele = trackPoints[nextIdx].ele;
            } else {
                trackPoints[i].ele = 0;
            }
        }
    }
}

// Elevation source display
function updateElevationSourceDisplay() {
    const sourceElement = document.getElementById('elevation-source');
    if (sourceElement) {
        let iconAndColor;
        switch(elevationSource) {
            case 'GPX File':
                iconAndColor = { icon: '📁', color: '#27ae60', bg: '#d5f4e6' };
                break;
            case 'Local SRTM Data':
                iconAndColor = { icon: '🏔️', color: '#16a085', bg: '#d1f2eb' };
                break;
            case 'Open-Elevation API':
            case 'Open-Elevation API (fallback)':
                iconAndColor = { icon: '🌐', color: '#667eea', bg: '#e8ebfa' };
                break;
            case 'OpenTopoData API':
                iconAndColor = { icon: '🗺️', color: '#3498db', bg: '#ddeef8' };
                break;
            case 'None (flat profile)':
                iconAndColor = { icon: '⚠️', color: '#e67e22', bg: '#fdebd0' };
                break;
            default:
                iconAndColor = { icon: '❓', color: '#95a5a6', bg: '#ecf0f1' };
        }

        sourceElement.innerHTML = `
            <span style="font-size: 1.2rem; margin-right: 0.5rem;">${iconAndColor.icon}</span>
            <span style="font-weight: 600; color: ${iconAndColor.color};">Elevation Source:</span>
            <span style="margin-left: 0.5rem; color: #333;">${elevationSource}</span>
        `;
        sourceElement.style.backgroundColor = iconAndColor.bg;
        sourceElement.style.borderLeft = `4px solid ${iconAndColor.color}`;
    }
}
