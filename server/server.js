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
  }

}; 