// ui.js - User interface rendering and interaction functions

function renderMap(fitToBounds = false) {
    // Initialize map if not already done
    if (!map) {
        map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        // Add click handler for adding waypoints
        map.on('click', function(e) {
            addWaypointFromMapClick(e.latlng.lat, e.latlng.lng);
        });

        // Add hover handlers for route synchronization
        map.on('mousemove', function(e) {
            if (routeLayer) {
                const latlng = e.latlng;
                // Find nearest point on route
                const nearestPoint = findNearestTrackPoint(routeData.points, latlng.lat, latlng.lng);
                if (nearestPoint) {
                    updateHoverPosition(nearestPoint.distance);
                }
            }
        });

        map.on('mouseout', function(e) {
            // Only clear if mouse is outside map container
            const mapContainer = document.getElementById('map');
            const rect = mapContainer.getBoundingClientRect();
            if (e.originalEvent.clientX < rect.left || e.originalEvent.clientX > rect.right ||
                e.originalEvent.clientY < rect.top || e.originalEvent.clientY > rect.bottom) {
                clearHoverIndicators();
            }
        });
    }

    let currentCenter = null;
    let currentZoom = null;
    if (routeLayer && !fitToBounds) {
        currentCenter = map.getCenter();
        currentZoom = map.getZoom();
        map.removeLayer(routeLayer);
    } else if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    // Remove existing waypoint markers
    waypointMarkers.forEach(marker => map.removeLayer(marker));
    waypointMarkers = [];

    // Create route polyline
    const routeCoords = routeData.points.map(p => [p.lat, p.lon]);
    routeLayer = L.polyline(routeCoords, {
        color: '#667eea',
        weight: 4,
        opacity: 0.8
    }).addTo(map);

    // Add waypoint markers
    routeData.waypoints.forEach((wp, index) => {
        const isCustom = wp.isCustom || false;
        const bgColor = isCustom ? '#e74c3c' : '#764ba2';

        const marker = L.marker([wp.lat, wp.lon], {
            icon: L.divIcon({
                className: 'waypoint-marker',
                html: `<div style="background: ${bgColor}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${index + 1}</div>`,
                iconSize: [30, 30]
            })
        }).addTo(map);

        marker.bindPopup(`
            <strong>${wp.name}</strong><br>
            Elevation: ${wp.ele.toFixed(0)} m<br>
            Distance: ${wp.distance.toFixed(2)} km
        `);

        waypointMarkers.push(marker);
    });

    if (fitToBounds) { // Fit to bounds if requested (e.g., new file upload)
        map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    } else if (currentCenter && currentZoom) { // Otherwise restore previous view
        map.setView(currentCenter, currentZoom);
    } else { // Fallback if no previous view and not fitting to bounds
        map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    }
}

function renderElevationChart() {
    const canvas = document.getElementById('elevationProfile');
    if (!canvas) {
        console.error('Elevation chart canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (elevationChart) {
        try {
            elevationChart.destroy();
            elevationChart = null; // Clear the reference
        } catch (e) {
            console.warn('Error destroying chart:', e);
            elevationChart = null; // Clear the reference even if destroy failed
        }
    }

    // Sample points for chart (to avoid too many data points)
    const maxPoints = 500;
    const step = Math.max(1, Math.floor(routeData.points.length / maxPoints));
    const sampledPoints = routeData.points.filter((_, index) => index % step === 0);

    // Ensure last point included in sample
    if (sampledPoints[sampledPoints.length - 1] !== routeData.points[routeData.points.length - 1]) {
        sampledPoints.push(routeData.points[routeData.points.length - 1]);
    }

    const chartData = {
        datasets: [{
            label: 'Elevation (m)',
            data: sampledPoints.map(p => ({ x: p.distance, y: p.ele })),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            parsing: false
        }]
    };

    // Add waypoint annotations
    const waypointAnnotations = {};
    routeData.waypoints.forEach((wp, idx) => {
        waypointAnnotations[`waypoint${idx}`] = {
            type: 'line',
            xMin: wp.distance,
            xMax: wp.distance,
            borderColor: wp.isCustom ? '#e74c3c' : '#764ba2',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                display: true,
                content: `${idx + 1}`,
                position: 'start',
                backgroundColor: wp.isCustom ? '#e74c3c' : '#764ba2',
                color: 'white',
                font: {
                    size: 10,
                    weight: 'bold'
                },
                padding: 4,
                borderRadius: 3
            }
        };
    });

    // Add hover line annotation for synchronization
    waypointAnnotations['hoverLine'] = {
        type: 'line',
        xMin: 0,
        xMax: 0,
        borderColor: '#ff6b6b',
        borderWidth: 2,
        borderDash: [3, 3],
        display: false
    };

    try {
        elevationChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    annotation: {
                        annotations: waypointAnnotations
                    },
                    legend: {
                        display: false,
                        labels: {
                            generateLabels: function() {
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return 'Distance: ' + context[0].parsed.x.toFixed(2) + ' km';
                            },
                            label: function(context) {
                                return 'Elevation: ' + context.parsed.y.toFixed(0) + ' m';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Distance (km)'
                        },
                        ticks: {
                            maxTicksLimit: 10,
                            callback: function(value) {
                                return Number(value).toFixed(1);
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Elevation (m)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                onHover: function(event, activeElements) {
                    const canvasPosition = Chart.helpers.getRelativePosition(event, elevationChart);
                    const xScale = elevationChart.scales.x;

                    if (xScale && canvasPosition.x >= 0 && canvasPosition.x <= elevationChart.width) {
                        const distance = xScale.getValueForPixel(canvasPosition.x);
                        if (isFinite(distance)) {
                            const clampedDistance = Math.max(0, Math.min(distance, routeData.totalDistance));
                            updateHoverPosition(clampedDistance);
                        }
                    } else {
                        clearHoverIndicators();
                    }
                },
                onClick: function(event) {
                    const xScale = elevationChart.scales.x;
                    if (!xScale) return;

                    const canvasPosition = Chart.helpers.getRelativePosition(event, elevationChart);
                    let distance = xScale.getValueForPixel(canvasPosition.x);
                    if (!isFinite(distance)) return;

                    distance = Math.max(0, Math.min(distance, routeData.totalDistance));
                    addWaypointFromChartClick(distance);
                }
            }
        });
    } catch (e) {
        console.error('Error creating elevation chart:', e);
    }
}

function renderWaypointsTable() {
    if (activeWaypointIndex !== null && activeWaypointIndex >= routeData.waypoints.length) {
        activeWaypointIndex = null;
    }

    const tbody = document.querySelector('#waypoints tbody');
    tbody.innerHTML = '';

    routeData.waypoints.forEach((wp, index) => {
        const row = document.createElement('tr');

        // Calculate segment distance and time (from previous waypoint)
        const segmentDistance = index === 0 ? 0 :
            wp.distance - routeData.waypoints[index - 1].distance;

        const prevDistance = index === 0 ? 0 : routeData.waypoints[index - 1].distance;
        const estimatedTime = calculateEstimatedTimeToPoint(wp.distance);
        const segmentTime = index === 0 ? 0 : estimatedTime - calculateEstimatedTimeToPoint(prevDistance);

        const isCustom = wp.isCustom || false;
        const isStartEnd = wp.isStart || wp.isEnd;
        const displayName = wp.name && wp.name.trim() ? wp.name : 'Custom waypoint';
        const isEditable = !isStartEnd;
        const isActive = isEditable && activeWaypointIndex === index;

        let nameContent;
        let nameActions = '';
        let rowActions = '';
        if (!isEditable) {
            nameContent = `<strong>${wp.name}</strong>`;
            // Show delete button for start/end waypoints
            rowActions = `<button class="delete-waypoint" data-index="${index}" style="background: none; border: none; cursor: pointer; color: #e74c3c; font-size: 1.1rem; padding: 0 0.3rem;" title="Delete waypoint">🗑️</button>`;
        } else if (isActive) {
            nameContent = `<input type="text" class="edit-waypoint-name" data-index="${index}" value="${wp.name}" placeholder="Custom waypoint" style="border: 1px solid #ddd; padding: 0.3rem 0.5rem; border-radius: 4px; font-size: 0.9rem; width: 170px;" />`;
            nameActions = `<div class="waypoint-name-actions"><button class="save-waypoint" data-index="${index}" style="background: none; border: none; cursor: pointer; color: #27ae60; font-size: 1.1rem; padding: 0 0.3rem;" title="Done">✅</button></div>`;
            // Show delete button for all editable waypoints
            rowActions = `<button class="delete-waypoint" data-index="${index}" style="background: none; border: none; cursor: pointer; color: #e74c3c; font-size: 1.1rem; padding: 0 0.3rem;" title="Delete waypoint">🗑️</button>`;
        } else {
            nameContent = `<span class="waypoint-name-label">${displayName}</span>`;
            // Show delete button for all editable waypoints
            rowActions = `<button class="delete-waypoint" data-index="${index}" style="background: none; border: none; cursor: pointer; color: #e74c3c; font-size: 1.1rem; padding: 0 0.3rem;" title="Delete waypoint">🗑️</button>`;
        }

        const gainLossContent = `<span style="color: #27ae60; font-weight: 600;">▲ ${wp.gain.toFixed(0)} m</span><br><span style="color: #e74c3c; font-weight: 600;">▼ ${wp.loss.toFixed(0)} m</span>`;

        row.className = 'waypoint-row';
        row.setAttribute('data-waypoint-index', index);
        row.innerHTML = `
            <td><span class="waypoint-number">${index + 1}</span></td>
            <td class="waypoint-name-cell">
                ${nameContent}
                ${nameActions}
            </td>
            <td>${segmentDistance.toFixed(2)}</td>
            <td>${wp.ele.toFixed(0)}</td>
            <td>${wp.distance.toFixed(2)}</td>
            <td>${gainLossContent}</td>
            <td>${formatTime(segmentTime)}</td>
            <td>${formatTime(estimatedTime)}</td>
            <td class="waypoint-row-actions">${rowActions}</td>
        `;

        // Add hover handlers
        row.addEventListener('mouseenter', function() {
            highlightWaypoint(index);
        });
        row.addEventListener('mouseleave', function() {
            unhighlightWaypoint(index);
        });

        tbody.appendChild(row);

        // Toggle editing when clicking the waypoint name cell (for editable waypoints)
        if (isEditable && !isActive) {
            const nameCell = row.querySelector('.waypoint-name-cell');
            if (nameCell) {
                nameCell.addEventListener('click', function(e) {
                    e.stopPropagation();
                    activeWaypointIndex = activeWaypointIndex === index ? null : index;
                    renderWaypointsTable();
                });
            }
        }
    });

    // Add delete button handlers
    document.querySelectorAll('.delete-waypoint').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            activeWaypointIndex = null;
            const index = parseInt(this.getAttribute('data-index'));
            deleteWaypoint(index);
        });
    });

    // Add done button handlers
    document.querySelectorAll('.save-waypoint').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            const input = document.querySelector(`.edit-waypoint-name[data-index="${index}"]`);
            if (input) {
                renameWaypoint(index, input.value);
            }
            activeWaypointIndex = null;
            renderWaypointsTable();
        });
    });

    // Add name edit handlers
    document.querySelectorAll('.edit-waypoint-name').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            renameWaypoint(index, this.value);
        });
        // Prevent hover events from bubbling when editing
        input.addEventListener('mouseenter', function(e) {
            e.stopPropagation();
        });
    });

    // Focus active input if present
    if (activeWaypointIndex !== null) {
        const activeInput = document.querySelector(`.edit-waypoint-name[data-index="${activeWaypointIndex}"]`);
        if (activeInput) {
            activeInput.focus();
            activeInput.select();
        }
    }
}

function highlightWaypoint(index) {
    // Highlight marker on map
    if (waypointMarkers[index]) {
        const markerElement = waypointMarkers[index].getElement();
        if (markerElement) {
            const iconDiv = markerElement.querySelector('div');
            if (iconDiv) {
                iconDiv.style.transform = 'scale(1.3)';
                iconDiv.style.transition = 'transform 0.2s ease';
                iconDiv.style.zIndex = '1000';
            }
        }
    }

    // Highlight chart annotation
    if (elevationChart && elevationChart.options.plugins.annotation) {
        const annotations = elevationChart.options.plugins.annotation.annotations;
        const annotationKey = `waypoint${index}`;
        if (annotations[annotationKey]) {
            annotations[annotationKey].borderWidth = 4;
            annotations[annotationKey].label.font.size = 12;
            elevationChart.update('none'); // Update without animation
        }
    }
}

function unhighlightWaypoint(index) {
    // Unhighlight marker on map
    if (waypointMarkers[index]) {
        const markerElement = waypointMarkers[index].getElement();
        if (markerElement) {
            const iconDiv = markerElement.querySelector('div');
            if (iconDiv) {
                iconDiv.style.transform = 'scale(1)';
                iconDiv.style.zIndex = '';
            }
        }
    }

    // Unhighlight chart annotation
    if (elevationChart && elevationChart.options.plugins.annotation) {
        const annotations = elevationChart.options.plugins.annotation.annotations;
        const annotationKey = `waypoint${index}`;
        if (annotations[annotationKey]) {
            annotations[annotationKey].borderWidth = 2;
            annotations[annotationKey].label.font.size = 10;
            elevationChart.update('none'); // Update without animation
        }
    }
}

function updateStatistics() {
    document.getElementById('total-distance').textContent =
        routeData.totalDistance.toFixed(2) + ' km';
    document.getElementById('total-elevation-gain').textContent =
        routeData.totalGain.toFixed(0) + ' m';
    document.getElementById('total-elevation-loss').textContent =
        routeData.totalLoss.toFixed(0) + ' m';

    const estimatedTime = calculateEstimatedTime();
    document.getElementById('estimated-time').textContent = formatTime(estimatedTime);

    // Update elevation source display
    updateElevationSourceDisplay();
}

function updateHoverPosition(distance) {
    if (!routeData || !routeData.points || routeData.points.length === 0) return;

    // Find the point at this distance
    let targetPoint = routeData.points[0];
    let minDiff = Math.abs(routeData.points[0].distance - distance);

    for (const point of routeData.points) {
        const diff = Math.abs(point.distance - distance);
        if (diff < minDiff) {
            minDiff = diff;
            targetPoint = point;
        }
    }

    // Update chart hover line
    if (elevationChart && elevationChart.options.plugins.annotation) {
        const annotations = elevationChart.options.plugins.annotation.annotations;
        if (annotations['hoverLine']) {
            annotations['hoverLine'].xMin = distance;
            annotations['hoverLine'].xMax = distance;
            annotations['hoverLine'].display = true;
            elevationChart.update('none');
        }
    }

    // Update map hover marker
    if (map) {
        // Remove existing hover marker
        if (hoverMarker) {
            map.removeLayer(hoverMarker);
        }

        // Create new hover marker
        hoverMarker = L.circleMarker([targetPoint.lat, targetPoint.lon], {
            color: '#ff6b6b',
            fillColor: '#ff6b6b',
            fillOpacity: 0.8,
            radius: 6,
            weight: 2
        }).addTo(map);

        // Add popup with info
        hoverMarker.bindPopup(`
            <strong>Distance:</strong> ${distance.toFixed(2)} km<br>
            <strong>Elevation:</strong> ${targetPoint.ele.toFixed(0)} m
        `, { closeButton: false, autoClose: false });
    }
}

function clearHoverIndicators() {
    // Clear chart hover line
    if (elevationChart && elevationChart.options.plugins.annotation) {
        const annotations = elevationChart.options.plugins.annotation.annotations;
        if (annotations['hoverLine']) {
            annotations['hoverLine'].display = false;
            elevationChart.update('none');
        }
    }

    // Clear map hover marker
    if (map && hoverMarker) {
        map.removeLayer(hoverMarker);
        hoverMarker = null;
    }
}

function updateFilenameDisplay() {
    const filenameContainer = document.getElementById('gpx-filename');
    const filenameDisplay = document.getElementById('filename-display');
    const filenameEdit = document.getElementById('filename-edit');

    if (currentGpxFilename) {
        filenameDisplay.textContent = currentGpxFilename;
        filenameContainer.style.display = 'block';

        // Set up editing functionality
        filenameDisplay.onclick = function() {
            filenameDisplay.style.display = 'none';
            filenameEdit.style.display = 'block';
            filenameEdit.value = currentGpxFilename;
            filenameEdit.focus();
            filenameEdit.select();
        };

        filenameEdit.onblur = function() {
            saveFilename();
        };

        filenameEdit.onkeypress = function(e) {
            if (e.key === 'Enter') {
                saveFilename();
            } else if (e.key === 'Escape') {
                cancelFilenameEdit();
            }
        };
    } else {
        filenameContainer.style.display = 'none';
    }
}

function saveFilename() {
    const filenameEdit = document.getElementById('filename-edit');
    const filenameDisplay = document.getElementById('filename-display');

    const newName = filenameEdit.value.trim();
    if (newName) {
        currentGpxFilename = newName;
        filenameDisplay.textContent = newName;
    }

    filenameEdit.style.display = 'none';
    filenameDisplay.style.display = 'block';
}

function cancelFilenameEdit() {
    const filenameEdit = document.getElementById('filename-edit');
    const filenameDisplay = document.getElementById('filename-display');

    filenameEdit.style.display = 'none';
    filenameDisplay.style.display = 'block';
}
