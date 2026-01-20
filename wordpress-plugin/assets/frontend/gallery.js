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
                const isPublic = $gallery.data('public') === 'true';
                
                // Show loading skeleton
                $gallery.html(VincoGallery.createLoadingSkeleton(columns, Math.min(limit, 12)));
                
                // Build API URL
                let apiUrl = vincoMAMFrontend.apiRoot + 'images?limit=' + limit;
                if (eventId) apiUrl += '&eventId=' + encodeURIComponent(eventId);
                if (photographerId) apiUrl += '&photographerId=' + encodeURIComponent(photographerId);
                if (albumId) apiUrl += '&albumId=' + encodeURIComponent(albumId);
                if (isPublic) apiUrl += '&public=true';
                
                // Fetch and render images
                var ajaxOptions = {
                    url: apiUrl,
                    method: 'GET',
                    success: function(response) {
                        const images = response.data?.images || response.images || [];
                        if (images.length === 0) {
                            $gallery.html(VincoGallery.createEmptyState('No images found.'));
                            return;
                        }
                        VincoGallery.renderGallery($gallery, images, columns, lightbox, showMetadata);
                    },
                    error: function(xhr, status, error) {
                        var errorMsg = 'Unable to load gallery. Please try again later.';
                        if (xhr.status === 401) {
                            errorMsg = 'Please log in to view this gallery.';
                        } else if (xhr.status === 403) {
                            errorMsg = 'You do not have permission to view this gallery.';
                        } else if (xhr.status === 404) {
                            errorMsg = 'Gallery not found.';
                        }
                        $gallery.html(VincoGallery.createErrorState(errorMsg));
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
        }
    };
    
    $(document).ready(function() {
        VincoGallery.init();
    });
    
})(jQuery);
