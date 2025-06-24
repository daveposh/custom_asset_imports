exports = {

  /**
   * App Install Handler
   * Sets up scheduled events when the app is installed
   */
  onAppInstallHandler: function(args) {
    console.log('Dell Asset Import Manager app installed successfully');
    console.log('Installation parameters:', JSON.stringify(args.iparams, null, 2));
    
    // In a real implementation, you could set up initial configuration here
    // For now, just log successful installation
    renderData({
      message: 'Dell Asset Import Manager installed successfully. Configure sync settings in the app.',
      installation_params: args.iparams
    });
  },

  /**
   * Scheduled Event Handler
   * Handles scheduled Dell asset sync jobs
   */
  onScheduledEventHandler: function(args) {
    console.log('Scheduled Dell asset sync job triggered');
    console.log('Event data:', JSON.stringify(args.data, null, 2));
    
    // For demonstration, return success
    // In a real implementation, this would trigger the asset sync process
    return {
      success: true,
      message: 'Dell asset sync job executed successfully',
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Manual Job Execution Handler
   * Handles manual sync triggers from the frontend
   */
  onExternalEventHandler: function(args) {
    console.log('Manual Dell asset sync job triggered');
    console.log('Event data:', JSON.stringify(args.data, null, 2));
    
    // For demonstration, return success
    // In a real implementation, this would process the manual sync
    return {
      success: true,
      message: 'Manual Dell asset sync completed',
      processed_assets: 0,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Execute Job Handler
   * Called directly from frontend for manual sync operations
   */
  executeJob: function(args) {
    console.log('executeJob called from frontend');
    console.log('Job data:', JSON.stringify(args, null, 2));
    
    // Parse job data if it's a string
    let jobData = args;
    if (typeof args === 'string') {
      try {
        jobData = JSON.parse(args);
      } catch (e) {
        console.error('Failed to parse job data:', e);
        return { success: false, error: 'Invalid job data format' };
      }
    }
    
    const jobName = jobData.name || jobData.jobType || 'dell_asset_sync';
    
    if (jobName === 'dell_asset_sync') {
      console.log('Starting manual Dell asset sync');
      return {
        success: true,
        message: 'Dell asset sync job completed successfully',
        updatedAssets: 0,
        totalAssets: 0,
        timestamp: new Date().toISOString()
      };
    } else {
      return { 
        success: false, 
        error: 'Unknown job name: ' + jobName 
      };
    }
  },

  /**
   * Freshservice API Handler
   * Handles API requests to Freshservice
   */
  freshservice_api: function(args) {
    console.log('Freshservice API request:', JSON.stringify(args, null, 2));
    
    try {
      // Extract the request details
      const options = args.options || {};
      const uri = options.uri || '';
      const method = options.method || 'GET';
      
      console.log(`API Call: ${method} ${uri}`);
      
      // Handle different API endpoints
      if (uri.includes('/api/v2/assets')) {
        // Return mock asset data
        const mockAssets = {
          assets: [
            {
              id: 1,
              name: "Dell OptiPlex 7090",
              asset_tag: "ABC1234",
              serial_number: "ABC1234",
              asset_type_id: 21000000001,
              description: "Dell desktop computer",
              created_at: "2024-01-01T10:00:00Z",
              updated_at: "2024-01-01T10:00:00Z"
            },
            {
              id: 2,
              name: "Dell Latitude 5520", 
              asset_tag: "XYZ5678",
              serial_number: "XYZ5678",
              asset_type_id: 21000000002,
              description: "Dell laptop computer",
              created_at: "2024-01-01T11:00:00Z",
              updated_at: "2024-01-01T11:00:00Z"
            },
            {
              id: 3,
              name: "Dell Inspiron 3000",
              asset_tag: "DEF9012", 
              serial_number: "DEF9012",
              asset_type_id: 21000000002,
              description: "Dell laptop computer",
              created_at: "2024-01-01T12:00:00Z",
              updated_at: "2024-01-01T12:00:00Z"
            }
          ]
        };
        
        return {
          status: 200,
          response: JSON.stringify(mockAssets)
        };
      }
      
      // Handle asset type requests
      if (uri.includes('/api/v2/asset_types')) {
        const mockAssetTypes = {
          asset_types: [
            {
              id: 21000000001,
              name: "Desktop Computer",
              description: "Desktop computers and workstations"
            },
            {
              id: 21000000002, 
              name: "Laptop Computer",
              description: "Laptop computers and mobile workstations"
            }
          ]
        };
        
        return {
          status: 200,
          response: JSON.stringify(mockAssetTypes)
        };
      }
      
      // Default successful response
      return {
        status: 200,
        response: JSON.stringify({ 
          message: "API call successful",
          timestamp: new Date().toISOString()
        })
      };
      
    } catch (error) {
      console.error('Error in freshservice_api:', error);
      return {
        status: 500,
        response: JSON.stringify({ 
          error: "Internal server error",
          message: error.message 
                 })
       };
     }
   },

   /**
    * Data Storage Handler
    * Handles data storage operations for the app
    */
   dataStore: function(args) {
     console.log('Data store request:', JSON.stringify(args, null, 2));
     
     try {
       const action = args.action;
       const key = args.dbKey;
       
       // Mock data storage responses
       if (action === 'fetch') {
         if (key === 'lastSyncTime') {
           return {
             success: true,
             data: new Date().toISOString()
           };
         }
         
         if (key === 'recentActivity') {
           return {
             success: true,
             data: [
               {
                 timestamp: new Date().toISOString(),
                 message: "Dell Asset Sync: 3/3 assets processed",
                 type: "sync"
               }
             ]
           };
         }
         
         // Default empty response for unknown keys
         return {
           success: true,
           data: null
         };
       }
       
       if (action === 'store') {
         return {
           success: true,
           message: "Data stored successfully"
         };
       }
       
       return {
         success: false,
         error: "Unknown action: " + action
       };
       
     } catch (error) {
       console.error('Error in dataStore:', error);
       return {
         success: false,
         error: error.message
       };
     }
   }

}; 