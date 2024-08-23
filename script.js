const buttons = document.querySelectorAll('button');

buttons.forEach(button => {
  button.style.backgroundImage = `url(${button.dataset.icon})`;
});

let map;

let campgrounds = [];

        function initializeMap() {
            mapboxgl.accessToken = 'pk.eyJ1IjoiaWZvcm1haGVyIiwiYSI6ImNsaHBjcnAwNDF0OGkzbnBzZmUxM2Q2bXgifQ.fIyIgSwq1WWVk9CKlXRXiQ';
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [-120.16165, 43.8599],
                zoom: 6
            });

            fetch('resources/campgrounds.json')
                .then(response => response.json())
                .then(data => {
                    campgrounds = data;
                    map.on('load', function() {
                        addCampsites();
                        addClickEvents();
                        setupBasemapToggle();
                        setupBookmarks();
                    });
                })
                .catch(error => console.error('Error loading campgrounds data:', error));
        }

        function addCampsites() {
            fetch('https://yahnjr.github.io/campingapp/resources/Camp_photospheres.geojson')
                .then(response => response.json())
                .then(data => {
                    campgrounds.forEach(function(campground,index) {
                        var marker = new mapboxgl.Marker()
                            .setLngLat(campground.coordinates)
                            .addTo(map);
                        
                        var popup = new mapboxgl.Popup({ offset: 25 }).setText(campground.displayName);

                        marker.getElement().addEventListener('mouseenter', function() {
                            popup.addTo(map);
                            marker.togglePopup();
                        });

                        marker.getElement().addEventListener('mouseleave', function() {
                            popup.remove();
                        });
                        
                        marker.getElement().addEventListener('click', function() {
                            map.flyTo({
                                center: campground.coordinates,
                                zoom: campground.zoom,
                                bearing: campground.rotation,
                                essential: true
                            });
                        });

                        map.on('zoom', function() {
                            var zoom = map.getZoom();
                            console.log(zoom);
                            if (zoom > campground.maxZoom) {
                                marker.getElement().style.display = 'none';
                            } else {
                                marker.getElement().style.display = 'block';
                            }
                        });

                        map.addSource(campground.name + '-image', {
                            'type': 'image',
                            'url': campground.imagePath,
                            'coordinates': campground.imageCoordinates
                        });

                        map.addLayer({
                            'id': campground.name + '-image',
                            'type': 'raster',
                            'source': campground.name + '-image',
                            'paint': {
                                'raster-opacity': 0.7
                            }
                        });

                        map.setLayoutProperty(campground.name + '-image', 'visibility', 'none');
                    });

                    var mapToggle = document.getElementById('map-toggle');
                    mapToggle.addEventListener('click', function() {
                        campgrounds.forEach(function(campground) {
                            var campImage = campground.name + '-image'
                            var visibility = map.getLayoutProperty(campImage, 'visibility');

                            if (visibility === 'visible') {
                                map.setLayoutProperty(campImage, 'visibility', 'none');
                            } else {
                                map.setLayoutProperty(campImage, 'visibility', 'visible');
                            }
                        })
                    })

                    if (map.getSource('campsites')) {
                        map.removeSource('campsites');
                    }
                    map.addSource('campsites', {
                        type: 'geojson',
                        data: data
                    });

                    if (map.getLayer('campsites-layer')) {
                        map.removeLayer('campsites-layer');
                    }
                    map.addLayer({
                        id: 'campsites-layer',
                        type: 'circle',
                        source: 'campsites',
                        paint: {
                            'circle-radius': 10,
                            'circle-color': '#007cbf'
                        },
                        minzoom: 13
                    });

                    if (map.getLayer('campsites-labels')) {
                        map.removeLayer('campsites-labels');
                    }
                    map.addLayer({
                        id: 'campsites-labels',
                        type: 'symbol',
                        source: 'campsites',
                        layout: {
                            'text-field': ['get', 'Campsite'],
                            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                            'text-size': 16,
                            'text-offset': [0, 0.6],
                            'text-anchor': 'top',
                            'text-allow-overlap': true
                        },
                        paint: {
                            'text-color': '#ffffff',
                            'text-halo-color': '#000000',
                            'text-halo-width': 2
                        },
                        minzoom: 13
                    });                    
                })
                .catch(error => console.error('Error loading GeoJSON:', error));
        }

        function addClickEvents() {
            if (!map.listeners) map.listeners = {};

            // Remove existing listeners if they exist
            if (map.listeners.mouseenter) {
                map.off('mouseenter', 'campsites-layer', map.listeners.mouseenter);
            }
            if (map.listeners.mouseleave) {
                map.off('mouseleave', 'campsites-layer', map.listeners.mouseleave);
            }
            if (map.listeners.click) {
                map.off('click', 'campsites-layer', map.listeners.click);
            }

            // Add new listeners
            map.listeners.mouseenter = function() {
                map.getCanvas().style.cursor = 'pointer';
            };
            map.listeners.mouseleave = function() {
                map.getCanvas().style.cursor = '';
            };
            map.listeners.click = function(e) {
                var site = e.features[0].properties.Campground;
                var sitenum = e.features[0].properties.Suffix;
                var campsite = e.features[0].properties.Campsite;
                var iframeSrc = `https://yahnjr.github.io/campingapp/viewer/?location=${site}&site=${sitenum}`;
                
                console.log("Loading iframe with source:", iframeSrc);
                document.getElementById("photosphere-iframe").src = iframeSrc;
                document.getElementById("modal-title").textContent = `Campsite #: ${campsite}`;
                document.getElementById("photosphere-modal").style.display = "block";
            };

            map.on('mouseenter', 'campsites-layer', map.listeners.mouseenter);
            map.on('mouseleave', 'campsites-layer', map.listeners.mouseleave);
            map.on('click', 'campsites-layer', map.listeners.click);
        }

        function setupBasemapToggle() {
            let isStreets = true;

            document.getElementById('basemapToggle').addEventListener('click', function(){
                const newStyle = isStreets
                ? 'mapbox://styles/mapbox/satellite-streets-v11'
                : 'mapbox://styles/mapbox/streets-v11';

                map.once('styledata', function() {
                    addCampsites();
                    addClickEvents();
                });

                map.setStyle(newStyle);
                isStreets = !isStreets;

                this.style.backgroundImage = `url(${isStreets ? 'https://yahnjr.github.io/campingapp/resources/icons/freepik-satellite.png' : 'https://yahnjr.github.io/campingapp/resources/icons/freepik-motorway.png'})`;
                this.title = isStreets ? 'Switch to Satellite' : 'Switch to Streets';
            });
        }

        function setupBookmarks() {
            document.querySelectorAll('#dropdownContent a').forEach(function (bookmark) {
                bookmark.addEventListener('click', function() {
                    const lat = parseFloat(this.getAttribute('data-lat'));
                    const lng = parseFloat(this.getAttribute('data-lng'));
                    const zoom = parseFloat(this.getAttribute('data-zoom'));
                    const rotation = parseFloat(this.getAttribute('data-rotation'));

                    map.flyTo({
                        center: [lng, lat],
                        zoom: zoom,
                        bearing: rotation
                    });
                });
            });
        }

        window.onload = function() {
            initializeMap();

            var photosphereModal = document.getElementById("photosphere-modal");
            var photosphereClose = document.getElementsByClassName("close")[0];

            photosphereClose.onclick = function() {
                photosphereModal.style.display = "none";
                document.getElementById("photosphere-iframe").src = "";
            }
            
            window.onclick = function(event) {
                if (event.target === photosphereModal) {
                    photosphereModal.style.display = "none";
                    document.getElementById("photosphere-iframe").src = "";
                }
            };
        };