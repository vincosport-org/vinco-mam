/**
 * Frontend gallery JavaScript for shortcodes
 * Enhanced with better UX, navigation, and error handling
 */
(function($) {
    'use strict';
    
    const VincoGallery = {
        currentLightboxIndex: 0,
        lightboxImages: [],
        init: function() {
            // Ensure vincoMAMFrontend is defined
            if (typeof vincoMAMFrontend === 'undefined' || !vincoMAMFrontend.apiRoot) {
                console.error('Vinco MAM: vincoMAMFrontend not properly initialized');
                return;
            }
            this.initGalleries();
            this.initAlbums();
            this.initAlbumsList();
            this.initImages();
            this.initAthleteGalleries();
            this.initAthletesList();
            this.initEventsList();
            this.initSearch();
            this.initTagsList();
            this.initTagGallery();
            // Dynamic detail pages
            this.initPhotoPage();
            this.initAthletePage();
            this.initEventPage();
            this.initAlbumPage();
            this.initTagPage();
        },
        
        initGalleries: function() {
            $('.vinco-gallery').each(function() {
                const $gallery = $(this);
                const eventId = $gallery.data('event-id');
                const photographerId = $gallery.data('photographer-id');
                const albumId = $gallery.data('album-id');
                const tagId = $gallery.data('tag-id');
                const limit = parseInt($gallery.data('limit')) || 50;
                const columns = parseInt($gallery.data('columns')) || 4;
                const lightbox = $gallery.data('lightbox') === 'true' || $gallery.data('lightbox') === true;
                const showMetadata = $gallery.data('show-metadata') === 'true';
                const showFilters = $gallery.data('show-filters') !== 'false';
                const isPublic = $gallery.data('public') === 'true';

                // Find grid container (may be nested)
                const $gridContainer = $gallery.find('.vinco-gallery-grid').length > 0
                    ? $gallery.find('.vinco-gallery-grid')
                    : $gallery;

                // Store config on element for filter use
                $gallery.data('config', { eventId, photographerId, albumId, tagId, limit, columns, lightbox, showMetadata, isPublic });

                // Initialize filters if present
                if (showFilters) {
                    VincoGallery.initGalleryFilters($gallery);
                }

                // Load initial data
                VincoGallery.loadGalleryImages($gallery, {});
            });
        },

        initGalleryFilters: function($gallery) {
            const isPublic = $gallery.data('public') === 'true';

            // Load filter options (athletes, events, tags)
            VincoGallery.loadFilterOptions($gallery, isPublic);

            // Bind filter events
            $gallery.find('.vinco-filter-apply').on('click', function() {
                const filters = VincoGallery.getFilterValues($gallery);
                VincoGallery.loadGalleryImages($gallery, filters);
            });

            $gallery.find('.vinco-filter-clear').on('click', function() {
                $gallery.find('.vinco-filter-search').val('');
                $gallery.find('.vinco-filter-select').val('');
                $gallery.find('.vinco-filter-date').val('');
                VincoGallery.loadGalleryImages($gallery, {});
            });

            // Enter key on search triggers filter
            $gallery.find('.vinco-filter-search').on('keypress', function(e) {
                if (e.which === 13) {
                    const filters = VincoGallery.getFilterValues($gallery);
                    VincoGallery.loadGalleryImages($gallery, filters);
                }
            });
        },

        getFilterValues: function($container) {
            const filters = {};
            const search = $container.find('[data-filter="search"]').val();
            if (search) filters.search = search;

            const athlete = $container.find('[data-filter="athlete"]').val();
            if (athlete) filters.athleteId = athlete;

            const event = $container.find('[data-filter="event"]').val();
            if (event) filters.eventId = event;

            const tag = $container.find('[data-filter="tag"]').val();
            if (tag) filters.tagId = tag;

            const dateFrom = $container.find('[data-filter="dateFrom"]').val();
            if (dateFrom) filters.dateFrom = dateFrom;

            const dateTo = $container.find('[data-filter="dateTo"]').val();
            if (dateTo) filters.dateTo = dateTo;

            const nationality = $container.find('[data-filter="nationality"]').val();
            if (nationality) filters.nationality = nationality;

            const discipline = $container.find('[data-filter="discipline"]').val();
            if (discipline) filters.discipline = discipline;

            const team = $container.find('[data-filter="team"]').val();
            if (team) filters.team = team;

            const ageMin = $container.find('[data-filter="ageMin"]').val();
            if (ageMin) filters.ageMin = ageMin;

            const ageMax = $container.find('[data-filter="ageMax"]').val();
            if (ageMax) filters.ageMax = ageMax;

            return filters;
        },

        loadFilterOptions: function($gallery, isPublic) {
            const publicParam = isPublic ? '?public=true' : '';

            // Load athletes for filter
            $.ajax({
                url: vincoMAMFrontend.apiRoot + 'athletes' + publicParam,
                method: 'GET',
                headers: vincoMAMFrontend.nonce ? { 'X-WP-Nonce': vincoMAMFrontend.nonce } : {},
                success: function(response) {
                    const athletes = response.athletes || [];
                    const $select = $gallery.find('[data-filter="athlete"]');
                    athletes.forEach(function(athlete) {
                        const name = athlete.name || athlete.displayName || ((athlete.firstName || '') + ' ' + (athlete.lastName || '')).trim() || 'Unknown';
                        $select.append('<option value="' + athlete.athleteId + '">' + $('<div>').text(name).html() + '</option>');
                    });
                },
                error: function() {
                    console.warn('Failed to load athletes for filter');
                }
            });

            // Load events for filter
            $.ajax({
                url: vincoMAMFrontend.apiRoot + 'events' + publicParam,
                method: 'GET',
                headers: vincoMAMFrontend.nonce ? { 'X-WP-Nonce': vincoMAMFrontend.nonce } : {},
                success: function(response) {
                    const events = response.events || [];
                    const $select = $gallery.find('[data-filter="event"]');
                    events.forEach(function(event) {
                        $select.append('<option value="' + event.eventId + '">' + $('<div>').text(event.name || event.title).html() + '</option>');
                    });
                },
                error: function() {
                    console.warn('Failed to load events for filter');
                }
            });

            // Load tags for filter
            $.ajax({
                url: vincoMAMFrontend.apiRoot + 'tags' + publicParam,
                method: 'GET',
                headers: vincoMAMFrontend.nonce ? { 'X-WP-Nonce': vincoMAMFrontend.nonce } : {},
                success: function(response) {
                    const tags = response.tags || [];
                    const $select = $gallery.find('[data-filter="tag"]');
                    tags.forEach(function(tag) {
                        $select.append('<option value="' + tag.tagId + '">' + $('<div>').text(tag.name).html() + '</option>');
                    });
                },
                error: function() {
                    console.warn('Failed to load tags for filter');
                }
            });
        },

        loadGalleryImages: function($gallery, filters) {
            const config = $gallery.data('config') || {};
            const $gridContainer = $gallery.find('.vinco-gallery-grid').length > 0
                ? $gallery.find('.vinco-gallery-grid')
                : $gallery;

            // Show loading
            $gridContainer.html(VincoGallery.createLoadingSkeleton(config.columns || 4, 12));

            // Build API URL
            let apiUrl = vincoMAMFrontend.apiRoot + 'images?limit=' + (config.limit || 50);
            if (config.eventId) apiUrl += '&eventId=' + encodeURIComponent(config.eventId);
            if (config.photographerId) apiUrl += '&photographerId=' + encodeURIComponent(config.photographerId);
            if (config.albumId) apiUrl += '&albumId=' + encodeURIComponent(config.albumId);
            if (config.tagId) apiUrl += '&tagId=' + encodeURIComponent(config.tagId);
            if (config.isPublic) apiUrl += '&public=true';

            // Add filter params
            if (filters.search) apiUrl += '&search=' + encodeURIComponent(filters.search);
            if (filters.athleteId) apiUrl += '&athleteId=' + encodeURIComponent(filters.athleteId);
            if (filters.eventId) apiUrl += '&eventId=' + encodeURIComponent(filters.eventId);
            if (filters.tagId) apiUrl += '&tagId=' + encodeURIComponent(filters.tagId);
            if (filters.dateFrom) apiUrl += '&dateFrom=' + encodeURIComponent(filters.dateFrom);
            if (filters.dateTo) apiUrl += '&dateTo=' + encodeURIComponent(filters.dateTo);

            $.ajax({
                url: apiUrl,
                method: 'GET',
                headers: vincoMAMFrontend.nonce ? { 'X-WP-Nonce': vincoMAMFrontend.nonce } : {},
                success: function(response) {
                    const images = response.data?.images || response.images || [];
                    if (images.length === 0) {
                        $gridContainer.html(VincoGallery.createEmptyState('No images found matching your filters.'));
                        return;
                    }
                    VincoGallery.renderGallery($gridContainer, images, config.columns || 4, config.lightbox !== false, config.showMetadata);
                },
                error: function(xhr) {
                    var errorMsg = 'Unable to load gallery.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view this gallery.';
                    else if (xhr.status === 403) errorMsg = 'You do not have permission to view this gallery.';
                    $gridContainer.html(VincoGallery.createErrorState(errorMsg));
                }
            });
        },
        
        initAlbums: function() {
            $('.vinco-album').each(function() {
                const $album = $(this);
                const albumId = $album.data('album-id');
                const columns = parseInt($album.data('columns')) || 4;
                const lightbox = $album.data('lightbox') === 'true';
                const isPublic = $album.data('public') === 'true';
                
                if (!albumId) {
                    $album.html(VincoGallery.createErrorState('Album ID is required.'));
                    return;
                }
                
                // Show loading skeleton
                $album.html(VincoGallery.createLoadingSkeleton(columns, 12));
                
                // Fetch album data
                var ajaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'albums/' + encodeURIComponent(albumId) + (isPublic ? '?public=true' : ''),
                    method: 'GET',
                    success: function(response) {
                        const album = response.data?.album || response.album || response;
                        // Fetch album images
                        if (album.imageIds && album.imageIds.length > 0) {
                            const imageIds = album.imageIds.slice(0, 50).join(',');
                            var imageAjaxOptions = {
                                url: vincoMAMFrontend.apiRoot + 'images?ids=' + encodeURIComponent(imageIds) + (isPublic ? '&public=true' : ''),
                                method: 'GET',
                                success: function(imgResponse) {
                                    const images = imgResponse.data?.images || imgResponse.images || [];
                                    if (images.length === 0) {
                                        $album.html(VincoGallery.createEmptyState('This album is empty.'));
                                        return;
                                    }
                                    VincoGallery.renderGallery($album, images, columns, lightbox, false);
                                },
                                error: function() {
                                    $album.html(VincoGallery.createErrorState('Error loading album images.'));
                                }
                            };
                            
                            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                                imageAjaxOptions.headers = {
                                    'X-WP-Nonce': vincoMAMFrontend.nonce
                                };
                            }
                            
                            $.ajax(imageAjaxOptions);
                        } else {
                            $album.html(VincoGallery.createEmptyState('This album is empty.'));
                        }
                    },
                    error: function(xhr) {
                        var errorMsg = 'Album not found.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view this album.';
                        } else if (xhr.status === 403) {
                            errorMsg = 'You do not have permission to view this album.';
                        }
                        $album.html(VincoGallery.createErrorState(errorMsg));
                    }
                };
                
                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    ajaxOptions.headers = {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    };
                }
                
                $.ajax(ajaxOptions);
            });
        },
        
        initImages: function() {
            $('.vinco-single-image').each(function() {
                const $container = $(this);
                const imageId = $container.data('image-id');
                const size = $container.data('size') || 'large';
                const showCaption = $container.data('caption') === 'true';
                const link = $container.data('link') === 'true';
                const isPublic = $container.data('public') === 'true';
                
                if (!imageId) {
                    $container.html(VincoGallery.createErrorState('Image ID is required.'));
                    return;
                }
                
                // Show loading skeleton
                $container.html('<div class="vinco-skeleton" style="width: 100%; aspect-ratio: 16/9; max-width: 800px; margin: 0 auto;"></div>');
                
                var ajaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'images/' + encodeURIComponent(imageId) + (isPublic ? '?public=true' : ''),
                    method: 'GET',
                    success: function(response) {
                        const image = response.data?.image || response.image || response;
                        const signedUrls = image.signedUrls || {};
                        const url = size === 'original' ? signedUrls.original : 
                                   size === 'large' ? signedUrls.proxy : 
                                   signedUrls.thumbnail || signedUrls.proxy || signedUrls.original;
                        
                        if (!url) {
                            $container.html(VincoGallery.createErrorState('Image URL not available.'));
                            return;
                        }
                        
                        let html = '';
                        if (link) {
                            html += '<a href="' + (signedUrls.original || url) + '" target="_blank" rel="noopener noreferrer">';
                        }
                        html += '<img src="' + url + '" alt="' + (image.title || '') + '" class="vinco-image" loading="lazy" />';
                        if (link) {
                            html += '</a>';
                        }
                        if (showCaption && image.title) {
                            html += '<p class="vinco-image-caption">' + $('<div>').text(image.title).html() + '</p>';
                        }
                        $container.html(html);
                    },
                    error: function(xhr) {
                        var errorMsg = 'Image not found.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view this image.';
                        } else if (xhr.status === 403) {
                            errorMsg = 'You do not have permission to view this image.';
                        }
                        $container.html(VincoGallery.createErrorState(errorMsg));
                    }
                };
                
                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    ajaxOptions.headers = {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    };
                }
                
                $.ajax(ajaxOptions);
            });
        },
        
        initAthleteGalleries: function() {
            $('.vinco-athlete-gallery').each(function() {
                const $gallery = $(this);
                const athleteId = $gallery.data('athlete-id');
                const limit = parseInt($gallery.data('limit')) || 10;
                const columns = parseInt($gallery.data('columns')) || 3;
                const lightbox = $gallery.data('lightbox') === 'true';
                const isPublic = $gallery.data('public') === 'true';
                
                if (!athleteId) {
                    $gallery.html(VincoGallery.createErrorState('Athlete ID is required.'));
                    return;
                }
                
                // Show loading skeleton
                $gallery.html(VincoGallery.createLoadingSkeleton(columns, Math.min(limit, 9)));
                
                // Fetch images with athlete recognition
                var ajaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'images?athleteId=' + encodeURIComponent(athleteId) + '&limit=' + limit + (isPublic ? '&public=true' : ''),
                    method: 'GET',
                    success: function(response) {
                        const images = response.data?.images || response.images || [];
                        if (images.length === 0) {
                            $gallery.html(VincoGallery.createEmptyState('No images found for this athlete.'));
                            return;
                        }
                        VincoGallery.renderGallery($gallery, images, columns, lightbox, false);
                    },
                    error: function(xhr) {
                        var errorMsg = 'Unable to load athlete photos.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view athlete photos.';
                        } else if (xhr.status === 403) {
                            errorMsg = 'You do not have permission to view these photos.';
                        }
                        $gallery.html(VincoGallery.createErrorState(errorMsg));
                    }
                };
                
                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    ajaxOptions.headers = {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    };
                }
                
                $.ajax(ajaxOptions);
            });
        },

        initAlbumsList: function() {
            $('.vinco-albums-list').each(function() {
                const $container = $(this);
                const columns = parseInt($container.data('columns')) || 3;
                const limit = parseInt($container.data('limit')) || 50;
                const showFilters = $container.data('show-filters') !== 'false';
                const isPublic = $container.data('public') === 'true';

                // Find grid container
                const $gridContainer = $container.find('.vinco-albums-grid').length > 0
                    ? $container.find('.vinco-albums-grid')
                    : $container;

                // Store config and all albums for filtering
                $container.data('config', { columns, limit, isPublic });

                // Initial load
                VincoGallery.loadAlbums($container, {});

                // Bind filter events
                if (showFilters) {
                    $container.find('.vinco-filter-search').on('input', function() {
                        const search = $(this).val().toLowerCase();
                        VincoGallery.filterAlbums($container, search);
                    });

                    // Clear button
                    $container.find('.vinco-filter-clear').on('click', function() {
                        $container.find('.vinco-filter-search').val('');
                        VincoGallery.filterAlbums($container, '');
                    });
                }
            });
        },

        loadAlbums: function($container, filters) {
            const config = $container.data('config') || {};
            const $gridContainer = $container.find('.vinco-albums-grid').length > 0
                ? $container.find('.vinco-albums-grid')
                : $container;

            $gridContainer.html(VincoGallery.createCardSkeleton(config.columns || 3, 6));

            $.ajax({
                url: vincoMAMFrontend.apiRoot + 'albums?limit=' + (config.limit || 50) + (config.isPublic ? '&public=true' : ''),
                method: 'GET',
                headers: vincoMAMFrontend.nonce ? { 'X-WP-Nonce': vincoMAMFrontend.nonce } : {},
                success: function(response) {
                    const albums = response.data?.albums || response.albums || [];
                    $container.data('allAlbums', albums);
                    if (albums.length === 0) {
                        $gridContainer.html(VincoGallery.createEmptyState('No albums found.'));
                        return;
                    }
                    VincoGallery.renderAlbumsList($gridContainer, albums, config.columns || 3);
                },
                error: function(xhr) {
                    var errorMsg = 'Unable to load albums.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view albums.';
                    $gridContainer.html(VincoGallery.createErrorState(errorMsg));
                }
            });
        },

        filterAlbums: function($container, search) {
            const allAlbums = $container.data('allAlbums') || [];
            const config = $container.data('config') || {};
            const $gridContainer = $container.find('.vinco-albums-grid').length > 0
                ? $container.find('.vinco-albums-grid')
                : $container;

            const filtered = allAlbums.filter(function(album) {
                const title = (album.title || album.name || '').toLowerCase();
                const desc = (album.description || '').toLowerCase();
                return title.includes(search) || desc.includes(search);
            });

            if (filtered.length === 0) {
                $gridContainer.html(VincoGallery.createEmptyState('No albums match your search.'));
            } else {
                VincoGallery.renderAlbumsList($gridContainer, filtered, config.columns || 3);
            }
        },

        initAthletesList: function() {
            $('.vinco-athletes-list').each(function() {
                const $container = $(this);
                const columns = parseInt($container.data('columns')) || 4;
                const limit = parseInt($container.data('limit')) || 100;
                const showStats = $container.data('show-stats') !== 'false';
                const showFilters = $container.data('show-filters') !== 'false';
                const isPublic = $container.data('public') === 'true';

                // Find grid container
                const $gridContainer = $container.find('.vinco-athletes-grid').length > 0
                    ? $container.find('.vinco-athletes-grid')
                    : $container;

                // Store config
                $container.data('config', { columns, limit, showStats, isPublic });

                // Initial load
                VincoGallery.loadAthletes($container, {});

                // Bind filter events
                if (showFilters) {
                    // Real-time search
                    $container.find('.vinco-filter-search').on('input', function() {
                        const filters = VincoGallery.getFilterValues($container);
                        VincoGallery.filterAthletes($container, filters);
                    });

                    // Dropdown changes
                    $container.find('.vinco-filter-select').on('change', function() {
                        const filters = VincoGallery.getFilterValues($container);
                        VincoGallery.filterAthletes($container, filters);
                    });

                    // Number input changes (age range)
                    $container.find('.vinco-filter-number').on('change', function() {
                        const filters = VincoGallery.getFilterValues($container);
                        VincoGallery.filterAthletes($container, filters);
                    });

                    // Clear button
                    $container.find('.vinco-filter-clear').on('click', function() {
                        $container.find('.vinco-filter-search').val('');
                        $container.find('.vinco-filter-select').val('');
                        $container.find('.vinco-filter-number').val('');
                        VincoGallery.filterAthletes($container, {});
                    });
                }
            });
        },

        loadAthletes: function($container, filters) {
            const config = $container.data('config') || {};
            const $gridContainer = $container.find('.vinco-athletes-grid').length > 0
                ? $container.find('.vinco-athletes-grid')
                : $container;

            $gridContainer.html(VincoGallery.createCardSkeleton(config.columns || 4, 8));

            var ajaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'athletes?limit=' + (config.limit || 100) + (config.isPublic ? '&public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const athletes = response.data?.athletes || response.athletes || [];
                    $container.data('allAthletes', athletes);

                    // Populate filter dropdowns
                    VincoGallery.populateAthleteFilters($container, athletes);

                    if (athletes.length === 0) {
                        $gridContainer.html(VincoGallery.createEmptyState('No athletes found.'));
                        return;
                    }
                    VincoGallery.renderAthletesList($gridContainer, athletes, config.columns || 4, config.showStats);
                },
                error: function(xhr) {
                    var errorMsg = 'Unable to load athletes.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view athletes.';
                    else if (xhr.status === 403) errorMsg = 'You do not have permission to view athletes.';
                    $gridContainer.html(VincoGallery.createErrorState(errorMsg));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(ajaxOptions);
        },

        populateAthleteFilters: function($container, athletes) {
            // Extract unique nationalities
            const nationalities = [...new Set(athletes.map(a => a.nationality).filter(Boolean))].sort();
            const $nationalitySelect = $container.find('.vinco-filter-nationality');
            if ($nationalitySelect.length) {
                $nationalitySelect.find('option:not(:first)').remove();
                nationalities.forEach(function(nat) {
                    $nationalitySelect.append('<option value="' + nat + '">' + $('<div>').text(nat).html() + '</option>');
                });
            }

            // Extract unique disciplines
            const disciplines = [...new Set(athletes.flatMap(a => a.disciplines || []).filter(Boolean))].sort();
            const $disciplineSelect = $container.find('.vinco-filter-discipline');
            if ($disciplineSelect.length) {
                $disciplineSelect.find('option:not(:first)').remove();
                disciplines.forEach(function(disc) {
                    $disciplineSelect.append('<option value="' + disc + '">' + $('<div>').text(disc).html() + '</option>');
                });
            }

            // Extract unique teams
            const teams = [...new Set(athletes.map(a => a.team).filter(Boolean))].sort();
            const $teamSelect = $container.find('.vinco-filter-team');
            if ($teamSelect.length) {
                $teamSelect.find('option:not(:first)').remove();
                teams.forEach(function(team) {
                    $teamSelect.append('<option value="' + team + '">' + $('<div>').text(team).html() + '</option>');
                });
            }
        },

        filterAthletes: function($container, filters) {
            const allAthletes = $container.data('allAthletes') || [];
            const config = $container.data('config') || {};
            const $gridContainer = $container.find('.vinco-athletes-grid').length > 0
                ? $container.find('.vinco-athletes-grid')
                : $container;

            let filtered = allAthletes;

            // Search filter (name)
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filtered = filtered.filter(function(athlete) {
                    const name = (athlete.displayName || athlete.name || ((athlete.firstName || '') + ' ' + (athlete.lastName || '')).trim() || '').toLowerCase();
                    return name.includes(searchLower);
                });
            }

            // Nationality filter
            if (filters.nationality) {
                filtered = filtered.filter(function(athlete) {
                    return athlete.nationality === filters.nationality;
                });
            }

            // Discipline filter
            if (filters.discipline) {
                filtered = filtered.filter(function(athlete) {
                    return (athlete.disciplines || []).includes(filters.discipline);
                });
            }

            // Team filter
            if (filters.team) {
                filtered = filtered.filter(function(athlete) {
                    return athlete.team === filters.team;
                });
            }

            // Age range filter
            if (filters.ageMin || filters.ageMax) {
                const now = new Date();
                filtered = filtered.filter(function(athlete) {
                    if (!athlete.dateOfBirth) return false;
                    const dob = new Date(athlete.dateOfBirth);
                    const age = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
                    if (filters.ageMin && age < parseInt(filters.ageMin)) return false;
                    if (filters.ageMax && age > parseInt(filters.ageMax)) return false;
                    return true;
                });
            }

            // Render filtered results
            if (filtered.length === 0) {
                $gridContainer.html(VincoGallery.createEmptyState('No athletes match your filters.'));
            } else {
                VincoGallery.renderAthletesList($gridContainer, filtered, config.columns || 4, config.showStats);
            }
        },

        initEventsList: function() {
            $('.vinco-events-list').each(function() {
                const $container = $(this);
                const columns = parseInt($container.data('columns')) || 2;
                const limit = parseInt($container.data('limit')) || 20;
                const showPast = $container.data('show-past') !== 'false';
                const isPublic = $container.data('public') === 'true';

                // Show loading skeleton
                $container.html(VincoGallery.createCardSkeleton(columns, Math.min(limit, 6)));

                var ajaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'events?limit=' + limit + '&showPast=' + showPast + (isPublic ? '&public=true' : ''),
                    method: 'GET',
                    success: function(response) {
                        const events = response.data?.events || response.events || [];
                        if (events.length === 0) {
                            $container.html(VincoGallery.createEmptyState('No events found.'));
                            return;
                        }
                        VincoGallery.renderEventsList($container, events, columns);
                    },
                    error: function(xhr) {
                        var errorMsg = 'Unable to load events.';
                        if (xhr.status === 401) errorMsg = 'Please log in to view events.';
                        else if (xhr.status === 403) errorMsg = 'You do not have permission to view events.';
                        $container.html(VincoGallery.createErrorState(errorMsg));
                    }
                };

                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
                }

                $.ajax(ajaxOptions);
            });
        },

        initSearch: function() {
            $('.vinco-search').each(function() {
                const $container = $(this);
                const columns = parseInt($container.data('columns')) || 4;
                const isPublic = $container.data('public') === 'true';

                const $input = $container.find('.vinco-search-input');
                const $button = $container.find('.vinco-search-button');
                const $results = $container.find('.vinco-search-results');

                const performSearch = function() {
                    const query = $input.val().trim();
                    if (!query) {
                        $results.html('<div class="vinco-search-hint">Enter a search term to find photos.</div>');
                        return;
                    }

                    $results.find('.vinco-gallery-loading').show();
                    $results.find('.vinco-gallery-grid').remove();

                    var ajaxOptions = {
                        url: vincoMAMFrontend.apiRoot + 'search?q=' + encodeURIComponent(query) + '&limit=50' + (isPublic ? '&public=true' : ''),
                        method: 'GET',
                        success: function(response) {
                            $results.find('.vinco-gallery-loading').hide();
                            const images = response.data?.images || response.images || [];
                            if (images.length === 0) {
                                $results.html(VincoGallery.createEmptyState('No results found for "' + query + '".'));
                                return;
                            }
                            VincoGallery.renderGallery($results, images, columns, true, false);
                        },
                        error: function(xhr) {
                            $results.find('.vinco-gallery-loading').hide();
                            var errorMsg = 'Search failed. Please try again.';
                            if (xhr.status === 401) errorMsg = 'Please log in to search.';
                            $results.html(VincoGallery.createErrorState(errorMsg));
                        }
                    };

                    if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                        ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
                    }

                    $.ajax(ajaxOptions);
                };

                $button.on('click', performSearch);
                $input.on('keypress', function(e) {
                    if (e.which === 13) performSearch();
                });
            });
        },

        createCardSkeleton: function(columns, count) {
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-card-grid ' + columnClass + '">';
            for (let i = 0; i < count; i++) {
                html += '<div class="vinco-card vinco-card-skeleton"><div class="vinco-skeleton" style="width: 100%; height: 150px;"></div><div class="vinco-skeleton" style="width: 70%; height: 20px; margin-top: 10px;"></div></div>';
            }
            html += '</div>';
            return html;
        },

        renderAlbumsList: function($container, albums, columns) {
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-card-grid ' + columnClass + '">';

            albums.forEach(function(album) {
                const coverUrl = album.coverImageUrl || '';
                const title = album.title || album.name || 'Untitled Album';
                const imageCount = album.imageCount || (album.imageIds ? album.imageIds.length : 0);

                // Link to album detail page - use vinco-album (singular) page with id param
                html += '<a href="' + VincoGallery.buildPageLink('vinco-album', 'id', album.albumId) + '" class="vinco-card vinco-album-card">';
                html += '<div class="vinco-card-image">';
                if (coverUrl) {
                    html += '<img src="' + coverUrl + '" alt="' + $('<div>').text(title).html() + '" loading="lazy" />';
                } else {
                    html += '<div class="vinco-card-placeholder">📷</div>';
                }
                html += '</div>';
                html += '<div class="vinco-card-content">';
                html += '<div class="vinco-card-title">' + $('<div>').text(title).html() + '</div>';
                html += '<div class="vinco-card-meta">' + imageCount + ' photo' + (imageCount !== 1 ? 's' : '') + '</div>';
                html += '</div>';
                html += '</a>';
            });

            html += '</div>';
            $container.html(html);
        },

        renderAthletesList: function($container, athletes, columns, showStats) {
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-card-grid ' + columnClass + '">';

            athletes.forEach(function(athlete) {
                const headshotUrl = athlete.headshotUrl || '';
                const name = athlete.name || 'Unknown Athlete';
                const nationality = athlete.nationality || '';
                const imageCount = athlete.imageCount || 0;

                // Link to athlete detail page
                html += '<a href="' + VincoGallery.buildPageLink('vinco-athlete', 'id', athlete.athleteId) + '" class="vinco-card vinco-athlete-card">';
                html += '<div class="vinco-card-image vinco-card-image-square">';
                if (headshotUrl) {
                    html += '<img src="' + headshotUrl + '" alt="' + $('<div>').text(name).html() + '" loading="lazy" />';
                } else {
                    html += '<div class="vinco-card-placeholder">👤</div>';
                }
                html += '</div>';
                html += '<div class="vinco-card-content">';
                html += '<div class="vinco-card-title">' + $('<div>').text(name).html() + '</div>';
                if (nationality) {
                    html += '<div class="vinco-card-subtitle">' + $('<div>').text(nationality).html() + '</div>';
                }
                if (showStats && imageCount > 0) {
                    html += '<div class="vinco-card-meta">' + imageCount + ' photo' + (imageCount !== 1 ? 's' : '') + '</div>';
                }
                html += '</div>';
                html += '</a>';
            });

            html += '</div>';
            $container.html(html);
        },

        renderEventsList: function($container, events, columns) {
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-card-grid ' + columnClass + '">';

            events.forEach(function(event) {
                const coverUrl = event.coverImageUrl || '';
                const title = event.name || event.title || 'Untitled Event';
                const date = event.date ? new Date(event.date).toLocaleDateString() : '';
                const location = event.location || '';
                const imageCount = event.imageCount || 0;

                // Link to event detail page
                html += '<a href="' + VincoGallery.buildPageLink('vinco-event', 'id', event.eventId) + '" class="vinco-card vinco-event-card">';
                html += '<div class="vinco-card-image">';
                if (coverUrl) {
                    html += '<img src="' + coverUrl + '" alt="' + $('<div>').text(title).html() + '" loading="lazy" />';
                } else {
                    html += '<div class="vinco-card-placeholder">📅</div>';
                }
                html += '</div>';
                html += '<div class="vinco-card-content">';
                html += '<div class="vinco-card-title">' + $('<div>').text(title).html() + '</div>';
                if (date || location) {
                    html += '<div class="vinco-card-subtitle">';
                    if (date) html += date;
                    if (date && location) html += ' • ';
                    if (location) html += $('<div>').text(location).html();
                    html += '</div>';
                }
                if (imageCount > 0) {
                    html += '<div class="vinco-card-meta">' + imageCount + ' photo' + (imageCount !== 1 ? 's' : '') + '</div>';
                }
                html += '</div>';
                html += '</a>';
            });

            html += '</div>';
            $container.html(html);
        },

        createLoadingSkeleton: function(columns, count) {
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-gallery-grid ' + columnClass + '">';
            for (let i = 0; i < count; i++) {
                html += '<div class="vinco-gallery-item"><div class="vinco-skeleton" style="width: 100%; height: 100%;"></div></div>';
            }
            html += '</div>';
            return html;
        },
        
        createErrorState: function(message) {
            return '<div class="vinco-error"><div class="vinco-error-icon">⚠️</div><div>' + $('<div>').text(message).html() + '</div></div>';
        },
        
        createEmptyState: function(message) {
            return '<div class="vinco-empty-state"><div class="vinco-empty-state-icon">📷</div><div class="vinco-empty-state-title">No Images</div><div class="vinco-empty-state-text">' + $('<div>').text(message).html() + '</div></div>';
        },
        
        renderGallery: function($container, images, columns, lightbox, showMetadata) {
            if (!images || images.length === 0) {
                $container.html(this.createEmptyState('No images found.'));
                return;
            }
            
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-gallery-grid ' + columnClass + '">';
            
            images.forEach(function(image, index) {
                const signedUrls = image.signedUrls || {};
                const thumbnailUrl = signedUrls.thumbnail || image.thumbnailUrl || signedUrls.proxy || '';
                const fullUrl = signedUrls.proxy || signedUrls.original || image.proxyUrl || image.originalUrl || thumbnailUrl;
                const title = image.title || image.filename || '';
                
                html += '<div class="vinco-gallery-item">';
                
                if (lightbox) {
                    html += '<a href="' + fullUrl + '" class="vinco-lightbox" data-index="' + index + '" data-title="' + $('<div>').text(title).html() + '" data-full-url="' + fullUrl + '">';
                }
                
                html += '<img src="' + thumbnailUrl + '" alt="' + $('<div>').text(title).html() + '" loading="lazy" />';
                
                if (lightbox) {
                    html += '</a>';
                }
                
                if (showMetadata && title) {
                    html += '<div class="vinco-image-title">' + $('<div>').text(title).html() + '</div>';
                }
                
                html += '</div>';
            });
            
            html += '</div>';
            $container.html(html);
            
            // Initialize lightbox if needed
            if (lightbox) {
                // Store all lightbox images for navigation
                this.lightboxImages = images.map(function(img) {
                    const signedUrls = img.signedUrls || {};
                    return {
                        url: signedUrls.proxy || signedUrls.original || img.proxyUrl || img.originalUrl,
                        title: img.title || img.filename || ''
                    };
                });
                
                $container.find('.vinco-lightbox').on('click', function(e) {
                    e.preventDefault();
                    const index = parseInt($(this).data('index')) || 0;
                    VincoGallery.openLightbox(index);
                });
            }
        },
        
        openLightbox: function(index) {
            if (!this.lightboxImages || this.lightboxImages.length === 0) return;
            
            this.currentLightboxIndex = index >= 0 && index < this.lightboxImages.length ? index : 0;
            const image = this.lightboxImages[this.currentLightboxIndex];
            
            // Create lightbox HTML
            const hasNext = this.currentLightboxIndex < this.lightboxImages.length - 1;
            const hasPrev = this.currentLightboxIndex > 0;
            
            let html = '<div class="vinco-lightbox-overlay">';
            html += '<div class="vinco-lightbox-counter">' + (this.currentLightboxIndex + 1) + ' / ' + this.lightboxImages.length + '</div>';
            html += '<div class="vinco-lightbox-controls">';
            html += '<button class="vinco-lightbox-close" aria-label="Close">×</button>';
            html += '</div>';
            
            if (hasPrev) {
                html += '<button class="vinco-lightbox-prev" aria-label="Previous">‹</button>';
            }
            
            if (hasNext) {
                html += '<button class="vinco-lightbox-next" aria-label="Next">›</button>';
            }
            
            html += '<div class="vinco-lightbox-content">';
            html += '<img src="' + image.url + '" alt="' + $('<div>').text(image.title).html() + '" />';
            if (image.title) {
                html += '<div class="vinco-lightbox-title">' + $('<div>').text(image.title).html() + '</div>';
            }
            html += '</div>';
            html += '</div>';
            
            const $lightbox = $(html);
            $('body').append($lightbox);
            
            // Close handlers
            $lightbox.find('.vinco-lightbox-close').on('click', function() {
                $lightbox.remove();
                $(document).off('keydown.vinco-lightbox');
            });
            
            $lightbox.on('click', function(e) {
                if ($(e.target).hasClass('vinco-lightbox-overlay')) {
                    $lightbox.remove();
                    $(document).off('keydown.vinco-lightbox');
                }
            });
            
            // Navigation handlers
            if (hasPrev) {
                $lightbox.find('.vinco-lightbox-prev').on('click', function(e) {
                    e.stopPropagation();
                    $lightbox.remove();
                    VincoGallery.openLightbox(VincoGallery.currentLightboxIndex - 1);
                });
            }
            
            if (hasNext) {
                $lightbox.find('.vinco-lightbox-next').on('click', function(e) {
                    e.stopPropagation();
                    $lightbox.remove();
                    VincoGallery.openLightbox(VincoGallery.currentLightboxIndex + 1);
                });
            }
            
            // Keyboard navigation
            $(document).on('keydown.vinco-lightbox', function(e) {
                if (e.keyCode === 27) { // ESC
                    $lightbox.remove();
                    $(document).off('keydown.vinco-lightbox');
                } else if (e.keyCode === 37 && hasPrev) { // Left arrow
                    $lightbox.remove();
                    VincoGallery.openLightbox(VincoGallery.currentLightboxIndex - 1);
                } else if (e.keyCode === 39 && hasNext) { // Right arrow
                    $lightbox.remove();
                    VincoGallery.openLightbox(VincoGallery.currentLightboxIndex + 1);
                }
            });
        },

        initTagsList: function() {
            $('.vinco-tags-list').each(function() {
                const $container = $(this);
                const type = $container.data('type') || '';
                const columns = parseInt($container.data('columns')) || 3;
                const showCounts = $container.data('show-counts') !== 'false';
                const showChildren = $container.data('show-children') !== 'false';
                const maxDepth = parseInt($container.data('max-depth')) || 2;
                const isPublic = $container.data('public') === 'true';

                // Show loading skeleton
                $container.html(VincoGallery.createCardSkeleton(columns, 6));

                let apiUrl = vincoMAMFrontend.apiRoot + 'tags/tree?maxDepth=' + maxDepth;
                if (type) apiUrl += '&tagType=' + encodeURIComponent(type);
                if (isPublic) apiUrl += '&public=true';

                var ajaxOptions = {
                    url: apiUrl,
                    method: 'GET',
                    success: function(response) {
                        const tree = response.tree || [];
                        if (tree.length === 0) {
                            $container.html(VincoGallery.createEmptyState('No tags found.'));
                            return;
                        }
                        VincoGallery.renderTagsTree($container, tree, columns, showCounts, showChildren);
                    },
                    error: function(xhr) {
                        var errorMsg = 'Unable to load tags.';
                        if (xhr.status === 401) errorMsg = 'Please log in to view tags.';
                        else if (xhr.status === 403) errorMsg = 'You do not have permission to view tags.';
                        $container.html(VincoGallery.createErrorState(errorMsg));
                    }
                };

                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
                }

                $.ajax(ajaxOptions);
            });
        },

        initTagGallery: function() {
            $('.vinco-tag-gallery').each(function() {
                const $container = $(this);
                const tagId = $container.data('tag-id') || '';
                const tagSlug = $container.data('tag-slug') || '';
                const columns = parseInt($container.data('columns')) || 4;
                const limit = parseInt($container.data('limit')) || 50;
                const lightbox = $container.data('lightbox') !== 'false';
                const showHeader = $container.data('show-header') !== 'false';
                const isPublic = $container.data('public') === 'true';

                if (!tagId && !tagSlug) {
                    $container.html(VincoGallery.createErrorState('Tag ID or slug is required.'));
                    return;
                }

                // Show loading skeleton
                $container.html(VincoGallery.createLoadingSkeleton(columns, 12));

                // First, fetch tag details
                let tagApiUrl = vincoMAMFrontend.apiRoot + 'tags';
                if (tagId) {
                    tagApiUrl += '?tagId=' + encodeURIComponent(tagId);
                } else {
                    tagApiUrl += '?slug=' + encodeURIComponent(tagSlug);
                }
                if (isPublic) tagApiUrl += '&public=true';

                var ajaxOptions = {
                    url: tagApiUrl,
                    method: 'GET',
                    success: function(response) {
                        const tags = response.tags || [];
                        const tag = tags.length > 0 ? tags[0] : null;

                        if (!tag) {
                            $container.html(VincoGallery.createEmptyState('Tag not found.'));
                            return;
                        }

                        // Now fetch images with this tag
                        let imagesApiUrl = vincoMAMFrontend.apiRoot + 'images?tagId=' + encodeURIComponent(tag.tagId) + '&limit=' + limit;
                        if (isPublic) imagesApiUrl += '&public=true';

                        var imageAjaxOptions = {
                            url: imagesApiUrl,
                            method: 'GET',
                            success: function(imgResponse) {
                                const images = imgResponse.data?.images || imgResponse.images || [];

                                let html = '';
                                if (showHeader) {
                                    html += '<div class="vinco-tag-header">';
                                    if (tag.color) {
                                        html += '<span class="vinco-tag-color" style="background-color: ' + tag.color + ';"></span>';
                                    }
                                    html += '<h2 class="vinco-tag-title">' + $('<div>').text(tag.name).html() + '</h2>';
                                    if (tag.description) {
                                        html += '<p class="vinco-tag-description">' + $('<div>').text(tag.description).html() + '</p>';
                                    }
                                    html += '<div class="vinco-tag-meta">' + (tag.imageCount || images.length) + ' photos</div>';
                                    html += '</div>';
                                }

                                if (images.length === 0) {
                                    $container.html(html + VincoGallery.createEmptyState('No images in this tag.'));
                                    return;
                                }

                                $container.html(html);
                                const $gallery = $('<div></div>').appendTo($container);
                                VincoGallery.renderGallery($gallery, images, columns, lightbox, false);
                            },
                            error: function() {
                                $container.html(VincoGallery.createErrorState('Error loading images.'));
                            }
                        };

                        if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                            imageAjaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
                        }

                        $.ajax(imageAjaxOptions);
                    },
                    error: function(xhr) {
                        var errorMsg = 'Tag not found.';
                        if (xhr.status === 401) errorMsg = 'Please log in to view this tag.';
                        else if (xhr.status === 403) errorMsg = 'You do not have permission to view this tag.';
                        $container.html(VincoGallery.createErrorState(errorMsg));
                    }
                };

                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
                }

                $.ajax(ajaxOptions);
            });
        },

        renderTagsTree: function($container, tree, columns, showCounts, showChildren) {
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-tags-grid ' + columnClass + '">';

            tree.forEach(function(tag) {
                html += VincoGallery.renderTagCard(tag, showCounts, showChildren);
            });

            html += '</div>';
            $container.html(html);
        },

        getPageUrl: function(pageSlug) {
            return vincoMAMFrontend.pages?.[pageSlug] || (window.location.origin + '/' + pageSlug + '/');
        },

        // Build URL with query parameter, handling both pretty and query-string permalinks
        buildPageLink: function(pageSlug, paramName, paramValue) {
            const baseUrl = this.getPageUrl(pageSlug);
            const separator = baseUrl.includes('?') ? '&' : '?';
            return baseUrl + separator + paramName + '=' + encodeURIComponent(paramValue);
        },

        renderTagCard: function(tag, showCounts, showChildren) {
            let html = '<div class="vinco-tag-card">';
            html += '<a href="' + VincoGallery.buildPageLink('vinco-tag', 'id', tag.tagId) + '" class="vinco-tag-link">';

            if (tag.color) {
                html += '<span class="vinco-tag-color-bar" style="background-color: ' + tag.color + ';"></span>';
            }

            html += '<div class="vinco-tag-card-content">';
            html += '<div class="vinco-tag-name">' + $('<div>').text(tag.name).html() + '</div>';

            if (tag.description) {
                html += '<div class="vinco-tag-desc">' + $('<div>').text(tag.description).html() + '</div>';
            }

            if (showCounts && tag.imageCount > 0) {
                html += '<div class="vinco-tag-count">' + tag.imageCount + ' photos</div>';
            }

            html += '</div></a>';

            // Render children if any
            if (showChildren && tag.children && tag.children.length > 0) {
                html += '<div class="vinco-tag-children">';
                tag.children.forEach(function(child) {
                    html += '<a href="' + VincoGallery.buildPageLink('vinco-tag', 'id', child.tagId) + '" class="vinco-tag-child">';
                    if (child.color) {
                        html += '<span class="vinco-tag-dot" style="background-color: ' + child.color + ';"></span>';
                    }
                    html += $('<div>').text(child.name).html();
                    if (showCounts && child.imageCount > 0) {
                        html += ' <span class="vinco-tag-child-count">(' + child.imageCount + ')</span>';
                    }
                    html += '</a>';
                });
                html += '</div>';
            }

            html += '</div>';
            return html;
        },

        // ===== Dynamic Detail Pages =====

        getUrlParam: function(name) {
            const params = new URLSearchParams(window.location.search);
            return params.get(name);
        },

        initPhotoPage: function() {
            const $container = $('#vinco-photo-page');
            if ($container.length === 0) return;

            const imageId = this.getUrlParam('id') || this.getUrlParam('photo');
            const isPublic = $container.data('public') === 'true' || $container.data('public') === true;

            if (!imageId) {
                $container.html(VincoGallery.createErrorState('Photo ID is required. Add ?id=xxx to the URL.'));
                return;
            }

            $container.html('<div class="vinco-photo-detail-loading"><div class="vinco-skeleton" style="width: 100%; max-width: 1200px; aspect-ratio: 16/10; margin: 0 auto;"></div></div>');

            var ajaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'images/' + encodeURIComponent(imageId) + (isPublic ? '?public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const image = response.data?.image || response.image || response;
                    VincoGallery.renderPhotoDetail($container, image);
                },
                error: function(xhr) {
                    var errorMsg = 'Photo not found.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view this photo.';
                    else if (xhr.status === 403) errorMsg = 'You do not have permission to view this photo.';
                    $container.html(VincoGallery.createErrorState(errorMsg));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(ajaxOptions);
        },

        renderPhotoDetail: function($container, image) {
            const signedUrls = image.signedUrls || {};
            const proxyUrl = signedUrls.proxy || signedUrls.original || image.proxyUrl || '';
            const title = image.title || image.filename || 'Untitled';
            const athletes = image.recognizedAthletes || [];
            const tags = image.tags || [];

            let html = '<div class="vinco-photo-detail">';

            // Main image
            html += '<div class="vinco-photo-detail-image">';
            html += '<img src="' + proxyUrl + '" alt="' + $('<div>').text(title).html() + '" />';
            html += '</div>';

            // Info panel
            html += '<div class="vinco-photo-detail-info">';
            html += '<h1 class="vinco-photo-title">' + $('<div>').text(title).html() + '</h1>';

            // Metadata
            html += '<div class="vinco-photo-meta">';
            if (image.photographerName) {
                html += '<div class="vinco-meta-item"><span class="vinco-meta-label">Photographer:</span> ' + $('<div>').text(image.photographerName).html() + '</div>';
            }
            if (image.uploadTime) {
                html += '<div class="vinco-meta-item"><span class="vinco-meta-label">Date:</span> ' + new Date(image.uploadTime).toLocaleDateString() + '</div>';
            }
            if (image.eventName) {
                html += '<div class="vinco-meta-item"><span class="vinco-meta-label">Event:</span> ' + $('<div>').text(image.eventName).html() + '</div>';
            }
            html += '</div>';

            // Athletes
            if (athletes.length > 0) {
                html += '<div class="vinco-photo-athletes">';
                html += '<h3>Athletes in this photo</h3>';
                html += '<div class="vinco-athlete-chips">';
                athletes.forEach(function(athlete) {
                    const name = athlete.athleteName || athlete.name || 'Unknown';
                    html += '<a href="' + VincoGallery.buildPageLink('vinco-athlete', 'id', athlete.athleteId) + '" class="vinco-athlete-chip">';
                    html += $('<div>').text(name).html();
                    html += '</a>';
                });
                html += '</div></div>';
            }

            // Tags
            if (tags.length > 0) {
                html += '<div class="vinco-photo-tags">';
                html += '<h3>Tags</h3>';
                html += '<div class="vinco-tag-chips">';
                tags.forEach(function(tag) {
                    html += '<a href="' + VincoGallery.buildPageLink('vinco-tag', 'id', tag.tagId) + '" class="vinco-tag-chip">';
                    if (tag.color) {
                        html += '<span class="vinco-tag-dot" style="background-color: ' + tag.color + ';"></span>';
                    }
                    html += $('<div>').text(tag.name).html();
                    html += '</a>';
                });
                html += '</div></div>';
            }

            // Face data (if available)
            if (image.faces && image.faces.length > 0) {
                html += '<div class="vinco-photo-faces">';
                html += '<h3>Face Analysis</h3>';
                image.faces.forEach(function(face, idx) {
                    html += '<div class="vinco-face-info">';
                    html += '<strong>Face ' + (idx + 1) + '</strong>';
                    if (face.dominantEmotion) {
                        html += '<div>Emotion: ' + face.dominantEmotion.toLowerCase() + '</div>';
                    }
                    if (face.ageRange) {
                        html += '<div>Age: ' + face.ageRange.low + '-' + face.ageRange.high + '</div>';
                    }
                    if (face.quality) {
                        html += '<div>Quality: ' + Math.round(face.quality.sharpness) + '% sharp</div>';
                    }
                    html += '</div>';
                });
                html += '</div>';
            }

            // Download button (if URL available)
            if (signedUrls.original) {
                html += '<div class="vinco-photo-actions">';
                html += '<a href="' + signedUrls.original + '" download class="vinco-download-btn">Download Original</a>';
                html += '</div>';
            }

            html += '</div></div>';
            $container.html(html);

            // Update page title
            document.title = title + ' - Photo Gallery';
        },

        initAthletePage: function() {
            const $container = $('#vinco-athlete-page');
            if ($container.length === 0) return;

            const athleteId = this.getUrlParam('id') || this.getUrlParam('athlete');
            const isPublic = $container.data('public') === 'true' || $container.data('public') === true;

            if (!athleteId) {
                $container.html(VincoGallery.createErrorState('Athlete ID is required.'));
                return;
            }

            $container.html(VincoGallery.createLoadingSkeleton(4, 8));

            var ajaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'athletes?athleteId=' + encodeURIComponent(athleteId) + (isPublic ? '&public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const athletes = response.athletes || [];
                    const athlete = athletes.length > 0 ? athletes[0] : null;

                    if (!athlete) {
                        $container.html(VincoGallery.createEmptyState('Athlete not found.'));
                        return;
                    }

                    VincoGallery.renderAthleteDetail($container, athlete, isPublic);
                },
                error: function(xhr) {
                    var errorMsg = 'Athlete not found.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view this athlete.';
                    $container.html(VincoGallery.createErrorState(errorMsg));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(ajaxOptions);
        },

        renderAthleteDetail: function($container, athlete, isPublic) {
            const name = athlete.displayName || ((athlete.firstName || '') + ' ' + (athlete.lastName || '')).trim() || 'Unknown Athlete';
            const headshotUrl = athlete.headshotUrl || '';

            let html = '<div class="vinco-athlete-detail">';

            // Profile header
            html += '<div class="vinco-athlete-header">';
            if (headshotUrl) {
                html += '<div class="vinco-athlete-avatar"><img src="' + headshotUrl + '" alt="' + $('<div>').text(name).html() + '" /></div>';
            } else {
                html += '<div class="vinco-athlete-avatar vinco-athlete-avatar-placeholder">👤</div>';
            }
            html += '<div class="vinco-athlete-info">';
            html += '<h1 class="vinco-athlete-name">' + $('<div>').text(name).html() + '</h1>';
            if (athlete.nationality) {
                html += '<div class="vinco-athlete-nationality">' + $('<div>').text(athlete.nationality).html() + '</div>';
            }
            if (athlete.disciplines && athlete.disciplines.length > 0) {
                html += '<div class="vinco-athlete-disciplines">' + athlete.disciplines.map(d => $('<div>').text(d).html()).join(', ') + '</div>';
            }
            if (athlete.team) {
                html += '<div class="vinco-athlete-team">' + $('<div>').text(athlete.team).html() + '</div>';
            }
            html += '</div></div>';

            // Photo gallery
            html += '<div class="vinco-athlete-gallery">';
            html += '<h2>Photos</h2>';
            html += '<div id="vinco-athlete-photos"></div>';
            html += '</div>';

            html += '</div>';
            $container.html(html);

            // Update page title
            document.title = name + ' - Athletes';

            // Load athlete photos
            const $photos = $('#vinco-athlete-photos');
            $photos.html(VincoGallery.createLoadingSkeleton(4, 8));

            var photoAjaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'images?athleteId=' + encodeURIComponent(athlete.athleteId) + '&limit=50' + (isPublic ? '&public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const images = response.data?.images || response.images || [];
                    if (images.length === 0) {
                        $photos.html(VincoGallery.createEmptyState('No photos found for this athlete.'));
                        return;
                    }
                    VincoGallery.renderGallery($photos, images, 4, true, false);
                },
                error: function() {
                    $photos.html(VincoGallery.createErrorState('Unable to load photos.'));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                photoAjaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(photoAjaxOptions);
        },

        initEventPage: function() {
            const $container = $('#vinco-event-page');
            if ($container.length === 0) return;

            const eventId = this.getUrlParam('id') || this.getUrlParam('event');
            const isPublic = $container.data('public') === 'true' || $container.data('public') === true;

            if (!eventId) {
                $container.html(VincoGallery.createErrorState('Event ID is required.'));
                return;
            }

            $container.html(VincoGallery.createLoadingSkeleton(4, 8));

            var ajaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'events?eventId=' + encodeURIComponent(eventId) + (isPublic ? '&public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const events = response.events || [];
                    const event = events.length > 0 ? events[0] : null;

                    if (!event) {
                        $container.html(VincoGallery.createEmptyState('Event not found.'));
                        return;
                    }

                    VincoGallery.renderEventDetail($container, event, isPublic);
                },
                error: function(xhr) {
                    var errorMsg = 'Event not found.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view this event.';
                    $container.html(VincoGallery.createErrorState(errorMsg));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(ajaxOptions);
        },

        renderEventDetail: function($container, event, isPublic) {
            const title = event.name || event.title || 'Untitled Event';
            const date = event.date ? new Date(event.date).toLocaleDateString() : '';

            let html = '<div class="vinco-event-detail">';

            // Event header
            html += '<div class="vinco-event-header">';
            html += '<h1 class="vinco-event-title">' + $('<div>').text(title).html() + '</h1>';
            html += '<div class="vinco-event-meta">';
            if (date) html += '<span class="vinco-event-date">' + date + '</span>';
            if (event.location) html += '<span class="vinco-event-location">' + $('<div>').text(event.location).html() + '</span>';
            html += '</div>';
            if (event.description) {
                html += '<p class="vinco-event-description">' + $('<div>').text(event.description).html() + '</p>';
            }
            html += '</div>';

            // Photo gallery
            html += '<div class="vinco-event-gallery">';
            html += '<h2>Event Photos</h2>';
            html += '<div id="vinco-event-photos"></div>';
            html += '</div>';

            html += '</div>';
            $container.html(html);

            // Update page title
            document.title = title + ' - Events';

            // Load event photos
            const $photos = $('#vinco-event-photos');
            $photos.html(VincoGallery.createLoadingSkeleton(4, 12));

            var photoAjaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'images?eventId=' + encodeURIComponent(event.eventId) + '&limit=100' + (isPublic ? '&public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const images = response.data?.images || response.images || [];
                    if (images.length === 0) {
                        $photos.html(VincoGallery.createEmptyState('No photos found for this event.'));
                        return;
                    }
                    VincoGallery.renderGallery($photos, images, 4, true, false);
                },
                error: function() {
                    $photos.html(VincoGallery.createErrorState('Unable to load photos.'));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                photoAjaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(photoAjaxOptions);
        },

        initAlbumPage: function() {
            const $container = $('#vinco-album-page');
            if ($container.length === 0) return;

            const albumId = this.getUrlParam('id') || this.getUrlParam('album');
            const isPublic = $container.data('public') === 'true' || $container.data('public') === true;

            if (!albumId) {
                $container.html(VincoGallery.createErrorState('Album ID is required.'));
                return;
            }

            $container.html(VincoGallery.createLoadingSkeleton(4, 12));

            var ajaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'albums/' + encodeURIComponent(albumId) + (isPublic ? '?public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const album = response.data?.album || response.album || response;

                    if (!album || !album.albumId) {
                        $container.html(VincoGallery.createEmptyState('Album not found.'));
                        return;
                    }

                    VincoGallery.renderAlbumDetail($container, album, isPublic);
                },
                error: function(xhr) {
                    var errorMsg = 'Album not found.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view this album.';
                    $container.html(VincoGallery.createErrorState(errorMsg));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(ajaxOptions);
        },

        renderAlbumDetail: function($container, album, isPublic) {
            const title = album.title || album.name || 'Untitled Album';
            const imageCount = album.imageCount || (album.imageIds ? album.imageIds.length : 0);

            let html = '<div class="vinco-album-detail">';

            // Album header
            html += '<div class="vinco-album-header">';
            html += '<h1 class="vinco-album-title">' + $('<div>').text(title).html() + '</h1>';
            html += '<div class="vinco-album-meta">' + imageCount + ' photos</div>';
            if (album.description) {
                html += '<p class="vinco-album-description">' + $('<div>').text(album.description).html() + '</p>';
            }
            html += '</div>';

            // Photo gallery
            html += '<div class="vinco-album-gallery">';
            html += '<div id="vinco-album-photos"></div>';
            html += '</div>';

            html += '</div>';
            $container.html(html);

            // Update page title
            document.title = title + ' - Albums';

            // Load album photos
            const $photos = $('#vinco-album-photos');
            if (album.imageIds && album.imageIds.length > 0) {
                $photos.html(VincoGallery.createLoadingSkeleton(4, Math.min(album.imageIds.length, 12)));

                const imageIds = album.imageIds.slice(0, 100).join(',');
                var photoAjaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'images?ids=' + encodeURIComponent(imageIds) + (isPublic ? '&public=true' : ''),
                    method: 'GET',
                    success: function(response) {
                        const images = response.data?.images || response.images || [];
                        if (images.length === 0) {
                            $photos.html(VincoGallery.createEmptyState('This album is empty.'));
                            return;
                        }
                        VincoGallery.renderGallery($photos, images, 4, true, false);
                    },
                    error: function() {
                        $photos.html(VincoGallery.createErrorState('Unable to load photos.'));
                    }
                };

                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    photoAjaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
                }

                $.ajax(photoAjaxOptions);
            } else {
                $photos.html(VincoGallery.createEmptyState('This album is empty.'));
            }
        },

        initTagPage: function() {
            const $container = $('#vinco-tag-page');
            if ($container.length === 0) return;

            const tagId = this.getUrlParam('id') || this.getUrlParam('tag');
            const isPublic = $container.data('public') === 'true' || $container.data('public') === true;

            if (!tagId) {
                $container.html(VincoGallery.createErrorState('Tag ID is required.'));
                return;
            }

            $container.html(VincoGallery.createLoadingSkeleton(4, 12));

            var ajaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'tags?tagId=' + encodeURIComponent(tagId) + (isPublic ? '&public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const tags = response.tags || [];
                    const tag = tags.length > 0 ? tags[0] : null;

                    if (!tag) {
                        $container.html(VincoGallery.createEmptyState('Tag not found.'));
                        return;
                    }

                    VincoGallery.renderTagDetail($container, tag, isPublic);
                },
                error: function(xhr) {
                    var errorMsg = 'Tag not found.';
                    if (xhr.status === 401) errorMsg = 'Please log in to view this tag.';
                    $container.html(VincoGallery.createErrorState(errorMsg));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                ajaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(ajaxOptions);
        },

        renderTagDetail: function($container, tag, isPublic) {
            let html = '<div class="vinco-tag-detail">';

            // Tag header
            html += '<div class="vinco-tag-header">';
            if (tag.color) {
                html += '<span class="vinco-tag-color" style="background-color: ' + tag.color + ';"></span>';
            }
            html += '<h1 class="vinco-tag-title">' + $('<div>').text(tag.name).html() + '</h1>';
            if (tag.description) {
                html += '<p class="vinco-tag-description">' + $('<div>').text(tag.description).html() + '</p>';
            }
            html += '<div class="vinco-tag-meta">' + (tag.imageCount || 0) + ' photos</div>';
            html += '</div>';

            // Child tags if any
            if (tag.children && tag.children.length > 0) {
                html += '<div class="vinco-tag-subtags">';
                html += '<h3>Sub-categories</h3>';
                html += '<div class="vinco-tag-children">';
                tag.children.forEach(function(child) {
                    html += '<a href="' + VincoGallery.buildPageLink('vinco-tag', 'id', child.tagId) + '" class="vinco-tag-child">';
                    if (child.color) {
                        html += '<span class="vinco-tag-dot" style="background-color: ' + child.color + ';"></span>';
                    }
                    html += $('<div>').text(child.name).html();
                    if (child.imageCount > 0) {
                        html += ' <span class="vinco-tag-child-count">(' + child.imageCount + ')</span>';
                    }
                    html += '</a>';
                });
                html += '</div></div>';
            }

            // Photo gallery
            html += '<div class="vinco-tag-gallery">';
            html += '<div id="vinco-tag-photos"></div>';
            html += '</div>';

            html += '</div>';
            $container.html(html);

            // Update page title
            document.title = tag.name + ' - Browse by Category';

            // Load tag photos
            const $photos = $('#vinco-tag-photos');
            $photos.html(VincoGallery.createLoadingSkeleton(4, 12));

            var photoAjaxOptions = {
                url: vincoMAMFrontend.apiRoot + 'images?tagId=' + encodeURIComponent(tag.tagId) + '&limit=100' + (isPublic ? '&public=true' : ''),
                method: 'GET',
                success: function(response) {
                    const images = response.data?.images || response.images || [];
                    if (images.length === 0) {
                        $photos.html(VincoGallery.createEmptyState('No photos in this category.'));
                        return;
                    }
                    VincoGallery.renderGallery($photos, images, 4, true, false);
                },
                error: function() {
                    $photos.html(VincoGallery.createErrorState('Unable to load photos.'));
                }
            };

            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                photoAjaxOptions.headers = { 'X-WP-Nonce': vincoMAMFrontend.nonce };
            }

            $.ajax(photoAjaxOptions);
        }
    };

    $(document).ready(function() {
        VincoGallery.init();
    });

})(jQuery);
