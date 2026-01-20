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
                var ajaxOptions = {
                    url: apiUrl,
                    method: 'GET',
                    success: function(response) {
                        VincoGallery.renderGallery($gallery, response.images || [], columns, lightbox, showMetadata);
                    },
                    error: function(xhr, status, error) {
                        var errorMsg = 'Error loading gallery.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view this gallery.';
                        } else if (xhr.status === 403) {
                            errorMsg = 'You do not have permission to view this gallery.';
                        }
                        $gallery.html('<p class="vinco-error">' + errorMsg + '</p>');
                    }
                };
                
                // Add nonce if available (for logged-in users)
                if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                    ajaxOptions.headers = {
                        'X-WP-Nonce': vincoMAMFrontend.nonce
                    };
                }
                
                $.ajax(ajaxOptions);
            });
        },
        
        initAlbums: function() {
            $('.vinco-album').each(function() {
                const $album = $(this);
                const albumId = $album.data('album-id');
                const columns = parseInt($album.data('columns')) || 4;
                const lightbox = $album.data('lightbox') === 'true';
                
                // Fetch album data
                var ajaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'albums/' + albumId,
                    method: 'GET',
                    success: function(album) {
                        // Fetch album images
                        if (album.imageIds && album.imageIds.length > 0) {
                            const imageIds = album.imageIds.slice(0, 50).join(',');
                            var imageAjaxOptions = {
                                url: vincoMAMFrontend.apiRoot + 'images?ids=' + imageIds,
                                method: 'GET',
                                success: function(response) {
                                    VincoGallery.renderGallery($album, response.images || [], columns, lightbox, false);
                                },
                                error: function() {
                                    $album.find('.vinco-gallery-loading').html('<p>Error loading album images.</p>');
                                }
                            };
                            
                            if (vincoMAMFrontend && vincoMAMFrontend.nonce) {
                                imageAjaxOptions.headers = {
                                    'X-WP-Nonce': vincoMAMFrontend.nonce
                                };
                            }
                            
                            $.ajax(imageAjaxOptions);
                        }
                    },
                    error: function(xhr) {
                        var errorMsg = 'Album not found.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view this album.';
                        }
                        $album.html('<p class="vinco-error">' + errorMsg + '</p>');
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
                
                var ajaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'images/' + imageId,
                    method: 'GET',
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
                    error: function(xhr) {
                        var errorMsg = 'Image not found.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view this image.';
                        }
                        $container.html('<p class="vinco-error">' + errorMsg + '</p>');
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
                
                // Fetch images with athlete recognition
                var ajaxOptions = {
                    url: vincoMAMFrontend.apiRoot + 'images?athleteId=' + athleteId + '&limit=' + limit,
                    method: 'GET',
                    success: function(response) {
                        VincoGallery.renderGallery($gallery, response.images || [], columns, lightbox, false);
                    },
                    error: function(xhr) {
                        var errorMsg = 'No images found for this athlete.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view athlete photos.';
                        }
                        $gallery.html('<p class="vinco-error">' + errorMsg + '</p>');
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
