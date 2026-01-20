# Vinco Media Asset Management Platform - Technical Implementation Guide

## Project Overview

Vinco MAM is a sports media asset management platform for track and field broadcasting. It manages photos and videos with AI-powered athlete recognition, designed for high-pressure live event workflows.

### Core Capabilities
- Real-time photo ingestion from FTP (FileMage) and S3
- RAW and JPEG processing with non-destructive Lightroom-style editing
- AI athlete recognition using facial recognition, bib detection, and results correlation
- Temporal matching to disambiguate common names using photo/result timestamps
- JW Player integration for video management
- WordPress plugin UI hosted on Kinsta

### Technology Stack
- **Frontend**: React 18+ with TypeScript, TailwindCSS, WebGL for image editing
- **WordPress Plugin**: PHP 8.0+, React admin SPA
- **Backend**: AWS Lambda (Node.js 20.x, Python 3.11), API Gateway (REST + WebSocket)
- **Databases**: DynamoDB (metadata, edits), PostgreSQL on RDS (athletes, results, relationships)
- **Storage**: S3 (images), S3 Glacier-IA (RAW originals after 30 days)
- **AI/ML**: AWS Rekognition (faces, text), SageMaker (custom models)
- **External**: JW Player API, AthleticsNET API, AthleticsLIVE

---

## Project Structure

```
vinco-mam/
├── wordpress-plugin/
│   ├── vinco-mam.php                 # Main plugin file
│   ├── includes/
│   │   ├── class-vinco-mam.php       # Core plugin class
│   │   ├── class-vinco-api.php       # REST API proxy to AWS
│   │   ├── class-vinco-auth.php      # Authentication & roles
│   │   ├── class-vinco-settings.php  # Plugin settings
│   │   └── class-vinco-webhooks.php  # Incoming webhooks from AWS
│   ├── admin/
│   │   ├── class-vinco-admin.php     # Admin page registration
│   │   └── views/
│   │       └── admin-page.php        # React mount point
│   ├── assets/
│   │   └── build/                    # Compiled React app
│   └── languages/                    # i18n
│
├── admin-ui/                         # React application
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── FilterPills.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── KeyboardShortcuts.tsx
│   │   │   ├── gallery/
│   │   │   │   ├── Gallery.tsx
│   │   │   │   ├── GalleryGrid.tsx
│   │   │   │   ├── GalleryItem.tsx
│   │   │   │   ├── ImagePreview.tsx
│   │   │   │   ├── ImageDetails.tsx
│   │   │   │   └── BurstGroup.tsx
│   │   │   ├── editor/
│   │   │   │   ├── ImageEditor.tsx
│   │   │   │   ├── EditorToolbar.tsx
│   │   │   │   ├── AdjustmentPanel.tsx
│   │   │   │   ├── HistogramDisplay.tsx
│   │   │   │   ├── CropTool.tsx
│   │   │   │   ├── BeforeAfter.tsx
│   │   │   │   ├── VersionHistory.tsx
│   │   │   │   └── webgl/
│   │   │   │       ├── WebGLRenderer.tsx
│   │   │   │       ├── shaders/
│   │   │   │       │   ├── adjustments.glsl
│   │   │   │       │   └── colorCorrection.glsl
│   │   │   │       └── ImageProcessor.ts
│   │   │   ├── validation/
│   │   │   │   ├── ValidationQueue.tsx
│   │   │   │   ├── ValidationItem.tsx
│   │   │   │   ├── AthleteComparison.tsx
│   │   │   │   ├── ReassignModal.tsx
│   │   │   │   └── ValidationStats.tsx
│   │   │   ├── athletes/
│   │   │   │   ├── AthleteList.tsx
│   │   │   │   ├── AthleteCard.tsx
│   │   │   │   ├── AthleteDetail.tsx
│   │   │   │   ├── HeadshotUpload.tsx
│   │   │   │   └── ExternalIdLookup.tsx
│   │   │   ├── albums/
│   │   │   │   ├── AlbumList.tsx
│   │   │   │   ├── AlbumDetail.tsx
│   │   │   │   ├── AlbumCreate.tsx
│   │   │   │   └── AlbumShare.tsx
│   │   │   ├── videos/
│   │   │   │   ├── VideoList.tsx
│   │   │   │   ├── VideoCard.tsx
│   │   │   │   └── VideoDetail.tsx
│   │   │   ├── events/
│   │   │   │   ├── EventDashboard.tsx
│   │   │   │   ├── EventSchedule.tsx
│   │   │   │   ├── EventPicker.tsx
│   │   │   │   └── ResultsPanel.tsx
│   │   │   ├── users/
│   │   │   │   ├── UserManagement.tsx
│   │   │   │   ├── PhotographerSetup.tsx
│   │   │   │   └── RolePermissions.tsx
│   │   │   ├── export/
│   │   │   │   ├── ExportDialog.tsx
│   │   │   │   ├── ExportPresets.tsx
│   │   │   │   └── BatchExport.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── LiveFeed.tsx
│   │   │   │   ├── StatsWidget.tsx
│   │   │   │   ├── QueueWidget.tsx
│   │   │   │   └── ActivityFeed.tsx
│   │   │   └── settings/
│   │   │       ├── Settings.tsx
│   │   │       ├── AWSConfig.tsx
│   │   │       ├── ThresholdConfig.tsx
│   │   │       └── ExportPresetConfig.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useImages.ts
│   │   │   ├── useAthletes.ts
│   │   │   ├── useValidation.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useOfflineQueue.ts
│   │   │   ├── useImageEditor.ts
│   │   │   └── useInfiniteScroll.ts
│   │   ├── stores/
│   │   │   ├── imageStore.ts          # Zustand store
│   │   │   ├── validationStore.ts
│   │   │   ├── userStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── offlineStore.ts
│   │   ├── services/
│   │   │   ├── api.ts                 # API client
│   │   │   ├── websocket.ts           # WebSocket client
│   │   │   ├── imageProcessor.ts      # Client-side image processing
│   │   │   └── offlineSync.ts         # Offline queue sync
│   │   ├── types/
│   │   │   ├── image.ts
│   │   │   ├── athlete.ts
│   │   │   ├── album.ts
│   │   │   ├── event.ts
│   │   │   ├── validation.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       ├── exif.ts
│   │       └── keyboardMap.ts
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── aws/
│   ├── lib/
│   │   ├── vinco-stack.ts            # Main CDK stack
│   │   ├── api-stack.ts              # API Gateway
│   │   ├── storage-stack.ts          # S3, DynamoDB
│   │   ├── database-stack.ts         # RDS PostgreSQL
│   │   ├── processing-stack.ts       # Lambda functions
│   │   └── ai-stack.ts               # Rekognition, SageMaker
│   ├── lambda/
│   │   ├── image-processor/
│   │   │   ├── index.ts              # S3 trigger handler
│   │   │   ├── thumbnail.ts
│   │   │   ├── exif.ts
│   │   │   └── package.json
│   │   ├── raw-processor/
│   │   │   ├── Dockerfile            # Container for LibRaw
│   │   │   ├── handler.py
│   │   │   ├── raw_converter.py
│   │   │   └── requirements.txt
│   │   ├── export-renderer/
│   │   │   ├── Dockerfile
│   │   │   ├── handler.py
│   │   │   ├── render.py
│   │   │   └── requirements.txt
│   │   ├── ai-recognition/
│   │   │   ├── index.ts
│   │   │   ├── faceDetection.ts
│   │   │   ├── bibDetection.ts
│   │   │   ├── temporalMatching.ts
│   │   │   └── confidenceScoring.ts
│   │   ├── results-sync/
│   │   │   ├── index.ts
│   │   │   ├── athleticsLive.ts
│   │   │   └── athleticsNet.ts
│   │   ├── websocket/
│   │   │   ├── connect.ts
│   │   │   ├── disconnect.ts
│   │   │   ├── message.ts
│   │   │   └── broadcast.ts
│   │   ├── api/
│   │   │   ├── images/
│   │   │   │   ├── list.ts
│   │   │   │   ├── get.ts
│   │   │   │   ├── update.ts
│   │   │   │   ├── saveEdits.ts
│   │   │   │   ├── getVersions.ts
│   │   │   │   ├── revert.ts
│   │   │   │   ├── export.ts
│   │   │   │   └── download.ts
│   │   │   ├── albums/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   ├── update.ts
│   │   │   │   └── addImages.ts
│   │   │   ├── athletes/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   ├── update.ts
│   │   │   │   └── uploadHeadshot.ts
│   │   │   ├── validation/
│   │   │   │   ├── queue.ts
│   │   │   │   ├── approve.ts
│   │   │   │   ├── reject.ts
│   │   │   │   └── reassign.ts
│   │   │   ├── videos/
│   │   │   │   ├── list.ts
│   │   │   │   └── get.ts
│   │   │   ├── events/
│   │   │   │   ├── list.ts
│   │   │   │   ├── schedule.ts
│   │   │   │   └── results.ts
│   │   │   ├── users/
│   │   │   │   ├── list.ts
│   │   │   │   ├── create.ts
│   │   │   │   └── photographers.ts
│   │   │   └── search/
│   │   │       └── unified.ts
│   │   └── shared/
│   │       ├── dynamodb.ts
│   │       ├── postgres.ts
│   │       ├── s3.ts
│   │       ├── rekognition.ts
│   │       ├── websocket.ts
│   │       └── auth.ts
│   ├── cdk.json
│   └── package.json
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_athletes.sql
│   │   ├── 003_results.sql
│   │   ├── 004_events.sql
│   │   └── 005_users.sql
│   └── seeds/
│       └── sample_data.sql
│
└── docs/
    ├── api-reference.md
    ├── deployment.md
    └── workflows.md
```

---

## Database Schemas

### DynamoDB Tables

#### vinco-images
```typescript
interface ImageRecord {
  imageId: string;                    // PK: UUID
  uploadTime: string;                 // ISO 8601
  captureTime: string;                // From EXIF DateTimeOriginal
  photographerId: string;             // FK to photographers
  photographerName: string;           // Denormalized for display
  
  // File info
  originalKey: string;                // S3 key for original
  proxyKey: string;                   // S3 key for proxy (2048px)
  thumbnailKey: string;               // S3 key for thumbnail (400px)
  fileType: 'RAW_CR2' | 'RAW_CR3' | 'RAW_NEF' | 'RAW_ARW' | 'RAW_DNG' | 'JPEG' | 'TIFF';
  fileSizeBytes: number;
  dimensions: { width: number; height: number };
  
  // EXIF data
  exif: {
    camera?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    gps?: { lat: number; lng: number };
  };
  
  // Metadata
  title?: string;
  description?: string;
  keywords: string[];
  eventId?: string;
  venueId?: string;
  year?: number;
  
  // Current edit parameters (JSON)
  currentEdits?: EditParameters;
  
  // Recognition
  recognitionStatus: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  recognizedAthletes: Array<{
    athleteId: string;
    confidence: number;
    temporalBoost: number;
    boundingBox: { left: number; top: number; width: number; height: number };
    status: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  }>;
  
  // Status
  status: 'PROCESSING' | 'READY' | 'ARCHIVED';
  priority: 'NORMAL' | 'URGENT';
  starred: boolean;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// GSIs
// - photographerId-uploadTime-index
// - eventId-captureTime-index
// - recognitionStatus-uploadTime-index
// - status-uploadTime-index
```

#### vinco-edit-versions
```typescript
interface EditVersion {
  imageId: string;                    // PK
  versionTimestamp: string;           // SK: ISO 8601
  userId: string;
  userName: string;                   // Denormalized
  edits: EditParameters;
  ttl: number;                        // Unix timestamp for auto-expiry
}

interface EditParameters {
  exposure: number;                   // -5.0 to +5.0
  contrast: number;                   // -100 to +100
  highlights: number;                 // -100 to +100
  shadows: number;                    // -100 to +100
  whites: number;                     // -100 to +100
  blacks: number;                     // -100 to +100
  temperature: number;                // 2000 to 10000 (Kelvin)
  tint: number;                       // -150 to +150
  saturation: number;                 // -100 to +100
  vibrance: number;                   // -100 to +100
  sharpening: {
    amount: number;                   // 0 to 150
    radius: number;                   // 0.5 to 3.0
    detail: number;                   // 0 to 100
    masking: number;                  // 0 to 100
  };
  noiseReduction: {
    luminance: number;                // 0 to 100
    color: number;                    // 0 to 100
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;                 // Degrees
    aspectRatio?: string;             // e.g., "16:9", "4:3", "free"
  };
  lensCorrections: {
    distortion: boolean;
    vignette: boolean;
    chromaticAberration: boolean;
  };
}
```

#### vinco-albums
```typescript
interface AlbumRecord {
  albumId: string;                    // PK: UUID
  name: string;
  description?: string;
  parentAlbumId?: string;             // For hierarchy
  coverImageId?: string;
  imageIds: string[];                 // Ordered array
  imageCount: number;
  
  // Taxonomy
  eventId?: string;
  venueId?: string;
  year?: number;
  
  // Access control
  visibility: 'PRIVATE' | 'AUTHENTICATED' | 'PUBLIC';
  sharedWithUserIds: string[];
  shareLink?: string;
  shareLinkExpiry?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

#### vinco-validation-queue
```typescript
interface ValidationQueueItem {
  queueItemId: string;                // PK: UUID
  imageId: string;
  athleteId: string;
  
  // Recognition data
  confidence: number;
  temporalBoost: number;
  combinedScore: number;
  recognitionMethod: 'FACIAL' | 'BIB' | 'RESULTS' | 'COMBINED';
  boundingBox: { left: number; top: number; width: number; height: number };
  
  // Temporal matching data
  photoCaptureTime: string;
  photoUploadTime: string;
  matchedResultTime?: string;
  matchedEventId?: string;
  timeWindowMinutes: number;
  
  // Queue management
  status: 'PENDING' | 'CLAIMED' | 'COMPLETED';
  claimedBy?: string;
  claimedAt?: string;
  priority: 'NORMAL' | 'URGENT';
  
  // Timestamps
  createdAt: string;
  completedAt?: string;
  
  // TTL for completed items (auto-delete after 7 days)
  ttl?: number;
}

// GSI: status-createdAt-index
// GSI: claimedBy-status-index
```

#### vinco-export-presets
```typescript
interface ExportPreset {
  presetId: string;                   // PK: UUID
  name: string;
  description?: string;
  scope: 'USER' | 'ORGANIZATION';
  createdBy: string;
  
  settings: {
    format: 'JPEG' | 'TIFF' | 'PNG';
    quality: number;                  // 60-100 for JPEG
    maxPixels?: number;               // Long edge max dimension
    maxFileSizeMB?: number;           // Target file size
    colorSpace: 'SRGB' | 'ADOBE_RGB' | 'PROPHOTO_RGB';
    metadata: 'ALL' | 'STRIP_GPS' | 'STRIP_ALL';
    watermark?: {
      templateId: string;
      position: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'CENTER';
      opacity: number;                // 0-100
    };
  };
  
  createdAt: string;
  updatedAt: string;
}
```

#### vinco-websocket-connections
```typescript
interface WebSocketConnection {
  connectionId: string;               // PK
  userId: string;
  userName: string;
  userRole: string;
  connectedAt: string;
  ttl: number;                        // Auto-expire stale connections
}

// GSI: userId-index
```

### PostgreSQL Tables

```sql
-- Athletes table
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- Basic info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    nationality VARCHAR(3),           -- ISO 3166-1 alpha-3
    date_of_birth DATE,
    gender VARCHAR(10),
    
    -- Athletics info
    disciplines TEXT[],               -- Array: ['100m', 'Long Jump']
    team VARCHAR(200),
    
    -- Rekognition
    rekognition_collection_id VARCHAR(100),
    face_count INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_athletes_name ON athletes(last_name, first_name);
CREATE INDEX idx_athletes_nationality ON athletes(nationality);

-- External ID mappings
CREATE TABLE athlete_external_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,      -- 'ATHLETICS_NET', 'ATHLETICS_LIVE', 'WORLD_ATHLETICS', 'CUSTOM'
    external_id VARCHAR(100) NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source, external_id)
);

CREATE INDEX idx_external_ids_athlete ON athlete_external_ids(athlete_id);
CREATE INDEX idx_external_ids_lookup ON athlete_external_ids(source, external_id);

-- Headshots
CREATE TABLE athlete_headshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    s3_key VARCHAR(500) NOT NULL,
    rekognition_face_id VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    source VARCHAR(50),               -- 'UPLOAD', 'EXTRACTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_headshots_athlete ON athlete_headshots(athlete_id);

-- Events/Competitions
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(50),
    event_type VARCHAR(50),           -- 'DIAMOND_LEAGUE', 'WORLD_CHAMPIONSHIPS', etc.
    venue_id UUID REFERENCES venues(id),
    start_date DATE NOT NULL,
    end_date DATE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- External references
    external_source VARCHAR(50),
    external_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(start_date);
CREATE INDEX idx_events_venue ON events(venue_id);

-- Event schedule (individual races/competitions)
CREATE TABLE event_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    discipline VARCHAR(100) NOT NULL,  -- '100m', 'Long Jump'
    round VARCHAR(50),                 -- 'Heats', 'Semi-Final', 'Final'
    heat_number INTEGER,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schedule_event ON event_schedule(event_id);
CREATE INDEX idx_schedule_time ON event_schedule(scheduled_time);

-- Start lists
CREATE TABLE start_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES event_schedule(id) ON DELETE CASCADE,
    athlete_id UUID REFERENCES athletes(id),
    bib_number VARCHAR(20),
    lane INTEGER,
    position INTEGER,
    seed_mark VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_startlist_schedule ON start_lists(schedule_id);
CREATE INDEX idx_startlist_athlete ON start_lists(athlete_id);

-- Results
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES event_schedule(id) ON DELETE CASCADE,
    athlete_id UUID REFERENCES athletes(id),
    
    -- Result data
    finish_position INTEGER,
    mark VARCHAR(50),                  -- Time or distance/height
    mark_numeric DECIMAL(10,3),        -- Numeric for sorting
    wind DECIMAL(4,2),
    reaction_time DECIMAL(5,3),
    
    -- Timing data
    gun_time TIMESTAMP WITH TIME ZONE,
    finish_time TIMESTAMP WITH TIME ZONE,
    
    -- Bib info for matching
    bib_number VARCHAR(20),
    lane INTEGER,
    
    -- Source tracking
    source_system VARCHAR(50) NOT NULL,  -- 'ATHLETICS_LIVE', 'FINISHLYNX', 'OMEGA', 'MANUAL'
    source_result_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'OFFICIAL', -- 'UNOFFICIAL', 'OFFICIAL', 'DNS', 'DNF', 'DQ'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_results_schedule ON results(schedule_id);
CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_time ON results(finish_time);
CREATE INDEX idx_results_source ON results(source_system, source_result_id);

-- Results sources (timing system registry)
CREATE TABLE results_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- 'API', 'WEBSOCKET', 'FILE_IMPORT'
    api_endpoint VARCHAR(500),
    api_key_encrypted VARCHAR(500),
    poll_interval_seconds INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venues
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(3),               -- ISO 3166-1 alpha-3
    timezone VARCHAR(50),
    
    -- Location
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (extends WordPress users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wordpress_user_id BIGINT UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(200),
    
    -- Role
    role VARCHAR(50) NOT NULL,        -- 'PHOTOGRAPHER', 'EDITOR', 'CONTENT_TEAM', 'ADMIN'
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_wp_id ON users(wordpress_user_id);
CREATE INDEX idx_users_role ON users(role);

-- Photographers (extends users)
CREATE TABLE photographers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- FTP credentials
    ftp_username VARCHAR(100) UNIQUE,
    ftp_folder_path VARCHAR(500),
    
    -- Default metadata
    default_copyright VARCHAR(500),
    default_credit VARCHAR(200),
    
    -- Stats
    total_uploads INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_photographers_user ON photographers(user_id);
CREATE INDEX idx_photographers_ftp ON photographers(ftp_username);

-- Image comments/notes
CREATE TABLE image_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id VARCHAR(100) NOT NULL,   -- References DynamoDB imageId
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    mentioned_user_ids UUID[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_image ON image_notes(image_id);
CREATE INDEX idx_notes_user ON image_notes(user_id);

-- Activity log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,     -- 'IMAGE_UPLOAD', 'VALIDATION_APPROVE', etc.
    entity_type VARCHAR(50),          -- 'IMAGE', 'ALBUM', 'ATHLETE'
    entity_id VARCHAR(100),
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_time ON activity_log(created_at);
```

---

## API Specifications

### Authentication
All API requests require a JWT token obtained from WordPress authentication, passed in the `Authorization: Bearer <token>` header.

### REST Endpoints

#### Images

```typescript
// GET /api/v1/images
// List images with filters
interface ListImagesRequest {
  page?: number;
  limit?: number;                     // Default 50, max 200
  sortBy?: 'captureTime' | 'uploadTime' | 'rating';
  sortOrder?: 'asc' | 'desc';
  
  // Filters
  photographerId?: string;
  eventId?: string;
  venueId?: string;
  year?: number;
  dateFrom?: string;                  // ISO 8601
  dateTo?: string;
  recognitionStatus?: string;
  status?: string;
  starred?: boolean;
  minRating?: number;
  search?: string;                    // Full-text search
}

interface ListImagesResponse {
  images: ImageRecord[];
  total: number;
  page: number;
  totalPages: number;
}

// GET /api/v1/images/:imageId
interface GetImageResponse {
  image: ImageRecord;
  signedUrls: {
    original: string;                 // Pre-signed S3 URL, expires in 1 hour
    proxy: string;
    thumbnail: string;
  };
  recognizedAthletes: Array<{
    athlete: AthleteBasic;
    confidence: number;
    boundingBox: BoundingBox;
    status: string;
  }>;
}

// PUT /api/v1/images/:imageId
// Update image metadata
interface UpdateImageRequest {
  title?: string;
  description?: string;
  keywords?: string[];
  eventId?: string;
  venueId?: string;
  starred?: boolean;
  rating?: number;
  priority?: 'NORMAL' | 'URGENT';
}

// PUT /api/v1/images/:imageId/edits
// Save edit parameters (creates new version)
interface SaveEditsRequest {
  edits: EditParameters;
}

interface SaveEditsResponse {
  versionTimestamp: string;
  versionCount: number;
}

// GET /api/v1/images/:imageId/versions
interface GetVersionsResponse {
  versions: Array<{
    versionTimestamp: string;
    userId: string;
    userName: string;
    edits: EditParameters;
  }>;
}

// POST /api/v1/images/:imageId/revert/:versionTimestamp
interface RevertResponse {
  image: ImageRecord;
}

// POST /api/v1/images/:imageId/export
interface ExportRequest {
  presetId?: string;                  // Use preset, or specify settings below
  format?: 'JPEG' | 'TIFF' | 'PNG';
  quality?: number;
  maxPixels?: number;
  maxFileSizeMB?: number;
  colorSpace?: string;
  metadata?: 'ALL' | 'STRIP_GPS' | 'STRIP_ALL';
  watermarkTemplateId?: string;
  includeXmpSidecar?: boolean;        // For original downloads
}

interface ExportResponse {
  exportId: string;
  status: 'QUEUED' | 'PROCESSING';
  estimatedSeconds: number;
}

// GET /api/v1/images/:imageId/download/original
// Returns redirect to pre-signed S3 URL
```

#### Albums

```typescript
// GET /api/v1/albums
interface ListAlbumsResponse {
  albums: AlbumRecord[];
}

// POST /api/v1/albums
interface CreateAlbumRequest {
  name: string;
  description?: string;
  parentAlbumId?: string;
  eventId?: string;
  venueId?: string;
  year?: number;
  visibility?: 'PRIVATE' | 'AUTHENTICATED' | 'PUBLIC';
}

// PUT /api/v1/albums/:albumId
interface UpdateAlbumRequest {
  name?: string;
  description?: string;
  coverImageId?: string;
  visibility?: string;
}

// PUT /api/v1/albums/:albumId/images
interface UpdateAlbumImagesRequest {
  addImageIds?: string[];
  removeImageIds?: string[];
  reorderImageIds?: string[];         // Full ordered list
}

// POST /api/v1/albums/:albumId/share
interface ShareAlbumRequest {
  expiryDays?: number;                // null = no expiry
}

interface ShareAlbumResponse {
  shareLink: string;
  expiresAt?: string;
}
```

#### Athletes

```typescript
// GET /api/v1/athletes
interface ListAthletesRequest {
  search?: string;
  nationality?: string;
  discipline?: string;
  eventId?: string;                   // Athletes in start list for event
  limit?: number;
  offset?: number;
}

interface ListAthletesResponse {
  athletes: AthleteWithHeadshot[];
  total: number;
}

interface AthleteWithHeadshot {
  id: string;
  internalId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  nationality: string;
  disciplines: string[];
  headshot?: {
    thumbnailUrl: string;
  };
  externalIds: Array<{
    source: string;
    externalId: string;
  }>;
}

// POST /api/v1/athletes
interface CreateAthleteRequest {
  firstName: string;
  lastName: string;
  displayName?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: string;
  disciplines?: string[];
  team?: string;
  externalIds?: Array<{
    source: string;
    externalId: string;
  }>;
}

// POST /api/v1/athletes/:athleteId/headshot
// Multipart form upload
// Returns: { headshotId: string, rekognitionFaceId: string }

// GET /api/v1/athletes/lookup
// Lookup by external ID
interface LookupAthleteRequest {
  source: 'ATHLETICS_NET' | 'ATHLETICS_LIVE';
  externalId: string;
}

interface LookupAthleteResponse {
  found: boolean;
  athlete?: AthleteWithHeadshot;
  externalData?: any;                 // Raw data from external source
}
```

#### Validation Queue

```typescript
// GET /api/v1/validation/queue
interface GetValidationQueueRequest {
  status?: 'PENDING' | 'CLAIMED';
  priority?: 'NORMAL' | 'URGENT';
  claimedBy?: string;                 // 'me' for current user
  limit?: number;
}

interface GetValidationQueueResponse {
  items: ValidationQueueItemWithDetails[];
  total: number;
  stats: {
    pending: number;
    claimed: number;
    completedToday: number;
  };
}

interface ValidationQueueItemWithDetails {
  queueItemId: string;
  image: {
    imageId: string;
    thumbnailUrl: string;
    captureTime: string;
    eventName?: string;
  };
  suggestedAthlete: {
    athleteId: string;
    displayName: string;
    headshotUrl?: string;
    nationality: string;
  };
  confidence: number;
  temporalBoost: number;
  combinedScore: number;
  recognitionMethod: string;
  boundingBox: BoundingBox;
  status: string;
  claimedBy?: string;
  priority: string;
}

// POST /api/v1/validation/:queueItemId/claim
interface ClaimResponse {
  success: boolean;
  claimedUntil: string;               // Auto-release after 5 minutes
}

// POST /api/v1/validation/:queueItemId/approve
interface ApproveResponse {
  success: boolean;
  athleteUpdated: boolean;            // Face added to Rekognition
}

// POST /api/v1/validation/:queueItemId/reject
interface RejectResponse {
  success: boolean;
}

// POST /api/v1/validation/:queueItemId/reassign
interface ReassignRequest {
  newAthleteId: string;
}

interface ReassignResponse {
  success: boolean;
  athleteUpdated: boolean;
}

// POST /api/v1/validation/bulk
interface BulkValidationRequest {
  actions: Array<{
    queueItemId: string;
    action: 'APPROVE' | 'REJECT';
  }>;
}
```

#### Videos (JW Player)

```typescript
// GET /api/v1/videos
interface ListVideosRequest {
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

interface ListVideosResponse {
  videos: JWPlayerVideo[];
  total: number;
}

interface JWPlayerVideo {
  mediaId: string;
  title: string;
  description?: string;
  duration: number;                   // Seconds
  publishDate: string;
  tags: string[];
  thumbnailUrl: string;
  status: string;
  
  // For V1, provide link to JW Player dashboard
  jwPlayerDashboardUrl: string;
}

// GET /api/v1/videos/:mediaId
interface GetVideoResponse {
  video: JWPlayerVideo;
  embedCode?: string;
}
```

#### Events & Results

```typescript
// GET /api/v1/events
interface ListEventsRequest {
  dateFrom?: string;
  dateTo?: string;
  venueId?: string;
}

// GET /api/v1/events/:eventId/schedule
interface GetScheduleResponse {
  event: Event;
  schedule: ScheduleItem[];
}

interface ScheduleItem {
  id: string;
  discipline: string;
  round: string;
  heatNumber?: number;
  scheduledTime: string;
  actualStartTime?: string;
  status: string;
  athleteCount: number;
}

// GET /api/v1/events/:eventId/schedule/:scheduleId/results
interface GetResultsResponse {
  schedule: ScheduleItem;
  results: Result[];
  startList: StartListEntry[];
}

// POST /api/v1/results/import
interface ImportResultsRequest {
  scheduleId: string;
  sourceSystem: string;
  results: Array<{
    athleteExternalId?: string;
    athleteName?: string;
    bibNumber: string;
    lane?: number;
    finishPosition: number;
    mark: string;
    markNumeric: number;
    wind?: number;
    reactionTime?: number;
    gunTime?: string;
    finishTime?: string;
    status: string;
    sourceResultId?: string;
  }>;
}
```

#### Search

```typescript
// GET /api/v1/search
interface UnifiedSearchRequest {
  query: string;
  types?: Array<'IMAGE' | 'ATHLETE' | 'ALBUM' | 'EVENT' | 'VIDEO'>;
  limit?: number;
}

interface UnifiedSearchResponse {
  results: Array<{
    type: string;
    id: string;
    title: string;
    subtitle?: string;
    thumbnailUrl?: string;
    score: number;
  }>;
}
```

#### Users & Photographers

```typescript
// GET /api/v1/users
// Admin only
interface ListUsersResponse {
  users: User[];
}

// POST /api/v1/users
interface CreateUserRequest {
  wordpressUserId: number;
  email: string;
  displayName: string;
  role: 'PHOTOGRAPHER' | 'EDITOR' | 'CONTENT_TEAM' | 'ADMIN';
}

// GET /api/v1/photographers
interface ListPhotographersResponse {
  photographers: PhotographerWithUser[];
}

interface PhotographerWithUser {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  ftpUsername: string;
  ftpFolderPath: string;
  totalUploads: number;
  lastUploadAt?: string;
}

// POST /api/v1/photographers
interface CreatePhotographerRequest {
  userId: string;
  ftpUsername: string;
  defaultCopyright?: string;
  defaultCredit?: string;
}

interface CreatePhotographerResponse {
  photographer: PhotographerWithUser;
  ftpCredentials: {
    host: string;
    port: number;
    username: string;
    password: string;                 // Only returned on creation
    folderPath: string;
  };
}
```

### WebSocket Events

Connect to: `wss://api.vinco.example.com/ws?token=<jwt>`

#### Client → Server

```typescript
// Subscribe to events
{ action: 'subscribe', channels: ['images', 'validation', 'albums'] }

// Unsubscribe
{ action: 'unsubscribe', channels: ['images'] }

// Ping (keepalive)
{ action: 'ping' }
```

#### Server → Client

```typescript
// New image uploaded and processed
{
  event: 'image.new',
  data: {
    imageId: string;
    thumbnailUrl: string;
    photographerName: string;
    captureTime: string;
    eventName?: string;
  }
}

// AI recognition completed
{
  event: 'image.recognition',
  data: {
    imageId: string;
    recognizedAthletes: Array<{
      athleteId: string;
      athleteName: string;
      confidence: number;
      status: string;
    }>;
    addedToValidationQueue: boolean;
  }
}

// Export ready for download
{
  event: 'image.export.complete',
  data: {
    exportId: string;
    imageId: string;
    downloadUrl: string;              // Pre-signed, expires in 1 hour
    fileSizeBytes: number;
  }
}

// New validation item
{
  event: 'validation.new',
  data: {
    queueItemId: string;
    imageId: string;
    athleteName: string;
    confidence: number;
    priority: string;
  }
}

// Validation queue stats update
{
  event: 'validation.stats',
  data: {
    pending: number;
    claimed: number;
    completedToday: number;
  }
}

// Album updated
{
  event: 'album.updated',
  data: {
    albumId: string;
    albumName: string;
    action: 'IMAGES_ADDED' | 'IMAGES_REMOVED' | 'PUBLISHED';
    imageCount: number;
  }
}

// User presence
{
  event: 'presence.update',
  data: {
    onlineUsers: Array<{
      userId: string;
      displayName: string;
      role: string;
    }>;
  }
}

// Pong response
{
  event: 'pong',
  data: { timestamp: number }
}
```

---

## Lambda Function Specifications

### Image Processor (S3 Trigger)

**Trigger**: S3 ObjectCreated event on `vinco-uploads` bucket

```typescript
// lambda/image-processor/index.ts
import { S3Event, Context } from 'aws-lambda';
import { processImage } from './processor';

export const handler = async (event: S3Event, context: Context) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);
    
    // Parse key: photographers/{username}/{date}/{filename}
    const [, photographerUsername, date, filename] = key.split('/');
    
    // Determine file type from extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const isRaw = ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'dng'].includes(ext);
    
    if (isRaw) {
      // Queue for RAW processor (container Lambda)
      await queueRawProcessing(bucket, key, photographerUsername);
    } else {
      // Process JPEG/TIFF directly
      await processImage(bucket, key, photographerUsername);
    }
  }
};

async function processImage(bucket: string, key: string, photographer: string) {
  // 1. Download image
  // 2. Extract EXIF data
  // 3. Generate thumbnail (400px)
  // 4. Generate proxy (2048px)
  // 5. Upload to processed bucket
  // 6. Save metadata to DynamoDB
  // 7. Queue for AI recognition
  // 8. Broadcast WebSocket event
}
```

### RAW Processor (Container Lambda)

**Dockerfile**:
```dockerfile
FROM public.ecr.aws/lambda/python:3.11

# Install LibRaw and ImageMagick
RUN yum install -y libraw-devel ImageMagick ImageMagick-devel

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY handler.py .
COPY raw_converter.py .

CMD ["handler.lambda_handler"]
```

```python
# lambda/raw-processor/handler.py
import json
import boto3
from raw_converter import convert_raw

def lambda_handler(event, context):
    bucket = event['bucket']
    key = event['key']
    photographer = event['photographer']
    
    # Download RAW file
    s3 = boto3.client('s3')
    raw_path = f'/tmp/{key.split("/")[-1]}'
    s3.download_file(bucket, key, raw_path)
    
    # Extract embedded preview (fast)
    preview_path = convert_raw(raw_path, extract_preview=True)
    
    # Convert to high-quality JPEG proxy
    proxy_path = convert_raw(raw_path, output_size=2048)
    
    # Generate thumbnail
    thumbnail_path = convert_raw(raw_path, output_size=400)
    
    # Upload processed files
    # ... upload to S3
    
    # Save metadata to DynamoDB
    # ... save record
    
    # Move original to Glacier-IA tier (via lifecycle policy)
    
    # Queue for AI recognition
    # ... send to SQS
    
    return {'statusCode': 200}
```

### AI Recognition

```typescript
// lambda/ai-recognition/index.ts
import { SQSEvent } from 'aws-lambda';
import { detectFaces, searchFaces } from './faceDetection';
import { detectText, extractBibNumbers } from './bibDetection';
import { matchWithResults } from './temporalMatching';
import { calculateConfidence } from './confidenceScoring';

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const { imageId, s3Key, captureTime, uploadTime, eventId } = JSON.parse(record.body);
    
    // 1. Detect faces
    const faces = await detectFaces(s3Key);
    
    // 2. For each face, search Rekognition collection
    const faceMatches = await Promise.all(
      faces.map(face => searchFaces(face.boundingBox, s3Key))
    );
    
    // 3. Detect text (bib numbers)
    const textDetections = await detectText(s3Key);
    const bibNumbers = extractBibNumbers(textDetections);
    
    // 4. Match bibs with start list/results
    const bibMatches = await matchBibsToAthletes(bibNumbers, eventId);
    
    // 5. Temporal matching - compare timestamps
    const temporalMatches = await matchWithResults(
      captureTime,
      uploadTime,
      eventId,
      bibMatches.map(m => m.athleteId)
    );
    
    // 6. Calculate combined confidence scores
    const recognitions = calculateConfidence({
      faceMatches,
      bibMatches,
      temporalMatches,
      captureTime,
    });
    
    // 7. Auto-approve high confidence, queue others for validation
    for (const recognition of recognitions) {
      if (recognition.combinedScore >= 85) {
        // Auto-approve
        await saveRecognition(imageId, recognition, 'AUTO_APPROVED');
        await addFaceToCollection(recognition);
      } else if (recognition.combinedScore >= 50) {
        // Add to validation queue
        await addToValidationQueue(imageId, recognition);
      }
      // Below 50% - ignore
    }
    
    // 8. Update image record
    await updateImageRecognitionStatus(imageId, recognitions);
    
    // 9. Broadcast WebSocket event
    await broadcastRecognitionComplete(imageId, recognitions);
  }
};
```

### Export Renderer (Container Lambda)

```python
# lambda/export-renderer/handler.py
import json
import boto3
from PIL import Image
from render import apply_edits, apply_watermark, resize_to_constraints

def lambda_handler(event, context):
    image_id = event['imageId']
    export_settings = event['settings']
    edits = event['edits']
    user_id = event['userId']
    
    s3 = boto3.client('s3')
    dynamodb = boto3.resource('dynamodb')
    
    # Download proxy image (or original if no resize needed)
    source_key = event['sourceKey']
    local_path = f'/tmp/source.jpg'
    s3.download_file('vinco-images', source_key, local_path)
    
    # Load image
    img = Image.open(local_path)
    
    # Apply edits
    img = apply_edits(img, edits)
    
    # Resize to constraints
    img = resize_to_constraints(
        img,
        max_pixels=export_settings.get('maxPixels'),
        max_file_size_mb=export_settings.get('maxFileSizeMB'),
        quality=export_settings.get('quality', 90)
    )
    
    # Apply watermark if requested
    if export_settings.get('watermark'):
        img = apply_watermark(img, export_settings['watermark'])
    
    # Convert color space
    img = convert_color_space(img, export_settings.get('colorSpace', 'SRGB'))
    
    # Handle metadata
    metadata = handle_metadata(img, export_settings.get('metadata', 'ALL'))
    
    # Save to temp
    output_format = export_settings.get('format', 'JPEG')
    output_path = f'/tmp/export.{output_format.lower()}'
    save_with_format(img, output_path, output_format, export_settings.get('quality', 90))
    
    # Upload to exports bucket
    export_key = f'exports/{user_id}/{image_id}/{event["exportId"]}.{output_format.lower()}'
    s3.upload_file(output_path, 'vinco-exports', export_key)
    
    # Generate pre-signed URL
    download_url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'vinco-exports', 'Key': export_key},
        ExpiresIn=3600
    )
    
    # Broadcast completion via WebSocket
    broadcast_export_complete(user_id, image_id, event['exportId'], download_url)
    
    return {
        'statusCode': 200,
        'exportId': event['exportId'],
        'downloadUrl': download_url
    }
```

---

## WordPress Plugin Implementation

### Main Plugin File

```php
<?php
/**
 * Plugin Name: Vinco Media Asset Management
 * Description: Sports media asset management with AI-powered athlete recognition
 * Version: 1.0.0
 * Requires PHP: 8.0
 */

defined('ABSPATH') || exit;

define('VINCO_MAM_VERSION', '1.0.0');
define('VINCO_MAM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VINCO_MAM_PLUGIN_URL', plugin_dir_url(__FILE__));

// Autoloader
spl_autoload_register(function ($class) {
    $prefix = 'Vinco_MAM_';
    if (strpos($class, $prefix) !== 0) return;
    
    $relative_class = substr($class, strlen($prefix));
    $file = VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-' . 
            strtolower(str_replace('_', '-', $relative_class)) . '.php';
    
    if (file_exists($file)) require $file;
});

// Initialize plugin
add_action('plugins_loaded', function() {
    Vinco_MAM_Core::instance();
});

// Activation hook
register_activation_hook(__FILE__, ['Vinco_MAM_Core', 'activate']);

// Deactivation hook
register_deactivation_hook(__FILE__, ['Vinco_MAM_Core', 'deactivate']);
```

### Core Class

```php
<?php
// includes/class-vinco-core.php

class Vinco_MAM_Core {
    private static $instance = null;
    
    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->load_dependencies();
        $this->define_admin_hooks();
        $this->define_api_hooks();
    }
    
    private function load_dependencies() {
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-settings.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-api.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-auth.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-admin.php';
        require_once VINCO_MAM_PLUGIN_DIR . 'includes/class-vinco-roles.php';
    }
    
    private function define_admin_hooks() {
        $admin = new Vinco_MAM_Admin();
        
        add_action('admin_menu', [$admin, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$admin, 'enqueue_scripts']);
    }
    
    private function define_api_hooks() {
        $api = new Vinco_MAM_API();
        
        add_action('rest_api_init', [$api, 'register_routes']);
    }
    
    public static function activate() {
        // Create custom roles
        Vinco_MAM_Roles::create_roles();
        
        // Create options
        add_option('vinco_mam_settings', [
            'aws_region' => 'eu-west-2',
            'api_endpoint' => '',
            'websocket_endpoint' => '',
            'auto_approve_threshold' => 85,
            'review_threshold' => 50,
            'edit_version_retention_days' => 90,
        ]);
        
        flush_rewrite_rules();
    }
    
    public static function deactivate() {
        flush_rewrite_rules();
    }
}
```

### Admin Page

```php
<?php
// includes/class-vinco-admin.php

class Vinco_MAM_Admin {
    
    public function add_admin_menu() {
        // Main menu
        add_menu_page(
            'Vinco MAM',
            'Vinco MAM',
            'read',
            'vinco-mam',
            [$this, 'render_main_page'],
            'dashicons-format-gallery',
            30
        );
        
        // Submenus
        add_submenu_page('vinco-mam', 'Gallery', 'Gallery', 'read', 'vinco-mam', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Validation', 'Validation', 'edit_posts', 'vinco-mam-validation', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Athletes', 'Athletes', 'edit_posts', 'vinco-mam-athletes', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Albums', 'Albums', 'read', 'vinco-mam-albums', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Videos', 'Videos', 'read', 'vinco-mam-videos', [$this, 'render_main_page']);
        add_submenu_page('vinco-mam', 'Settings', 'Settings', 'manage_options', 'vinco-mam-settings', [$this, 'render_main_page']);
    }
    
    public function enqueue_scripts($hook) {
        if (strpos($hook, 'vinco-mam') === false) return;
        
        $asset_file = VINCO_MAM_PLUGIN_DIR . 'assets/build/index.asset.php';
        $assets = file_exists($asset_file) ? require($asset_file) : ['dependencies' => [], 'version' => VINCO_MAM_VERSION];
        
        wp_enqueue_script(
            'vinco-mam-admin',
            VINCO_MAM_PLUGIN_URL . 'assets/build/index.js',
            $assets['dependencies'],
            $assets['version'],
            true
        );
        
        wp_enqueue_style(
            'vinco-mam-admin',
            VINCO_MAM_PLUGIN_URL . 'assets/build/index.css',
            [],
            $assets['version']
        );
        
        // Pass data to React app
        wp_localize_script('vinco-mam-admin', 'vincoMAM', [
            'apiRoot' => esc_url_raw(rest_url('vinco-mam/v1/')),
            'nonce' => wp_create_nonce('wp_rest'),
            'settings' => get_option('vinco_mam_settings'),
            'user' => [
                'id' => get_current_user_id(),
                'displayName' => wp_get_current_user()->display_name,
                'email' => wp_get_current_user()->user_email,
                'role' => $this->get_vinco_role(),
                'capabilities' => $this->get_user_capabilities(),
            ],
            'currentPage' => $this->get_current_page(),
        ]);
    }
    
    public function render_main_page() {
        echo '<div id="vinco-mam-root"></div>';
    }
    
    private function get_vinco_role() {
        $user = wp_get_current_user();
        
        if (in_array('administrator', $user->roles)) return 'ADMIN';
        if (in_array('vinco_editor', $user->roles) || in_array('editor', $user->roles)) return 'EDITOR';
        if (in_array('vinco_content', $user->roles)) return 'CONTENT_TEAM';
        if (in_array('vinco_photographer', $user->roles)) return 'PHOTOGRAPHER';
        
        return 'VIEWER';
    }
    
    private function get_user_capabilities() {
        $role = $this->get_vinco_role();
        
        $capabilities = [
            'ADMIN' => [
                'viewGallery', 'editImages', 'downloadOriginal', 'downloadExport',
                'manageAlbums', 'validateRecognition', 'manageAthletes',
                'viewVideos', 'manageUsers', 'manageSettings'
            ],
            'EDITOR' => [
                'viewGallery', 'editImages', 'downloadOriginal', 'downloadExport',
                'manageAlbums', 'validateRecognition', 'manageAthletes', 'viewVideos'
            ],
            'CONTENT_TEAM' => [
                'viewGallery', 'downloadExport', 'viewAlbums', 'viewAthletes', 'viewVideos'
            ],
            'PHOTOGRAPHER' => [
                'viewOwnUploads', 'viewFtpCredentials', 'viewAlbums'
            ],
        ];
        
        return $capabilities[$role] ?? [];
    }
    
    private function get_current_page() {
        $screen = get_current_screen();
        $page = str_replace('toplevel_page_', '', $screen->id);
        $page = str_replace('vinco-mam_page_', '', $page);
        return $page;
    }
}
```

### Custom Roles

```php
<?php
// includes/class-vinco-roles.php

class Vinco_MAM_Roles {
    
    public static function create_roles() {
        // Photographer role
        add_role('vinco_photographer', 'Vinco Photographer', [
            'read' => true,
            'vinco_view_own_uploads' => true,
            'vinco_view_ftp_credentials' => true,
        ]);
        
        // Editor role (uses WordPress editor + custom caps)
        $editor = get_role('editor');
        if ($editor) {
            $editor->add_cap('vinco_edit_images');
            $editor->add_cap('vinco_validate_recognition');
            $editor->add_cap('vinco_manage_albums');
            $editor->add_cap('vinco_manage_athletes');
        }
        
        // Content Team role
        add_role('vinco_content', 'Vinco Content Team', [
            'read' => true,
            'vinco_view_gallery' => true,
            'vinco_download_exports' => true,
            'vinco_view_albums' => true,
            'vinco_view_athletes' => true,
            'vinco_view_videos' => true,
        ]);
        
        // Admin gets all capabilities
        $admin = get_role('administrator');
        if ($admin) {
            $admin->add_cap('vinco_manage_settings');
            $admin->add_cap('vinco_manage_users');
            $admin->add_cap('vinco_edit_images');
            $admin->add_cap('vinco_validate_recognition');
            $admin->add_cap('vinco_manage_albums');
            $admin->add_cap('vinco_manage_athletes');
            $admin->add_cap('vinco_download_original');
        }
    }
    
    public static function remove_roles() {
        remove_role('vinco_photographer');
        remove_role('vinco_content');
    }
}
```

### REST API Proxy

```php
<?php
// includes/class-vinco-api.php

class Vinco_MAM_API {
    
    private $aws_endpoint;
    
    public function __construct() {
        $settings = get_option('vinco_mam_settings');
        $this->aws_endpoint = $settings['api_endpoint'] ?? '';
    }
    
    public function register_routes() {
        // Proxy all requests to AWS API Gateway
        register_rest_route('vinco-mam/v1', '/(?P<path>.+)', [
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => [$this, 'proxy_request'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
    }
    
    public function check_permission($request) {
        // Basic authentication check
        if (!is_user_logged_in()) {
            return new WP_Error('unauthorized', 'You must be logged in', ['status' => 401]);
        }
        
        // Check specific permissions based on endpoint
        $path = $request->get_param('path');
        $method = $request->get_method();
        
        // Define permission requirements
        $permissions = [
            'GET:images' => 'read',
            'PUT:images' => 'vinco_edit_images',
            'GET:validation' => 'vinco_validate_recognition',
            'POST:validation' => 'vinco_validate_recognition',
            'GET:athletes' => 'read',
            'POST:athletes' => 'vinco_manage_athletes',
            'GET:users' => 'vinco_manage_users',
            'POST:users' => 'vinco_manage_users',
            'GET:photographers' => 'vinco_manage_users',
            'POST:photographers' => 'vinco_manage_users',
        ];
        
        foreach ($permissions as $pattern => $cap) {
            [$reqMethod, $pathPrefix] = explode(':', $pattern);
            if ($method === $reqMethod && strpos($path, $pathPrefix) === 0) {
                if (!current_user_can($cap)) {
                    return new WP_Error('forbidden', 'Insufficient permissions', ['status' => 403]);
                }
                break;
            }
        }
        
        return true;
    }
    
    public function proxy_request($request) {
        $path = $request->get_param('path');
        $method = $request->get_method();
        $body = $request->get_json_params();
        $query = $request->get_query_params();
        unset($query['path']);
        
        // Build URL
        $url = trailingslashit($this->aws_endpoint) . $path;
        if (!empty($query)) {
            $url .= '?' . http_build_query($query);
        }
        
        // Generate JWT for AWS
        $jwt = $this->generate_jwt();
        
        // Make request
        $response = wp_remote_request($url, [
            'method' => $method,
            'headers' => [
                'Authorization' => 'Bearer ' . $jwt,
                'Content-Type' => 'application/json',
            ],
            'body' => $method !== 'GET' ? json_encode($body) : null,
            'timeout' => 30,
        ]);
        
        if (is_wp_error($response)) {
            return new WP_Error('proxy_error', $response->get_error_message(), ['status' => 500]);
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        return new WP_REST_Response($body, $status_code);
    }
    
    private function generate_jwt() {
        $user = wp_get_current_user();
        $settings = get_option('vinco_mam_settings');
        
        $payload = [
            'sub' => $user->ID,
            'email' => $user->user_email,
            'name' => $user->display_name,
            'role' => $this->get_vinco_role($user),
            'iat' => time(),
            'exp' => time() + 3600,
        ];
        
        // Sign with shared secret (in production, use proper key management)
        $secret = $settings['jwt_secret'] ?? '';
        
        return $this->jwt_encode($payload, $secret);
    }
    
    private function jwt_encode($payload, $secret) {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        
        $segments = [];
        $segments[] = $this->base64url_encode(json_encode($header));
        $segments[] = $this->base64url_encode(json_encode($payload));
        
        $signing_input = implode('.', $segments);
        $signature = hash_hmac('sha256', $signing_input, $secret, true);
        $segments[] = $this->base64url_encode($signature);
        
        return implode('.', $segments);
    }
    
    private function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private function get_vinco_role($user) {
        if (in_array('administrator', $user->roles)) return 'ADMIN';
        if (in_array('vinco_editor', $user->roles) || in_array('editor', $user->roles)) return 'EDITOR';
        if (in_array('vinco_content', $user->roles)) return 'CONTENT_TEAM';
        if (in_array('vinco_photographer', $user->roles)) return 'PHOTOGRAPHER';
        return 'VIEWER';
    }
}
```

---

## React Application Key Components

### App Entry Point

```tsx
// admin-ui/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { useUserStore } from './stores/userStore';
import { WebSocketProvider } from './context/WebSocketContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';

import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Gallery from './components/gallery/Gallery';
import ImageEditor from './components/editor/ImageEditor';
import ValidationQueue from './components/validation/ValidationQueue';
import AthleteList from './components/athletes/AthleteList';
import AthleteDetail from './components/athletes/AthleteDetail';
import AlbumList from './components/albums/AlbumList';
import AlbumDetail from './components/albums/AlbumDetail';
import VideoList from './components/videos/VideoList';
import UserManagement from './components/users/UserManagement';
import Settings from './components/settings/Settings';
import PhotographerDashboard from './components/photographer/PhotographerDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
    },
  },
});

export default function App() {
  const { user, capabilities } = useUserStore();
  
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <KeyboardShortcutsProvider>
          <BrowserRouter basename="/wp-admin/admin.php">
            <Layout>
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Navigate to="/page=vinco-mam" replace />} />
                <Route path="/page=vinco-mam" element={<Dashboard />} />
                
                {/* Gallery */}
                <Route path="/page=vinco-mam-gallery" element={<Gallery />} />
                <Route path="/page=vinco-mam-gallery/:imageId" element={<ImageEditor />} />
                
                {/* Validation */}
                {capabilities.includes('validateRecognition') && (
                  <Route path="/page=vinco-mam-validation" element={<ValidationQueue />} />
                )}
                
                {/* Athletes */}
                <Route path="/page=vinco-mam-athletes" element={<AthleteList />} />
                <Route path="/page=vinco-mam-athletes/:athleteId" element={<AthleteDetail />} />
                
                {/* Albums */}
                <Route path="/page=vinco-mam-albums" element={<AlbumList />} />
                <Route path="/page=vinco-mam-albums/:albumId" element={<AlbumDetail />} />
                
                {/* Videos */}
                <Route path="/page=vinco-mam-videos" element={<VideoList />} />
                
                {/* Photographer Dashboard */}
                {user.role === 'PHOTOGRAPHER' && (
                  <Route path="/page=vinco-mam-my-uploads" element={<PhotographerDashboard />} />
                )}
                
                {/* Admin */}
                {capabilities.includes('manageUsers') && (
                  <Route path="/page=vinco-mam-users" element={<UserManagement />} />
                )}
                {capabilities.includes('manageSettings') && (
                  <Route path="/page=vinco-mam-settings" element={<Settings />} />
                )}
              </Routes>
            </Layout>
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </KeyboardShortcutsProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
```

### WebSocket Hook

```tsx
// admin-ui/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '../stores/userStore';

type EventHandler = (data: any) => void;

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const handlers = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectAttempts = useRef(0);
  const { user } = useUserStore();
  
  const connect = useCallback(() => {
    const { websocket_endpoint } = window.vincoMAM.settings;
    const token = window.vincoMAM.nonce; // In production, use proper JWT
    
    ws.current = new WebSocket(`${websocket_endpoint}?token=${token}`);
    
    ws.current.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts.current = 0;
      
      // Subscribe to default channels
      ws.current?.send(JSON.stringify({
        action: 'subscribe',
        channels: ['images', 'validation', 'albums']
      }));
    };
    
    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const eventHandlers = handlers.current.get(message.event);
        if (eventHandlers) {
          eventHandlers.forEach(handler => handler(message.data));
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };
    
    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      
      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      
      setTimeout(connect, delay);
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);
  
  useEffect(() => {
    connect();
    
    // Keepalive ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      ws.current?.close();
    };
  }, [connect]);
  
  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!handlers.current.has(event)) {
      handlers.current.set(event, new Set());
    }
    handlers.current.get(event)!.add(handler);
    
    return () => {
      handlers.current.get(event)?.delete(handler);
    };
  }, []);
  
  const send = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);
  
  return { subscribe, send, isConnected: ws.current?.readyState === WebSocket.OPEN };
}
```

### Image Editor with WebGL

```tsx
// admin-ui/src/components/editor/ImageEditor.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHotkeys } from 'react-hotkeys-hook';
import toast from 'react-hot-toast';

import { api } from '../../services/api';
import { WebGLRenderer } from './webgl/WebGLRenderer';
import { AdjustmentPanel } from './AdjustmentPanel';
import { HistogramDisplay } from './HistogramDisplay';
import { CropTool } from './CropTool';
import { BeforeAfter } from './BeforeAfter';
import { VersionHistory } from './VersionHistory';
import { ExportDialog } from '../export/ExportDialog';
import { EditParameters, defaultEdits } from '../../types/image';

export default function ImageEditor() {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rendererRef = useRef<WebGLRenderer | null>(null);
  
  const [edits, setEdits] = useState<EditParameters>(defaultEdits);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [showCropTool, setShowCropTool] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Fetch image data
  const { data: image, isLoading } = useQuery({
    queryKey: ['image', imageId],
    queryFn: () => api.images.get(imageId!),
    enabled: !!imageId,
  });
  
  // Initialize edits from image
  useEffect(() => {
    if (image?.currentEdits) {
      setEdits(image.currentEdits);
    }
  }, [image]);
  
  // Save edits mutation
  const saveMutation = useMutation({
    mutationFn: (edits: EditParameters) => api.images.saveEdits(imageId!, edits),
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast.success('Edits saved');
      queryClient.invalidateQueries({ queryKey: ['image', imageId] });
    },
    onError: () => {
      toast.error('Failed to save edits');
    },
  });
  
  // Handle edit changes
  const handleEditChange = useCallback((key: keyof EditParameters, value: any) => {
    setEdits(prev => {
      const newEdits = { ...prev, [key]: value };
      setHasUnsavedChanges(true);
      
      // Update WebGL preview
      rendererRef.current?.applyEdits(newEdits);
      
      return newEdits;
    });
  }, []);
  
  // Keyboard shortcuts
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    saveMutation.mutate(edits);
  }, [edits]);
  
  useHotkeys('z', () => setShowBeforeAfter(prev => !prev), []);
  useHotkeys('c', () => setShowCropTool(prev => !prev), []);
  useHotkeys('h', () => setShowVersions(prev => !prev), []);
  useHotkeys('mod+shift+e', () => setShowExport(true), []);
  useHotkeys('escape', () => navigate(-1), []);
  
  // Copy/paste edits
  useHotkeys('mod+c', () => {
    localStorage.setItem('vinco_copied_edits', JSON.stringify(edits));
    toast.success('Edits copied');
  }, [edits]);
  
  useHotkeys('mod+v', () => {
    const copied = localStorage.getItem('vinco_copied_edits');
    if (copied) {
      const pastedEdits = JSON.parse(copied);
      setEdits(pastedEdits);
      setHasUnsavedChanges(true);
      rendererRef.current?.applyEdits(pastedEdits);
      toast.success('Edits pasted');
    }
  }, []);
  
  // Reset to defaults
  const handleReset = useCallback(() => {
    setEdits(defaultEdits);
    setHasUnsavedChanges(true);
    rendererRef.current?.applyEdits(defaultEdits);
  }, []);
  
  // Revert to version
  const handleRevertToVersion = useCallback((version: EditParameters) => {
    setEdits(version);
    setHasUnsavedChanges(true);
    rendererRef.current?.applyEdits(version);
    setShowVersions(false);
  }, []);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }
  
  if (!image) {
    return <div className="flex items-center justify-center h-full">Image not found</div>;
  }
  
  return (
    <div className="flex h-full bg-gray-900">
      {/* Main image area */}
      <div className="flex-1 relative">
        <WebGLRenderer
          ref={rendererRef}
          imageUrl={image.signedUrls.proxy}
          edits={edits}
        />
        
        {showBeforeAfter && (
          <BeforeAfter
            originalUrl={image.signedUrls.proxy}
            edits={edits}
          />
        )}
        
        {showCropTool && (
          <CropTool
            currentCrop={edits.crop}
            onCropChange={(crop) => handleEditChange('crop', crop)}
            onClose={() => setShowCropTool(false)}
          />
        )}
        
        {/* Toolbar */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800/90 rounded-lg p-2">
          <button
            onClick={() => setShowBeforeAfter(prev => !prev)}
            className={`px-3 py-1.5 rounded ${showBeforeAfter ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Before/After (Z)
          </button>
          <button
            onClick={() => setShowCropTool(prev => !prev)}
            className={`px-3 py-1.5 rounded ${showCropTool ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Crop (C)
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600"
          >
            Reset
          </button>
          <button
            onClick={() => saveMutation.mutate(edits)}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save (⌘S)'}
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700"
          >
            Export
          </button>
        </div>
        
        {/* Histogram */}
        <div className="absolute top-4 right-4 w-48">
          <HistogramDisplay imageUrl={image.signedUrls.proxy} edits={edits} />
        </div>
      </div>
      
      {/* Right sidebar - adjustments */}
      <div className="w-80 bg-gray-800 overflow-y-auto">
        <AdjustmentPanel
          edits={edits}
          onChange={handleEditChange}
        />
        
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => setShowVersions(true)}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Version History (H)
          </button>
        </div>
      </div>
      
      {/* Modals */}
      {showVersions && (
        <VersionHistory
          imageId={imageId!}
          onRevert={handleRevertToVersion}
          onClose={() => setShowVersions(false)}
        />
      )}
      
      {showExport && (
        <ExportDialog
          imageId={imageId!}
          currentEdits={edits}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
```

### Validation Queue Component

```tsx
// admin-ui/src/components/validation/ValidationQueue.tsx
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHotkeys } from 'react-hotkeys-hook';
import toast from 'react-hot-toast';

import { api } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ValidationItem } from './ValidationItem';
import { AthleteComparison } from './AthleteComparison';
import { ReassignModal } from './ReassignModal';
import { ValidationStats } from './ValidationStats';

export default function ValidationQueue() {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showReassign, setShowReassign] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'claimed'>('pending');
  
  // Fetch queue
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['validationQueue', filter],
    queryFn: () => api.validation.getQueue({ 
      status: filter === 'all' ? undefined : filter.toUpperCase(),
      limit: 50 
    }),
  });
  
  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = subscribe('validation.new', () => {
      refetch();
    });
    return unsubscribe;
  }, [subscribe, refetch]);
  
  const items = data?.items ?? [];
  const currentItem = items[selectedIndex];
  
  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: (queueItemId: string) => api.validation.claim(queueItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
    },
  });
  
  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (queueItemId: string) => api.validation.approve(queueItemId),
    onSuccess: () => {
      toast.success('Match approved');
      moveToNext();
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
    },
    onError: () => {
      toast.error('Failed to approve');
    },
  });
  
  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (queueItemId: string) => api.validation.reject(queueItemId),
    onSuccess: () => {
      toast.success('Match rejected');
      moveToNext();
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
    },
  });
  
  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: ({ queueItemId, newAthleteId }: { queueItemId: string; newAthleteId: string }) =>
      api.validation.reassign(queueItemId, newAthleteId),
    onSuccess: () => {
      toast.success('Reassigned successfully');
      setShowReassign(false);
      moveToNext();
      queryClient.invalidateQueries({ queryKey: ['validationQueue'] });
    },
  });
  
  const moveToNext = useCallback(() => {
    setSelectedIndex(prev => Math.min(prev, items.length - 2));
  }, [items.length]);
  
  // Keyboard shortcuts
  useHotkeys('j', () => setSelectedIndex(prev => Math.min(prev + 1, items.length - 1)), [items.length]);
  useHotkeys('k', () => setSelectedIndex(prev => Math.max(prev - 1, 0)), []);
  
  useHotkeys('y', () => {
    if (currentItem) {
      approveMutation.mutate(currentItem.queueItemId);
    }
  }, [currentItem]);
  
  useHotkeys('n', () => {
    if (currentItem) {
      rejectMutation.mutate(currentItem.queueItemId);
    }
  }, [currentItem]);
  
  useHotkeys('r', () => {
    if (currentItem) {
      setShowReassign(true);
    }
  }, [currentItem]);
  
  // Auto-claim when selecting
  useEffect(() => {
    if (currentItem && currentItem.status === 'PENDING') {
      claimMutation.mutate(currentItem.queueItemId);
    }
  }, [currentItem?.queueItemId]);
  
  if (isLoading) {
    return <div className="p-8">Loading validation queue...</div>;
  }
  
  return (
    <div className="flex h-full">
      {/* Left sidebar - queue list */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Validation Queue</h2>
          
          <ValidationStats stats={data?.stats} />
          
          <div className="flex gap-2 mt-4">
            {(['pending', 'claimed', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm capitalize ${
                  filter === f 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item, index) => (
            <ValidationItem
              key={item.queueItemId}
              item={item}
              isSelected={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
          
          {items.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No items in queue
            </div>
          )}
        </div>
      </div>
      
      {/* Main area - comparison */}
      <div className="flex-1 p-6">
        {currentItem ? (
          <>
            <AthleteComparison item={currentItem} />
            
            {/* Action buttons */}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => rejectMutation.mutate(currentItem.queueItemId)}
                disabled={rejectMutation.isPending}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
              >
                <span>Reject</span>
                <kbd className="px-2 py-0.5 bg-red-700 rounded text-sm">N</kbd>
              </button>
              
              <button
                onClick={() => setShowReassign(true)}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2"
              >
                <span>Reassign</span>
                <kbd className="px-2 py-0.5 bg-yellow-700 rounded text-sm">R</kbd>
              </button>
              
              <button
                onClick={() => approveMutation.mutate(currentItem.queueItemId)}
                disabled={approveMutation.isPending}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
              >
                <span>Approve</span>
                <kbd className="px-2 py-0.5 bg-green-700 rounded text-sm">Y</kbd>
              </button>
            </div>
            
            {/* Confidence info */}
            <div className="mt-4 text-center text-sm text-gray-500">
              Confidence: {(currentItem.confidence * 100).toFixed(1)}%
              {currentItem.temporalBoost > 0 && (
                <span className="ml-2 text-green-600">
                  (+{(currentItem.temporalBoost * 100).toFixed(1)}% temporal boost)
                </span>
              )}
              <span className="ml-2">
                Method: {currentItem.recognitionMethod}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select an item from the queue
          </div>
        )}
      </div>
      
      {/* Reassign modal */}
      {showReassign && currentItem && (
        <ReassignModal
          currentAthlete={currentItem.suggestedAthlete}
          eventId={currentItem.image.eventId}
          onSelect={(athleteId) => {
            reassignMutation.mutate({
              queueItemId: currentItem.queueItemId,
              newAthleteId: athleteId,
            });
          }}
          onClose={() => setShowReassign(false)}
        />
      )}
    </div>
  );
}
```

---

## AWS CDK Infrastructure

```typescript
// aws/lib/vinco-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class VincoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for RDS
    const vpc = new ec2.Vpc(this, 'VincoVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // S3 Buckets
    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: 'vinco-uploads',
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: 'vinco-images',
      lifecycleRules: [{
        id: 'MoveOriginalsToGlacier',
        prefix: 'originals/',
        transitions: [{
          storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
          transitionAfter: cdk.Duration.days(30),
        }],
      }],
    });

    const exportsBucket = new s3.Bucket(this, 'ExportsBucket', {
      bucketName: 'vinco-exports',
      lifecycleRules: [{
        expiration: cdk.Duration.days(7),
      }],
    });

    // DynamoDB Tables
    const imagesTable = new dynamodb.Table(this, 'ImagesTable', {
      tableName: 'vinco-images',
      partitionKey: { name: 'imageId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    imagesTable.addGlobalSecondaryIndex({
      indexName: 'photographerId-uploadTime-index',
      partitionKey: { name: 'photographerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadTime', type: dynamodb.AttributeType.STRING },
    });

    imagesTable.addGlobalSecondaryIndex({
      indexName: 'eventId-captureTime-index',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'captureTime', type: dynamodb.AttributeType.STRING },
    });

    const editVersionsTable = new dynamodb.Table(this, 'EditVersionsTable', {
      tableName: 'vinco-edit-versions',
      partitionKey: { name: 'imageId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'versionTimestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    const validationQueueTable = new dynamodb.Table(this, 'ValidationQueueTable', {
      tableName: 'vinco-validation-queue',
      partitionKey: { name: 'queueItemId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    validationQueueTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'vinco-websocket-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    // SQS Queues
    const aiProcessingQueue = new sqs.Queue(this, 'AIProcessingQueue', {
      queueName: 'vinco-ai-processing',
      visibilityTimeout: cdk.Duration.minutes(5),
    });

    const rawProcessingQueue = new sqs.Queue(this, 'RawProcessingQueue', {
      queueName: 'vinco-raw-processing',
      visibilityTimeout: cdk.Duration.minutes(15),
    });

    const exportQueue = new sqs.Queue(this, 'ExportQueue', {
      queueName: 'vinco-export',
      visibilityTimeout: cdk.Duration.minutes(10),
    });

    // RDS PostgreSQL
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      databaseName: 'vinco',
      credentials: rds.Credentials.fromGeneratedSecret('vinco_admin'),
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
    });

    // Lambda Layer for shared code
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
    });

    // Image Processor Lambda
    const imageProcessor = new lambda.Function(this, 'ImageProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/image-processor'),
      layers: [sharedLayer],
      timeout: cdk.Duration.minutes(1),
      memorySize: 1024,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        IMAGES_TABLE: imagesTable.tableName,
        AI_QUEUE_URL: aiProcessingQueue.queueUrl,
        RAW_QUEUE_URL: rawProcessingQueue.queueUrl,
      },
    });

    uploadsBucket.grantRead(imageProcessor);
    imagesBucket.grantReadWrite(imageProcessor);
    imagesTable.grantReadWriteData(imageProcessor);
    aiProcessingQueue.grantSendMessages(imageProcessor);
    rawProcessingQueue.grantSendMessages(imageProcessor);

    // S3 trigger
    uploadsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(imageProcessor),
      { prefix: 'photographers/' }
    );

    // RAW Processor (Container Lambda)
    const rawProcessor = new lambda.DockerImageFunction(this, 'RawProcessor', {
      code: lambda.DockerImageCode.fromImageAsset('lambda/raw-processor'),
      timeout: cdk.Duration.minutes(10),
      memorySize: 3008,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        IMAGES_TABLE: imagesTable.tableName,
        AI_QUEUE_URL: aiProcessingQueue.queueUrl,
      },
    });

    uploadsBucket.grantRead(rawProcessor);
    imagesBucket.grantReadWrite(rawProcessor);
    imagesTable.grantReadWriteData(rawProcessor);
    aiProcessingQueue.grantSendMessages(rawProcessor);

    rawProcessor.addEventSource(new lambdaEventSources.SqsEventSource(rawProcessingQueue, {
      batchSize: 1,
    }));

    // AI Recognition Lambda
    const aiRecognition = new lambda.Function(this, 'AIRecognition', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/ai-recognition'),
      layers: [sharedLayer],
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        IMAGES_TABLE: imagesTable.tableName,
        VALIDATION_TABLE: validationQueueTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
        REKOGNITION_COLLECTION_ID: 'vinco-athletes',
        DATABASE_SECRET_ARN: database.secret!.secretArn,
      },
      vpc,
    });

    imagesBucket.grantRead(aiRecognition);
    imagesTable.grantReadWriteData(aiRecognition);
    validationQueueTable.grantReadWriteData(aiRecognition);
    connectionsTable.grantReadData(aiRecognition);
    database.secret!.grantRead(aiRecognition);

    // Grant Rekognition permissions
    aiRecognition.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: [
        'rekognition:DetectFaces',
        'rekognition:SearchFacesByImage',
        'rekognition:DetectText',
        'rekognition:IndexFaces',
      ],
      resources: ['*'],
    }));

    aiRecognition.addEventSource(new lambdaEventSources.SqsEventSource(aiProcessingQueue, {
      batchSize: 5,
    }));

    // Export Renderer (Container Lambda)
    const exportRenderer = new lambda.DockerImageFunction(this, 'ExportRenderer', {
      code: lambda.DockerImageCode.fromImageAsset('lambda/export-renderer'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 3008,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        EXPORTS_BUCKET: exportsBucket.bucketName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    imagesBucket.grantRead(exportRenderer);
    exportsBucket.grantReadWrite(exportRenderer);
    connectionsTable.grantReadData(exportRenderer);

    exportRenderer.addEventSource(new lambdaEventSources.SqsEventSource(exportQueue, {
      batchSize: 1,
    }));

    // REST API
    const api = new apigateway.RestApi(this, 'VincoApi', {
      restApiName: 'Vinco MAM API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // WebSocket API
    const webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketApi', {
      name: 'VincoWebSocket',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });

    new cdk.CfnOutput(this, 'WebSocketEndpoint', {
      value: `wss://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`,
    });
  }
}
```

---

## Deployment Instructions

### Prerequisites
1. AWS CLI configured with appropriate credentials
2. Node.js 20.x
3. Docker (for container Lambdas)
4. WordPress site on Kinsta with PHP 8.0+

### Deploy AWS Infrastructure
```bash
cd aws
npm install
npx cdk bootstrap
npx cdk deploy
```

### Build React Admin UI
```bash
cd admin-ui
npm install
npm run build
```

### Install WordPress Plugin
1. Copy `wordpress-plugin` folder to `wp-content/plugins/vinco-mam`
2. Copy `admin-ui/dist/*` to `wp-content/plugins/vinco-mam/assets/build/`
3. Activate plugin in WordPress admin
4. Configure AWS credentials in Vinco MAM > Settings

### Run Database Migrations
```bash
cd database
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_athletes.sql
# ... etc
```

### Create Rekognition Collection
```bash
aws rekognition create-collection --collection-id vinco-athletes
```

---

## Environment Variables

### WordPress Plugin (wp-config.php or plugin settings)
```php
define('VINCO_AWS_REGION', 'eu-west-2');
define('VINCO_API_ENDPOINT', 'https://xxx.execute-api.eu-west-2.amazonaws.com/prod');
define('VINCO_WEBSOCKET_ENDPOINT', 'wss://xxx.execute-api.eu-west-2.amazonaws.com/prod');
define('VINCO_JWT_SECRET', 'your-secret-key');
```

### Lambda Environment
```
IMAGES_BUCKET=vinco-images
UPLOADS_BUCKET=vinco-uploads
EXPORTS_BUCKET=vinco-exports
IMAGES_TABLE=vinco-images
EDIT_VERSIONS_TABLE=vinco-edit-versions
VALIDATION_TABLE=vinco-validation-queue
CONNECTIONS_TABLE=vinco-websocket-connections
DATABASE_SECRET_ARN=arn:aws:secretsmanager:...
REKOGNITION_COLLECTION_ID=vinco-athletes
```

---

## Testing

### Unit Tests
```bash
# Admin UI
cd admin-ui && npm test

# Lambda functions
cd aws/lambda/image-processor && npm test
```

### E2E Tests
```bash
cd admin-ui && npm run test:e2e
```

### Load Testing
Use Artillery or k6 to simulate high-volume uploads during live events.

---

## Monitoring

### CloudWatch Dashboards
- Image processing latency
- AI recognition accuracy rates
- Validation queue depth
- WebSocket connection count
- Export rendering times

### Alarms
- Processing queue depth > 100
- Lambda error rate > 1%
- Database connections > 80%
- S3 bucket size approaching limits

---

This specification provides a complete blueprint for building the Vinco MAM platform. Feed this document to Cursor and it will have all the context needed to implement each component.
