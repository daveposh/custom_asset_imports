document.addEventListener('DOMContentLoaded', function() {
    app.initialized().then(function(_client) {
        window.client = _client;
        
        // Initialize the app
        initializeApp();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial data
        loadDashboardData();
    }).catch(function(error) {
        console.error('Failed to initialize app:', error);
    });
});

function initializeApp() {
    console.log('Asset Import Manager initialized');
}

function setupEventListeners() {
    // Sync Now button
    document.getElementById('syncNow').addEventListener('click', function() {
        triggerAssetSync();
    });
    
    // View Logs button
    document.getElementById('viewLogs').addEventListener('click', function() {
        showActivityLogs();
    });
}

function loadDashboardData() {
    // Get installation parameters
    client.iparams.get().then(function(iparams) {
        // Load asset statistics
        loadAssetStats(iparams);
        
        // Load recent activity
        loadRecentActivity();
    }).catch(function(error) {
        console.error('Error loading iparams:', error);
        showError('Failed to load configuration');
    });
}

function loadAssetStats(iparams) {
    // Make API call to get Dell asset count
    let apiUri;
    
    if (iparams.auto_detect_dell) {
        // When auto-detecting, we need to get all assets and count Dell ones
        apiUri = '/api/v2/assets?per_page=100';
    } else if (iparams.dell_asset_type_ids && iparams.dell_asset_type_ids.trim()) {
        // Get assets from specific asset types
        const assetTypeIds = iparams.dell_asset_type_ids.split(',').map(id => id.trim());
        const filters = assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ');
        apiUri = `/api/v2/assets?filter="${filters}"&per_page=100`;
    } else {
        // Fallback to all assets
        apiUri = '/api/v2/assets?per_page=100';
    }
    
    const requestOptions = {
        options: {
            uri: apiUri,
            method: 'GET'
        }
    };
    
    client.request.invoke('freshservice_api', requestOptions)
        .then(function(response) {
            const data = JSON.parse(response.response);
            let dellAssetCount = 0;
            
            if (iparams.auto_detect_dell) {
                // Count assets with Dell service tag format serial numbers
                dellAssetCount = (data.assets || []).filter(function(asset) {
                    return asset.serial_number && isDellServiceTagFormat(asset.serial_number);
                }).length;
            } else {
                dellAssetCount = data.assets ? data.assets.length : 0;
            }
            
            document.getElementById('totalAssets').textContent = dellAssetCount;
        })
        .catch(function(error) {
            console.error('Error loading asset stats:', error);
            document.getElementById('totalAssets').textContent = 'Error';
        });
    
    // Load last sync time from local storage
    client.db.get('lastSyncTime').then(function(data) {
        if (data && data.lastSyncTime) {
            const lastSync = new Date(data.lastSyncTime);
            document.getElementById('lastSync').textContent = lastSync.toLocaleString();
        } else {
            document.getElementById('lastSync').textContent = 'Never';
        }
    }).catch(function() {
        document.getElementById('lastSync').textContent = 'Never';
    });
}

function loadRecentActivity() {
    client.db.get('recentActivity').then(function(data) {
        const activityLog = document.getElementById('activityLog');
        
        if (data && data.activities && data.activities.length > 0) {
            const activityHtml = '<ul class="list-unstyled">' + 
                data.activities.slice(0, 5).map(function(activity) {
                    const time = new Date(activity.timestamp).toLocaleString();
                    return `<li><small class="text-muted">${time}</small><br>${activity.message}</li>`;
                }).join('') + '</ul>';
            activityLog.innerHTML = activityHtml;
        } else {
            activityLog.innerHTML = '<p class="text-muted">No recent activity</p>';
        }
    }).catch(function(error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('activityLog').innerHTML = '<p class="text-muted">No recent activity</p>';
    });
}

function triggerAssetSync() {
    const syncButton = document.getElementById('syncNow');
    const syncStatus = document.getElementById('syncStatus');
    const syncResult = document.getElementById('syncResult');
    
    // Show loading state
    syncButton.disabled = true;
    syncButton.innerHTML = '<i class="icon-spinner icon-spin"></i> Syncing...';
    syncStatus.style.display = 'block';
    syncResult.style.display = 'none';
    
    // Trigger the backend sync job
    client.request.invoke('executeJob', {
        body: JSON.stringify({ name: 'dell_asset_sync' })
    }).then(function(response) {
        // Update UI based on response
        syncButton.disabled = false;
        syncButton.innerHTML = '<i class="icon-refresh"></i> Sync Now';
        syncStatus.style.display = 'none';
        syncResult.style.display = 'block';
        
        const result = JSON.parse(response.response);
        if (result.success) {
            syncResult.innerHTML = `
                <div class="alert alert-success">
                    <strong>Sync completed successfully!</strong><br>
                    Updated ${result.updatedAssets} assets
                </div>
            `;
            
            // Refresh dashboard data
            loadDashboardData();
            
            // Log activity
            logActivity(`Sync completed: ${result.updatedAssets} assets updated`);
        } else {
            syncResult.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Sync failed:</strong> ${result.error}
                </div>
            `;
        }
    }).catch(function(error) {
        console.error('Sync error:', error);
        syncButton.disabled = false;
        syncButton.innerHTML = '<i class="icon-refresh"></i> Sync Now';
        syncStatus.style.display = 'none';
        syncResult.style.display = 'block';
        syncResult.innerHTML = `
            <div class="alert alert-danger">
                <strong>Sync failed:</strong> ${error.message || 'Unknown error'}
            </div>
        `;
    });
}

function showActivityLogs() {
    client.db.get('recentActivity').then(function(data) {
        const logsText = 'Recent Activity Logs:\n\n' + 
            (data && data.activities && data.activities.length > 0 ? 
                data.activities.map(function(activity) {
                    const time = new Date(activity.timestamp).toLocaleString();
                    return `${time}: ${activity.message}`;
                }).join('\n') : 
                'No activity logs found.');
        
        // Show logs in a notification
        client.interface.trigger('showNotify', {
            type: 'info',
            message: 'Activity Logs',
            description: logsText.substring(0, 200) + (logsText.length > 200 ? '...' : '')
        });
    }).catch(function(error) {
        console.error('Error loading activity logs:', error);
        client.interface.trigger('showNotify', {
            type: 'warning',
            message: 'No activity logs found.'
        });
    });
}

function logActivity(message) {
    const activity = {
        timestamp: new Date().toISOString(),
        message: message
    };
    
    client.db.get('recentActivity').then(function(data) {
        let activities = [];
        if (data && data.activities) {
            activities = data.activities;
        }
        
        activities.unshift(activity);
        // Keep only last 50 activities
        activities = activities.slice(0, 50);
        
        return client.db.set('recentActivity', { activities: activities });
    }).then(function() {
        loadRecentActivity();
    }).catch(function(error) {
        console.error('Error logging activity:', error);
    });
}

/**
 * Check if a serial number matches Dell service tag format (client-side version)
 */
function isDellServiceTagFormat(tag) {
    if (!tag || typeof tag !== 'string') {
        return false;
    }
    
    const cleanTag = tag.trim().toUpperCase();
    
    // Basic Dell service tag patterns for client-side validation
    const patterns = [
        /^[A-Z0-9]{7}$/,           // Standard 7-character
        /^[A-Z0-9]{5}$/,           // 5-character
        /^[0-9]{10,11}$/,          // Express service code
        /^[A-Z]{1,3}[0-9]{4,5}$/,  // Letter prefix
        /^[A-Z0-9]{6}$/            // 6-character
    ];
    
    return patterns.some(pattern => pattern.test(cleanTag));
}

function showError(message) {
    const syncResult = document.getElementById('syncResult');
    syncResult.style.display = 'block';
    syncResult.innerHTML = `
        <div class="alert alert-danger">
            <strong>Error:</strong> ${message}
        </div>
    `;
} 