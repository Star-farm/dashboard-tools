// ====================================================================
// DATA DECLARATION
// Make sure the variable 'table' is an imported CSV Polygon FeatureCollection
// Example: var table = ee.FeatureCollection("users/username/your_uploaded_csv");
// ====================================================================

// ====================================================================
// 0. CLEAN MAP INITIALIZATION
// ====================================================================
var CLEAN_STYLE = [
  { featureType: 'all',            elementType: 'labels',     stylers: [{ visibility: 'off' }] },
  { featureType: 'road',           elementType: 'all',        stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'all',        stylers: [{ visibility: 'off' }] }
];
Map.setOptions('SATELLITE', { styles: CLEAN_STYLE });
Map.setControlVisibility({ all: false, zoomControl: true, fullscreenControl: true, layerList: false });

Map.addLayer(
  table.style({ color: '#ffffff00', width: 0, fillColor: '00000000' }),
  {},
  'Polygon boundaries'
);

// ====================================================================
// 1. VISUALIZATION PARAMETERS & DATA CONFIG
// ====================================================================
var VIS = {
  bands: ['b1'],
  min: 0.04,
  max: 3.65,
  palette: ['blue', 'green', 'yellow', 'red']
};

var DATA = [
  { year: '2018', image: image.clip(table)  },
  { year: '2019', image: image2.clip(table) },
  { year: '2020', image: image3.clip(table) },
  { year: '2021', image: image4.clip(table) },
  { year: '2022', image: image5.clip(table) },
  { year: '2023', image: image6.clip(table) },
  { year: '2024', image: image7.clip(table) }
];

// Add all layers up front; only year 0 is visible initially
var mapLayers = DATA.map(function(item, i) {
  var layer = ui.Map.Layer(item.image, VIS, 'Year ' + item.year, true);
  layer.setOpacity(i === 0 ? 1.0 : 0.0);
  Map.layers().add(layer);
  return layer;
});

Map.centerObject(table, 10);

// State
var currentIndex = 0;
var activeImage  = DATA[0].image;
var isPlaying    = false;

// Highlight layer for clicked polygon
var highlightLayer = ui.Map.Layer(ee.Image(), {}, 'Selected polygon');
Map.layers().add(highlightLayer);

// ====================================================================
// 2. INSPECTOR PANEL
// ====================================================================
var inspectorPanel = ui.Panel({
  style: { position: 'top-right', padding: '12px 18px', width: '320px', border: '1px solid #ccc' }
});

var titleLabel = ui.Label({
  value: 'Statistics (' + DATA[0].year + ')',
  style: { fontWeight: 'bold', fontSize: '14px', margin: '4px 4px 8px 4px', color: 'black' }
});

var valueLabel = ui.Label({
  value: 'Cropping Intensity:\nClick inside a polygon to calculate.',
  style: { color: '#7f8c8d', fontSize: '14px', margin: '8px 4px 4px 4px', whiteSpace: 'pre' }
});

inspectorPanel.add(titleLabel);
inspectorPanel.add(valueLabel);
Map.add(inspectorPanel);
Map.style().set('cursor', 'crosshair');

var resetInspector = function() {
  valueLabel.setValue('Cropping Intensity:\nClick inside a polygon to calculate.');
  valueLabel.style().set({ color: '#7f8c8d', fontSize: '14px', fontWeight: 'normal', fontStyle: 'normal', margin: '8px 4px 4px 4px' });
  highlightLayer.setEeObject(ee.Image());
};

// ====================================================================
// 3. SMOOTH CROSSFADE TRANSITION
// GEE UI has no CSS transitions, so we simulate a crossfade by
// stepping opacity in small increments via recursive setTimeout calls.
//
//   FADE_STEPS : number of opacity steps (higher = smoother)
//   FADE_MS    : total crossfade duration in milliseconds
//   Each tick fires every (FADE_MS / FADE_STEPS) ms.
// ====================================================================
var FADE_STEPS = 20;   // 20 steps → one tick every 75 ms (very smooth)
var FADE_MS    = 1500; // crossfade takes 1.5 s (fits inside the 3 s hold)

var crossfade = function(fromIndex, toIndex, step) {
  if (step > FADE_STEPS) return;
  var weight = step / FADE_STEPS;

  mapLayers.forEach(function(layer, i) {
    if      (i === fromIndex) layer.setOpacity(1.0 - weight);
    else if (i === toIndex)   layer.setOpacity(weight);
    else                      layer.setOpacity(0.0);
  });

  if (step < FADE_STEPS) {
    ui.util.setTimeout(function() {
      crossfade(fromIndex, toIndex, step + 1);
    }, Math.round(FADE_MS / FADE_STEPS));
  }
};

// snap=true  → instant switch (manual button click)
// snap=false → smooth crossfade (auto-play only)
var selectYear = function(index, snap) {
  var from     = currentIndex;
  currentIndex = index;
  activeImage  = DATA[index].image;

  titleLabel.setValue('Statistics (' + DATA[index].year + ')');
  sliderLabel.setValue('Year: ' + DATA[index].year);
  resetInspector();
  updateActiveButton(index);

  if (snap) {
    mapLayers.forEach(function(layer, i) {
      layer.setOpacity(i === index ? 1.0 : 0.0);
    });
  } else {
    crossfade(from, index, 0);
  }
};

// ====================================================================
// 4. TIMELINE CONTROLS
// ====================================================================
var sliderLabel = ui.Label({
  value: 'Year: ' + DATA[0].year,
  style: { margin: '14px 0 0 20px', fontWeight: 'bold', color: '#2c3e50', fontSize: '14px', width: '80px' }
});

var yearButtons = [];

var updateActiveButton = function(activeIdx) {
  yearButtons.forEach(function(btn, i) {
    btn.style().set({
      backgroundColor: '#ffffff00',
      color:           i === activeIdx ? '#ff0000' : '#555555',
      border:          'none',
      fontWeight:      i === activeIdx ? 'bold'    : 'normal'
    });
  });
};

var playButton = ui.Button({
  label: 'Play',
  style: { margin: '11px 15px 0 5px', fontWeight: 'bold' }
});

var playAnimation;

playButton.onClick(function() {
  if (isPlaying) {
    isPlaying = false;
    playButton.setLabel('Play');
    playButton.style().set({ color: 'black' });
  } else {
    // If already at the last year, restart from beginning; otherwise play from current
    if (currentIndex === DATA.length - 1) selectYear(0, true);
    isPlaying = true;
    playButton.setLabel('Pause');
    playButton.style().set({ color: 'red' });
    playAnimation();
  }
});

playAnimation = function() {
  if (!isPlaying) return;
  var next = currentIndex + 1;
  if (next > DATA.length - 1) {
    isPlaying = false;
    playButton.setLabel('Play');
    playButton.style().set({ color: 'black' });
    return;
  }
  // Wait 3s on the current year, then crossfade to next
  ui.util.setTimeout(function() {
    if (!isPlaying) return;
    selectYear(next, false);
    playAnimation();
  }, 3000);
};

var buttonsContainer = ui.Panel({
  widgets: DATA.map(function(item, i) {
    var btn = ui.Button({
      label: item.year,
      onClick: function() {
        if (isPlaying) {
          isPlaying = false;
          playButton.setLabel('Play');
          playButton.style().set({ color: 'black' });
        }
        selectYear(i, true);  // snap instantly on manual click
      },
      style: { margin: '8px 6px', padding: '2px 4px', fontSize: '13px', backgroundColor: '#ffffff00', border: 'none' }
    });
    yearButtons.push(btn);
    return btn;
  }),
  layout: ui.Panel.Layout.flow('horizontal'),
  style: { backgroundColor: '#ffffff00' }
});

updateActiveButton(0);

var timelinePanel = ui.Panel({
  widgets: [
    ui.Label({ value: 'TIMELINE:', style: { fontWeight: 'bold', fontSize: '13px', margin: '18px 10px 0 0' } }),
    playButton,
    buttonsContainer,
    sliderLabel
  ],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: { position: 'bottom-center', padding: '2px 20px 5px 20px', border: '1px solid #ccc', backgroundColor: 'white' }
});
Map.add(timelinePanel);

// ====================================================================
// 5. COLOR LEGEND
// ====================================================================
var legendPanel = ui.Panel({
  style: { position: 'bottom-left', padding: '10px 15px', border: '1px solid #ccc', backgroundColor: 'white' }
});
legendPanel.add(ui.Label({ value: 'Cropping Intensity Legend', style: { fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' } }));
legendPanel.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select('longitude').int(),
  params: { bbox: [0, 0, 100, 1], dimensions: '180x15', format: 'png', min: 0, max: 100, palette: VIS.palette },
  style: { margin: '0 5px' }
}));
legendPanel.add(ui.Panel({
  widgets: [
    ui.Label(String(VIS.min), { fontSize: '11px', fontWeight: 'bold' }),
    ui.Label('',              { stretch: 'horizontal' }),
    ui.Label(String(VIS.max), { fontSize: '11px', fontWeight: 'bold' })
  ],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: { width: '180px', margin: '4px 5px 0 5px' }
}));
legendPanel.add(ui.Label({ value: "Number of rice crops per year", style: { fontSize: '12px', margin: '0 0 8px 0' } }));
Map.add(legendPanel);

// ====================================================================
// 6. MAP CLICK HANDLER
// ====================================================================
Map.onClick(function(coords) {
  valueLabel.setValue('Identifying area & extracting values...');
  valueLabel.style().set({ color: 'black', fontSize: '14px', fontWeight: 'normal', margin: '8px 4px 4px 4px' });

  var clickPoint      = ee.Geometry.Point([coords.lon, coords.lat]);
  var selectedPolygon = table.filterBounds(clickPoint);

  selectedPolygon.geometry().evaluate(function(geom) {
    if (!geom) {
      highlightLayer.setEeObject(ee.Image());
      valueLabel.setValue('Outside data coverage boundaries.');
      valueLabel.style().set({ color: '#c0392b', fontSize: '13px', margin: '8px 4px 4px 4px' });
      return;
    }

    var polyGeometry = ee.Geometry(geom);

    highlightLayer.setEeObject(
      table.filter(ee.Filter.bounds(clickPoint)).style({ color: 'yellow', width: 2.5, fillColor: '00000000' })
    );

    var stats = ee.Dictionary({
      mean:  activeImage.reduceRegion({ reducer: ee.Reducer.mean(),  geometry: polyGeometry, scale: 30, maxPixels: 1e9, tileScale: 4 }).get('b1'),
      pixel: activeImage.reduceRegion({ reducer: ee.Reducer.first(), geometry: clickPoint,   scale: 10, maxPixels: 1e9                }).get('b1')
    });

    stats.evaluate(function(result) {
      if (!result) {
        valueLabel.setValue('Extraction error or empty data.');
        valueLabel.style().set({ color: '#7f8c8d', fontStyle: 'italic', margin: '8px 4px 4px 4px' });
        return;
      }

      var pixelText = (result.pixel !== null && result.pixel !== undefined)
        ? '• Pixel value:   ' + result.pixel.toFixed(2) + ' crop(s)'
        : '• Pixel value:   No data';

      var meanText = (result.mean !== null && result.mean !== undefined)
        ? '• Polygon mean: ' + result.mean.toFixed(2) + ' crop(s)'
        : '• Polygon mean: No data';

      valueLabel.setValue(pixelText + '\n' + meanText);
      valueLabel.style().set({ color: 'black', fontWeight: 'bold', fontSize: '13px', margin: '8px 4px 4px 4px' });
    });
  });
});
