# Vinco Media Asset Management Platform

A comprehensive platform for sports media asset management with AI-powered athlete recognition.

## Architecture Overview

**Storage Strategy:**
- **AWS DynamoDB**: Image metadata, edit versions, validation queue, albums, export presets
- **AWS S3**: Actual image files (originals, proxies, thumbnails, exports)
- **WordPress Database**: Athletes, events, results, venues, users, photographers (stored in WordPress MySQL database)
- **WordPress Plugin**: All application logic, UI, and WordPress integration

**No separate database required** - everything uses either AWS (DynamoDB/S3) or WordPress's built-in MySQL database.

## Project Structure

```
vinco-mam/
├── wordpress-plugin/     # Complete WordPress plugin (all code here)
│   ├── vinco-mam.php     # Main plugin file
│   ├── includes/         # PHP classes (Core, API, Database, Auth, Roles)
│   ├── admin/            # Admin interface integration
│   └── assets/build/     # Compiled React app (from admin-ui build)
├── admin-ui/             # React admin application source
│   ├── src/              # React components, hooks, services
│   └── package.json      # Dependencies and build config
├── aws/                  # AWS CDK infrastructure and Lambda functions
│   ├── lib/              # CDK stack definitions
│   ├── lambda/           # Lambda function code
│   └── bin/              # CDK entry point
└── docs/                 # Documentation
```

## Quick Start

### 1. Deploy AWS Infrastructure

```bash
cd aws
npm install
npx cdk bootstrap  # First time only
npx cdk deploy
```

This creates:
- S3 buckets (uploads, images, exports)
- DynamoDB tables (images, edit versions, validation queue, albums, export presets, websocket connections)
- Lambda functions (image processor, AI recognition, RAW processor, export renderer)
- API Gateway (REST + WebSocket)
- SQS queues

### 2. Create Rekognition Collection

```bash
aws rekognition create-collection --collection-id vinco-athletes --region eu-west-2
```

### 3. Build React Admin UI

```bash
cd admin-ui
npm install
npm run build
```

This outputs to `wordpress-plugin/assets/build/`

### 4. Install WordPress Plugin

1. Copy `wordpress-plugin` to `wp-content/plugins/vinco-mam`
2. Activate plugin in WordPress admin
3. Go to Vinco MAM > Settings and configure:
   - AWS Region
   - API Endpoint (from CDK output)
   - WebSocket Endpoint (from CDK output)
   - JWT Secret

### 5. Plugin Creates Database Tables Automatically

On activation, the plugin automatically creates all required tables in the WordPress database:
- Athletes
- Events & Results
- Venues
- Photographers
- Image notes
- Activity logs

## Technology Stack

- **Frontend**: React 18+, TypeScript, TailwindCSS
- **WordPress Plugin**: PHP 8.0+, React admin SPA
- **Backend**: AWS Lambda (Node.js 20.x, Python 3.11), API Gateway (REST + WebSocket)
- **Storage**: DynamoDB (metadata), S3 (images), WordPress MySQL (athletes, events, users)
- **AI/ML**: AWS Rekognition (faces, text)

## Key Features

- Real-time photo ingestion from FTP and S3
- RAW and JPEG processing with non-destructive editing
- AI athlete recognition using facial recognition and bib detection
- Temporal matching to disambiguate athletes using timestamps
- WordPress integration for user management and UI hosting

## Version Management

The plugin uses semantic versioning (major.minor.patch). To bump the version:

```bash
./version-bump.sh [major|minor|patch]
```

This script will:
- Update `wordpress-plugin/vinco-mam.php` (both header version and `VINCO_MAM_VERSION` constant)
- Update `admin-ui/package.json` version
- Provide instructions for rebuilding and packaging

**Important:** After bumping version, remember to:
1. Rebuild React app: `cd admin-ui && npm run build`
2. Update plugin zip: `rm vinco-mam-plugin.zip && zip -r vinco-mam-plugin.zip wordpress-plugin -x "*.git*" "node_modules/*" "*.DS_Store"`
3. Update `wordpress-plugin/CHANGELOG.md` with changes
4. Commit changes: `git add -A && git commit -m "Bump version to X.Y.Z"`

## Development

See individual README files:
- `wordpress-plugin/README.md` - Plugin development
- `admin-ui/README.md` - React UI development
- `aws/README.md` - AWS infrastructure
