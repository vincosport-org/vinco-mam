<?php
// includes/class-vinco-database.php

class Vinco_MAM_Database {
    
    public static function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Athletes table
        $table_athletes = $wpdb->prefix . 'vinco_athletes';
        $sql_athletes = "CREATE TABLE IF NOT EXISTS $table_athletes (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            internal_id varchar(50) NOT NULL,
            first_name varchar(100) NOT NULL,
            last_name varchar(100) NOT NULL,
            display_name varchar(200),
            nationality varchar(3),
            date_of_birth date,
            gender varchar(10),
            disciplines text,
            team varchar(200),
            rekognition_collection_id varchar(100),
            face_count int(11) DEFAULT 0,
            notes text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by bigint(20) UNSIGNED,
            PRIMARY KEY (id),
            UNIQUE KEY internal_id (internal_id),
            KEY idx_name (last_name, first_name),
            KEY idx_nationality (nationality)
        ) $charset_collate;";
        
        // Athlete external IDs
        $table_external_ids = $wpdb->prefix . 'vinco_athlete_external_ids';
        $sql_external_ids = "CREATE TABLE IF NOT EXISTS $table_external_ids (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            athlete_id bigint(20) UNSIGNED NOT NULL,
            source varchar(50) NOT NULL,
            external_id varchar(100) NOT NULL,
            verified tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY source_external (source, external_id),
            KEY idx_athlete (athlete_id),
            FOREIGN KEY (athlete_id) REFERENCES $table_athletes(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        // Athlete headshots
        $table_headshots = $wpdb->prefix . 'vinco_athlete_headshots';
        $sql_headshots = "CREATE TABLE IF NOT EXISTS $table_headshots (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            athlete_id bigint(20) UNSIGNED NOT NULL,
            s3_key varchar(500) NOT NULL,
            rekognition_face_id varchar(100),
            is_primary tinyint(1) DEFAULT 0,
            source varchar(50),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            created_by bigint(20) UNSIGNED,
            PRIMARY KEY (id),
            KEY idx_athlete (athlete_id),
            FOREIGN KEY (athlete_id) REFERENCES $table_athletes(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        // Venues table
        $table_venues = $wpdb->prefix . 'vinco_venues';
        $sql_venues = "CREATE TABLE IF NOT EXISTS $table_venues (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            name varchar(200) NOT NULL,
            city varchar(100),
            country varchar(3),
            timezone varchar(50),
            latitude decimal(10,7),
            longitude decimal(10,7),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        
        // Events table
        $table_events = $wpdb->prefix . 'vinco_events';
        $sql_events = "CREATE TABLE IF NOT EXISTS $table_events (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            name varchar(200) NOT NULL,
            short_name varchar(50),
            event_type varchar(50),
            venue_id bigint(20) UNSIGNED,
            start_date date NOT NULL,
            end_date date,
            timezone varchar(50) DEFAULT 'UTC',
            external_source varchar(50),
            external_id varchar(100),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_date (start_date),
            KEY idx_venue (venue_id),
            FOREIGN KEY (venue_id) REFERENCES $table_venues(id)
        ) $charset_collate;";
        
        // Event schedule
        $table_schedule = $wpdb->prefix . 'vinco_event_schedule';
        $sql_schedule = "CREATE TABLE IF NOT EXISTS $table_schedule (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            event_id bigint(20) UNSIGNED NOT NULL,
            discipline varchar(100) NOT NULL,
            round varchar(50),
            heat_number int(11),
            scheduled_time datetime NOT NULL,
            actual_start_time datetime,
            status varchar(20) DEFAULT 'SCHEDULED',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_event (event_id),
            KEY idx_time (scheduled_time),
            FOREIGN KEY (event_id) REFERENCES $table_events(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        // Start lists
        $table_startlists = $wpdb->prefix . 'vinco_start_lists';
        $sql_startlists = "CREATE TABLE IF NOT EXISTS $table_startlists (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            schedule_id bigint(20) UNSIGNED NOT NULL,
            athlete_id bigint(20) UNSIGNED,
            bib_number varchar(20),
            lane int(11),
            position int(11),
            seed_mark varchar(50),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_schedule (schedule_id),
            KEY idx_athlete (athlete_id),
            FOREIGN KEY (schedule_id) REFERENCES $table_schedule(id) ON DELETE CASCADE,
            FOREIGN KEY (athlete_id) REFERENCES $table_athletes(id)
        ) $charset_collate;";
        
        // Results
        $table_results = $wpdb->prefix . 'vinco_results';
        $sql_results = "CREATE TABLE IF NOT EXISTS $table_results (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            schedule_id bigint(20) UNSIGNED NOT NULL,
            athlete_id bigint(20) UNSIGNED,
            finish_position int(11),
            mark varchar(50),
            mark_numeric decimal(10,3),
            wind decimal(4,2),
            reaction_time decimal(5,3),
            gun_time datetime,
            finish_time datetime,
            bib_number varchar(20),
            lane int(11),
            source_system varchar(50) NOT NULL,
            source_result_id varchar(100),
            status varchar(20) DEFAULT 'OFFICIAL',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_schedule (schedule_id),
            KEY idx_athlete (athlete_id),
            KEY idx_time (finish_time),
            KEY idx_source (source_system, source_result_id),
            FOREIGN KEY (schedule_id) REFERENCES $table_schedule(id) ON DELETE CASCADE,
            FOREIGN KEY (athlete_id) REFERENCES $table_athletes(id)
        ) $charset_collate;";
        
        // Photographers (extends WordPress users)
        $table_photographers = $wpdb->prefix . 'vinco_photographers';
        $sql_photographers = "CREATE TABLE IF NOT EXISTS $table_photographers (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            ftp_username varchar(100),
            ftp_folder_path varchar(500),
            default_copyright varchar(500),
            default_credit varchar(200),
            total_uploads int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY ftp_username (ftp_username),
            KEY idx_user (user_id),
            FOREIGN KEY (user_id) REFERENCES {$wpdb->users}(ID) ON DELETE CASCADE
        ) $charset_collate;";
        
        // Image notes
        $table_notes = $wpdb->prefix . 'vinco_image_notes';
        $sql_notes = "CREATE TABLE IF NOT EXISTS $table_notes (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            image_id varchar(100) NOT NULL,
            user_id bigint(20) UNSIGNED,
            content text NOT NULL,
            mentioned_user_ids text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_image (image_id),
            KEY idx_user (user_id),
            FOREIGN KEY (user_id) REFERENCES {$wpdb->users}(ID)
        ) $charset_collate;";
        
        // Activity log
        $table_activity = $wpdb->prefix . 'vinco_activity_log';
        $sql_activity = "CREATE TABLE IF NOT EXISTS $table_activity (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED,
            action varchar(100) NOT NULL,
            entity_type varchar(50),
            entity_id varchar(100),
            metadata longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_user (user_id),
            KEY idx_entity (entity_type, entity_id),
            KEY idx_time (created_at),
            FOREIGN KEY (user_id) REFERENCES {$wpdb->users}(ID)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        dbDelta($sql_venues);
        dbDelta($sql_athletes);
        dbDelta($sql_external_ids);
        dbDelta($sql_headshots);
        dbDelta($sql_events);
        dbDelta($sql_schedule);
        dbDelta($sql_startlists);
        dbDelta($sql_results);
        dbDelta($sql_photographers);
        dbDelta($sql_notes);
        dbDelta($sql_activity);
    }
    
    public static function get_table_name($name) {
        global $wpdb;
        return $wpdb->prefix . 'vinco_' . $name;
    }
}
