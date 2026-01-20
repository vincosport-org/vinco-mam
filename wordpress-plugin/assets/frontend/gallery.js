/**
 * Frontend gallery JavaScript for shortcodes
 */
(function($) {
    'use strict';
    
    const VincoGallery = {
        init: function() {
            this.initGalleries();
            this.initAlbums();
            this.initImages();
            this.initAthleteGalleries();
        },
        
        initGalleries: function() {
            $('.vinco-gallery').each(function() {
                const $gallery = $(this);
                const eventId = $gallery.data('event-id');
                const photographerId = $gallery.data('photographer-id');
                const albumId = $gallery.data('album-id');
                const limit = parseInt($gallery.data('limit')) || 20;
                const columns = parseInt($gallery.data('columns')) || 4;
                const lightbox = $gallery.data('lightbox') === 'true' || $gallery.data('lightbox') === true;
                const showMetadata = $gallery.data('show-metadata') === 'true';
                
                // Build API URL
                let apiUrl = vincoMAMFrontend.apiRoot + 'images?limit=' + limit;
                if (eventId) apiUrl += '&eventId=' + eventId;
                if (photographerId) apiUrl += '&photographerId=' + photographerId;
                if (albumId) apiUrl += '&albumId=' + albumId;
                
                // Fetch and render images
                $.ajax({
                    url: apiUrl,
                    method: 'GET',
                    headers: {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    },
                    success: function(response) {
                        VincoGallery.renderGallery($gallery, response.images || [], columns, lightbox, showMetadata);
                    },
                    error: function() {
                        $gallery.html('<p>Error loading gallery. Please try again later.</p>');
                    }
                });
            });
        },
        
        initAlbums: function() {
            $('.vinco-album').each(function() {
                const $album = $(this);
                const albumId = $album.data('album-id');
                const columns = parseInt($album.data('columns')) || 4;
                const lightbox = $album.data('lightbox') === 'true';
                
                // Fetch album data
                $.ajax({
                    url: vincoMAMFrontend.apiRoot + 'albums/' + albumId,
                    method: 'GET',
                    headers: {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    },
                    success: function(album) {
                        // Fetch album images
                        if (album.imageIds && album.imageIds.length > 0) {
                            const imageIds = album.imageIds.slice(0, 50).join(',');
                            $.ajax({
                                url: vincoMAMFrontend.apiRoot + 'images?ids=' + imageIds,
                                method: 'GET',
                                headers: {
                                    'X-WP-Nonce': vincoMAMFrontend.nonce
                                },
                                success: function(response) {
                                    VincoGallery.renderGallery($album, response.images || [], columns, lightbox, false);
                                }
                            });
                        }
                    },
                    error: function() {
                        $album.html('<p>Album not found.</p>');
                    }
                });
            });
        },
        
        initImages: function() {
            $('.vinco-single-image').each(function() {
                const $container = $(this);
                const imageId = $container.data('image-id');
                const size = $container.data('size') || 'large';
                const showCaption = $container.data('caption') === 'true';
                const link = $container.data('link') === 'true';
                
                $.ajax({
                    url: vincoMAMFrontend.apiRoot + 'images/' + imageId,
                    method: 'GET',
                    headers: {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    },
                    success: function(image) {
                        const url = size === 'original' ? image.signedUrls.original : 
                                   size === 'large' ? image.signedUrls.proxy : 
                                   image.signedUrls.thumbnail;
                        
                        let html = '';
                        if (link) {
                            html += '<a href="' + image.signedUrls.original + '" target="_blank">';
                        }
                        html += '<img src="' + url + '" alt="' + (image.title || '') + '" class="vinco-image" />';
                        if (link) {
                            html += '</a>';
                        }
                        if (showCaption && image.title) {
                            html += '<p class="vinco-image-caption">' + image.title + '</p>';
                        }
                        $container.html(html);
                    },
                    error: function() {
                        $container.html('<p>Image not found.</p>');
                    }
                });
            });
        },
        
        initAthleteGalleries: function() {
            $('.vinco-athlete-gallery').each(function() {
                const $gallery = $(this);
                const athleteId = $gallery.data('athlete-id');
                const limit = parseInt($gallery.data('limit')) || 10;
                const columns = parseInt($gallery.data('columns')) || 3;
                const lightbox = $gallery.data('lightbox') === 'true';
                
                // Fetch images with athlete recognition
                $.ajax({
                    url: vincoMAMFrontend.apiRoot + 'images?athleteId=' + athleteId + '&limit=' + limit,
                    method: 'GET',
                    headers: {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    },
                    success: function(response) {
                        VincoGallery.renderGallery($gallery, response.images || [], columns, lightbox, false);
                    },
                    error: function() {
                        $gallery.html('<p>No images found for this athlete.</p>');
                    }
                });
            });
        },
        
        renderGallery: function($container, images, columns, lightbox, showMetadata) {
            if (!images || images.length === 0) {
                $container.html('<p>No images found.</p>');
                return;
            }
            
            const columnClass = 'vinco-col-' + Math.min(columns, 6);
            let html = '<div class="vinco-gallery-grid ' + columnClass + '">';
            
            images.forEach(function(image) {
                const url = image.signedUrls ? image.signedUrls.thumbnail : image.thumbnailUrl;
                html += '<div class="vinco-gallery-item">';
                
                if (lightbox) {
                    html += '<a href="' + (image.signedUrls ? image.signedUrls.proxy : image.proxyUrl) + '" class="vinco-lightbox" data-title="' + (image.title || '') + '">';
                }
                
                html += '<img src="' + url + '" alt="' + (image.title || '') + '" loading="lazy" />';
                
                if (lightbox) {
                    html += '</a>';
                }
                
                if (showMetadata && image.title) {
                    html += '<div class="vinco-image-title">' + image.title + '</div>';
                }
                
                html += '</div>';
            });
            
            html += '</div>';
            $container.html(html);
            
            // Initialize lightbox if needed
            if (lightbox) {
                $container.find('.vinco-lightbox').on('click', function(e) {
                    e.preventDefault();
                    VincoGallery.openLightbox($(this).attr('href'), $(this).data('title'));
                });
            }
        },
        
        openLightbox: function(imageUrl, title) {
            // Simple lightbox implementation
            const $lightbox = $('<div class="vinco-lightbox-overlay"><div class="vinco-lightbox-content"><img src="' + imageUrl + '" /><button class="vinco-lightbox-close">&times;</button>' + (title ? '<div class="vinco-lightbox-title">' + title + '</div>' : '') + '</div></div>');
            $('body').append($lightbox);
            
            $lightbox.on('click', function(e) {
                if ($(e.target).hasClass('vinco-lightbox-overlay') || $(e.target).hasClass('vinco-lightbox-close')) {
                    $lightbox.remove();
                }
            });
            
            $(document).on('keydown.lightbox', function(e) {
                if (e.keyCode === 27) { // ESC
                    $lightbox.remove();
                    $(document).off('keydown.lightbox');
                }
            });
        }
    };
    
    $(document).ready(function() {
        VincoGallery.init();
    });
    
})(jQuery);
