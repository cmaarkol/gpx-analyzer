// app.js - Main application initialization and global state

// Initialize the application
document.getElementById('gpx-upload').addEventListener('change', handleMultipleGPXUpload);
document.getElementById('recalculate').addEventListener('click', recalculateEstimatedTime);
document.getElementById('reverse-route').addEventListener('click', handleReverseRoute);
document.getElementById('reset-route').addEventListener('click', handleResetRoute);
document.getElementById('export-gpx').addEventListener('click', exportWaypointsTable);
document.getElementById('export-excel').addEventListener('click', exportWaypointsExcel);
document.getElementById('link-gpx-files').addEventListener('click', linkSelectedGPXFiles);
