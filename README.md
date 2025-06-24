# Dell Asset Import Manager

A Freshservice FDK application that automatically detects and manages Dell assets across multiple asset types, updating asset tags with Dell service tags imported as serial numbers through the Freshservice agent.

## Overview

This application provides:
- Automatic synchronization of Dell asset tags with service tags
- Scheduled jobs for regular asset updates
- Manual sync capability through the UI
- Activity logging and monitoring
- Asset statistics dashboard

## Features

### Core Functionality
- **Multi-Type Dell Detection**: Automatically detects Dell assets across all asset types using enhanced service tag pattern recognition
- **Flexible Asset Type Support**: Configure specific asset type IDs or let the system auto-detect Dell assets
- **Enhanced Service Tag Validation**: Supports multiple Dell service tag formats (5-7 character alphanumeric, express service codes, mixed formats)
- **Dell Service Tag Sync**: Automatically updates Dell asset tags using the service tag information imported as serial numbers
- **Scheduled Jobs**: Configurable automatic sync intervals (default: 24 hours)
- **Manual Sync**: On-demand synchronization through the application interface
- **Activity Logging**: Tracks all sync operations and results

### User Interface
- Dashboard showing total Dell assets and last sync time
- Real-time sync status and progress indicators
- Activity log viewing
- Clean, responsive design integrated with Freshservice UI

## Installation

### Prerequisites
- Freshservice instance with API access
- Dell asset type configured in Freshservice
- Assets imported through Freshservice agent with serial numbers

### Setup Steps

1. **Install the FDK CLI** (if not already installed):
   ```bash
   npm install -g @freshworks/fdk
   ```

2. **Clone/Download this application**:
   ```bash
   git clone <repository-url>
   cd custom_asset_imports
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the application in development**:
   ```bash
   fdk run
   ```

5. **Install in your Freshservice instance**:
   - Navigate to Admin → Apps → Custom Apps
   - Upload the app package (created with `fdk pack`)
   - Configure the installation parameters

### Configuration Parameters

When installing the app, you'll need to provide:

- **Freshservice Domain**: Your Freshservice subdomain (without .freshservice.com)
- **API Key**: Freshservice API key with asset management permissions
- **Dell Asset Type IDs**: Comma-separated list of asset type IDs for Dell assets (e.g., "1,2,3") - leave empty to scan all types
- **Auto-detect Dell Assets**: Enable automatic detection of Dell assets by service tag format across all asset types (recommended)
- **Sync Schedule**: How often the sync job should run (in hours, default: 24)

## How It Works

### Asset Processing Logic

1. **Asset Discovery**: 
   - **Auto-detect mode**: Scans all assets across all asset types and identifies Dell assets by service tag format
   - **Configured mode**: Queries specific asset type IDs for Dell assets
   - **Fallback mode**: Processes all assets if no configuration is provided

2. **Enhanced Serial Number Validation**: Validates against multiple Dell service tag formats:
   - Standard 7-character alphanumeric (ABC1234)
   - 5-character format for older systems (AB123)
   - Express service codes (10-11 digits)
   - Mixed formats with letter prefixes (ABC1234, 12AB345)
   - 6-character formats

3. **Tag Comparison**: Compares current asset tag with the serial number (service tag)
4. **Asset Update**: If different, updates the asset tag with the service tag and adds service tag information to the description
5. **Logging**: Records the operation results for monitoring and reporting

### Scheduled Jobs

- Automatically runs based on the configured schedule
- Processes all Dell assets in batches
- Handles errors gracefully and continues processing
- Logs results for review

### Manual Sync

- Available through the application interface
- Provides real-time feedback during sync process
- Shows detailed results including number of assets updated
- Updates dashboard statistics immediately

## File Structure

```
custom_asset_imports/
├── manifest.json              # App configuration and metadata
├── package.json              # Node.js dependencies and scripts
├── README.md                 # This documentation
├── config/
│   └── iparams.json         # Installation parameters
├── app/
│   ├── template.html        # Main UI template
│   ├── app.js              # Frontend JavaScript
│   └── style.css           # Application styles
└── server/
    └── server.js           # Backend logic and API handlers
```

## API Endpoints Used

- `GET /api/v2/assets` - Retrieve Dell assets
- `PUT /api/v2/assets/{id}` - Update asset information

## Error Handling

The application includes comprehensive error handling:
- Network connection issues
- API authentication failures
- Invalid asset data
- Service tag format validation
- Rate limiting considerations

## Monitoring and Logging

- Real-time sync status in the UI
- Activity log with timestamps and details
- Error reporting with specific failure reasons
- Success metrics (number of assets processed/updated)

## Development

### Running in Development Mode

```bash
fdk run
```

This starts the app in development mode with hot reloading.

### Testing

```bash
fdk validate
```

Validates the app structure and configuration.

### Packaging

```bash
fdk pack
```

Creates a distributable package for installation.

## Troubleshooting

### Common Issues

1. **API Authentication Errors**
   - Verify API key is correct and has proper permissions
   - Check domain configuration

2. **No Assets Found**
   - If using specific asset type IDs, verify they are correct
   - If using auto-detect, ensure Dell assets have valid service tag format serial numbers
   - Check that assets are imported with serial numbers

3. **Service Tag Format Issues**
   - The app now supports multiple Dell service tag formats
   - Check that serial numbers are valid Dell service tags
   - Review the enhanced validation patterns for your specific Dell models

4. **Sync Not Running**
   - Check scheduled job configuration
   - Review logs for error messages

### Support

For issues or questions:
1. Check the activity logs in the application
2. Review Freshservice API documentation
3. Verify asset type and configuration settings

## License

MIT License - see LICENSE file for details.

## Version History

- **v1.0.0**: Initial release with Dell service tag sync functionality 