# Changelog

All notable changes to the Vinco MAM WordPress plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-20

### Added
- **Settings Page** with comprehensive configuration options
  - General settings tab (AWS configuration, API endpoints, thresholds)
  - FileMage FTP tab (API token, URL, watch folders configuration)
  - Shortcodes reference tab (complete documentation)
  - Help/Getting Started tab
- **FileMage FTP Integration**
  - FTP watcher Lambda function for automatic image processing
  - Watch folders configuration
  - API token management
- **RouteHandler component** for proper WordPress page routing
- **Settings REST API endpoint** (`/wp-json/vinco-mam/v1/settings`)
- FileMage setup documentation (`FILEMAGE_SETUP.md`)
- Troubleshooting guide (`TROUBLESHOOTING.md`)

### Fixed
- **React Router integration** - Fixed empty backend pages issue
- **WordPress page parameter routing** - App now properly navigates based on WordPress menu clicks
- **Settings persistence** - Settings now save correctly to WordPress options
- **Layout navigation** - Navigation links work correctly

### Changed
- Improved error handling in frontend shortcodes
- Enhanced settings page with tabbed interface
- Better WordPress integration for React app routing

## [1.0.0] - 2025-01-XX

### Added
- Initial release
- Core WordPress plugin structure
- React admin interface
- REST API proxy to AWS
- Frontend shortcodes
- Authentication and role management
- Database tables for WordPress MySQL
- Webhooks handler
