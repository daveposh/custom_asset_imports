const axios = require('axios');

exports = {
    /**
     * App Install Handler
     * Sets up scheduled events when the app is installed
     */
    onAppInstallHandler: function(args) {
        console.log('App installed successfully');
        
        // Schedule the Dell asset sync job
        const scheduleData = {
            name: 'dell_asset_sync',
            data: {},
            schedule_at: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
            repeat: {
                time_unit: 'hours',
                frequency: parseInt(args.iparams.sync_schedule) || 24
            }
        };
        
        $schedule.create(scheduleData)
            .then(function(data) {
                console.log('Scheduled job created:', data);
                renderData();
            })
            .catch(function(error) {
                console.error('Error creating scheduled job:', error);
                renderData({ error: 'Failed to schedule sync job' });
            });
    },

    /**
     * Scheduled Event Handler
     * Handles all scheduled jobs
     */
    scheduledEventHandler: function(args) {
        console.log('Scheduled event triggered:', args.data.name);
        
        switch(args.data.name) {
            case 'dell_asset_sync':
                return handleDellAssetSync(args);
            default:
                console.log('Unknown scheduled job:', args.data.name);
                return;
        }
    },

    /**
     * Manual sync trigger (called from frontend)
     */
    executeJob: function(args) {
        if (args.name === 'dell_asset_sync') {
            return handleDellAssetSync(args);
        } else {
            return { success: false, error: 'Unknown job name' };
        }
    }
};

/**
 * Dell Asset Sync Job Handler
 * Updates Dell assets with service tags from serial numbers
 */
async function handleDellAssetSync(args) {
    try {
        console.log('Starting Dell asset sync job...');
        
        const iparams = args.iparams;
        const baseUrl = `https://${iparams.domain}.freshservice.com`;
        const authHeader = Buffer.from(`${iparams.api_key}:X`).toString('base64');
        
        const headers = {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
        };
        
        // Get Dell assets based on configuration
        const assetsResponse = await getDellAssets(baseUrl, headers, iparams);
        
        const assets = assetsResponse.data.assets || [];
        console.log(`Found ${assets.length} Dell assets to process`);
        
        let updatedCount = 0;
        const results = [];
        
        // Process each asset
        for (const asset of assets) {
            try {
                const result = await processDellAsset(asset, baseUrl, headers);
                if (result.updated) {
                    updatedCount++;
                }
                results.push(result);
            } catch (error) {
                console.error(`Error processing asset ${asset.id}:`, error.message);
                results.push({
                    assetId: asset.id,
                    updated: false,
                    error: error.message
                });
            }
        }
        
        console.log(`Dell asset sync completed. Updated ${updatedCount} assets.`);
        
        // Store sync results
        const syncResult = {
            timestamp: new Date().toISOString(),
            totalAssets: assets.length,
            updatedAssets: updatedCount,
            results: results
        };
        
        // Log the activity
        logSyncActivity(syncResult);
        
        return { success: true, updatedAssets: updatedCount };
        
    } catch (error) {
        console.error('Dell asset sync failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Dell assets based on configuration
 */
async function getDellAssets(baseUrl, headers, iparams) {
    if (iparams.auto_detect_dell) {
        // Get all assets and filter by Dell service tag format
        console.log('Auto-detecting Dell assets across all asset types...');
        return await getAllAssetsAndFilterDell(baseUrl, headers);
    } else if (iparams.dell_asset_type_ids && iparams.dell_asset_type_ids.trim()) {
        // Get assets from specific asset type IDs
        const assetTypeIds = iparams.dell_asset_type_ids.split(',').map(id => id.trim());
        console.log(`Getting Dell assets from asset types: ${assetTypeIds.join(', ')}`);
        return await getAssetsByTypes(baseUrl, headers, assetTypeIds);
    } else {
        // Fallback to getting all assets
        console.log('Getting all assets (no specific Dell asset types configured)...');
        return await axios.get(`${baseUrl}/api/v2/assets`, {
            headers: headers,
            params: { per_page: 100 }
        });
    }
}

/**
 * Get all assets and filter for Dell assets by service tag format
 */
async function getAllAssetsAndFilterDell(baseUrl, headers) {
    let allAssets = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        try {
            const response = await axios.get(`${baseUrl}/api/v2/assets`, {
                headers: headers,
                params: {
                    per_page: 100,
                    page: page
                }
            });
            
            const assets = response.data.assets || [];
            
            // Filter assets that have Dell service tag format serial numbers
            const dellAssets = assets.filter(asset => {
                return asset.serial_number && isDellServiceTag(asset.serial_number);
            });
            
            allAssets = allAssets.concat(dellAssets);
            
            // Check if there are more pages
            hasMore = assets.length === 100;
            page++;
            
        } catch (error) {
            console.error(`Error fetching assets page ${page}:`, error.message);
            hasMore = false;
        }
    }
    
    return { data: { assets: allAssets } };
}

/**
 * Get assets from specific asset type IDs
 */
async function getAssetsByTypes(baseUrl, headers, assetTypeIds) {
    let allAssets = [];
    
    for (const assetTypeId of assetTypeIds) {
        try {
            const response = await axios.get(`${baseUrl}/api/v2/assets`, {
                headers: headers,
                params: {
                    filter: `asset_type_id:${assetTypeId}`,
                    per_page: 100
                }
            });
            
            const assets = response.data.assets || [];
            allAssets = allAssets.concat(assets);
            
        } catch (error) {
            console.error(`Error fetching assets for type ${assetTypeId}:`, error.message);
        }
    }
    
    return { data: { assets: allAssets } };
}

/**
 * Process individual Dell asset
 * Updates asset tag with service tag from serial number
 */
async function processDellAsset(asset, baseUrl, headers) {
    const result = {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.asset_type_id,
        updated: false
    };
    
    // Check if asset has serial number
    const serialNumber = asset.serial_number;
    if (!serialNumber || serialNumber.trim() === '') {
        result.skipped = 'No serial number found';
        return result;
    }
    
    // Check if asset tag matches serial number
    if (asset.asset_tag === serialNumber) {
        result.skipped = 'Asset tag already matches serial number';
        return result;
    }
    
    // Validate Dell service tag format
    if (!isDellServiceTag(serialNumber)) {
        result.skipped = 'Serial number does not match Dell service tag format';
        return result;
    }
    
    // Update the asset
    return await updateAssetTag(asset, serialNumber, baseUrl, headers, result);
}

/**
 * Update asset with service tag
 */
async function updateAssetTag(asset, serialNumber, baseUrl, headers, result) {
    const updateData = {
        asset_tag: serialNumber,
        description: asset.description ? 
            `${asset.description}\n\nService Tag: ${serialNumber}` : 
            `Service Tag: ${serialNumber}`
    };
    
    try {
        const updateResponse = await axios.put(`${baseUrl}/api/v2/assets/${asset.id}`, updateData, {
            headers: headers
        });
        
        if (updateResponse.status === 200) {
            result.updated = true;
            result.newAssetTag = serialNumber;
            console.log(`Updated asset ${asset.id} with service tag: ${serialNumber}`);
        }
        
    } catch (error) {
        result.error = error.response?.data?.description || error.message;
        console.error(`Failed to update asset ${asset.id}:`, result.error);
    }
    
    return result;
}

/**
 * Validate Dell service tag format
 * Enhanced detection for various Dell service tag formats
 */
function isDellServiceTag(tag) {
    if (!tag || typeof tag !== 'string') {
        return false;
    }
    
    const cleanTag = tag.trim().toUpperCase();
    
    // Dell service tag patterns:
    // 1. Standard 7-character alphanumeric (most common)
    // 2. 5-character alphanumeric (older systems)
    // 3. Express service code (10-11 digits)
    // 4. New format with letters and numbers
    
    const patterns = [
        /^[A-Z0-9]{7}$/,           // Standard 7-character: ABC1234
        /^[A-Z0-9]{5}$/,           // 5-character: AB123
        /^[0-9]{10,11}$/,          // Express service code: 1234567890
        /^[A-Z]{1,3}[0-9]{4,5}$/,  // Letter prefix: ABC1234
        /^[0-9]{1,2}[A-Z]{1,2}[0-9]{3,4}$/, // Mixed format: 12AB345
        /^[A-Z0-9]{6}$/            // 6-character format
    ];
    
    // Check against all patterns
    const isValidFormat = patterns.some(pattern => pattern.test(cleanTag));
    
    if (!isValidFormat) {
        return false;
    }
    
    // Additional validation: Dell service tags typically don't contain certain patterns
    const invalidPatterns = [
        /^[0-9]+$/,               // All numbers (unless express service code)
        /^[A-Z]+$/,               // All letters
        /[IOQ]/,                  // Dell typically avoids I, O, Q to prevent confusion
    ];
    
    // Allow all-numeric if it's 10-11 digits (express service code)
    if (/^[0-9]{10,11}$/.test(cleanTag)) {
        return true;
    }
    
    // Check for invalid patterns (except for express service codes)
    if (invalidPatterns.some(pattern => pattern.test(cleanTag))) {
        return false;
    }
    
    return true;
}

/**
 * Log sync activity to data storage
 */
function logSyncActivity(syncResult) {
    try {
        // Store in app's data storage for dashboard display
        const activityData = {
            activities: [{
                timestamp: syncResult.timestamp,
                message: `Dell Asset Sync: ${syncResult.updatedAssets}/${syncResult.totalAssets} assets updated`,
                details: syncResult
            }]
        };
        
        // In a real implementation, you would store this in your preferred data store
        console.log('Sync activity logged:', activityData);
        
    } catch (error) {
        console.error('Error logging sync activity:', error);
    }
}

 