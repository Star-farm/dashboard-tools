// ====================================================================

// DATA DECLARATION

// Ensure 'table' and image variables (image, image2, ...) are

// imported or defined before this code block.

// ====================================================================



// ====================================================================

// 0. MAP INITIALIZATION & BASE LAYERS

// ====================================================================

Map.setOptions('HYBRID');

Map.setControlVisibility({

  all: false,

  zoomControl: true,

  fullscreenControl: true,

  layerList: false

});



var highlightLayer = ui.Map.Layer(ee.Image(), {}, 'Selected Polygon');



// ====================================================================

// 1. MODE CONFIGURATION

// ====================================================================

var MODES = {

  'Cropping Intensity': {

    legendTitle: 'Cropping Intensity',

    legendSub:   'Number of rice crops per year',

    unit:        'crop(s)',

    vis: { bands: ['b1'], min: 0.0, max: 3.7, palette: ['blue', 'green', 'yellow', 'red'] },

    data: [

      { year: '2018', image: image.clip(table)  },

      { year: '2019', image: image2.clip(table) },

      { year: '2020', image: image3.clip(table) },

      { year: '2021', image: image4.clip(table) },

      { year: '2022', image: image5.clip(table) },

      { year: '2023', image: image6.clip(table) },

      { year: '2024', image: image7.clip(table) }

    ]

  },

  'Flooding Duration': {

    legendTitle: 'Flooding Duration',

    legendSub:   'Flooding duration per year',

    unit:        'day(s)',

    vis: { bands: ['b1'], min: 0.0, max: 24.0,

      palette: ['ffffff', 'cce5ff', '99ccff', '6666ff', '9933cc', '800080', 'cc0033', 'ff0000'] },

    data: [

      { year: '2015', image: image8.clip(table)  },

      { year: '2016', image: image9.clip(table)  },

      { year: '2017', image: image10.clip(table) },

      { year: '2018', image: image11.clip(table) },

      { year: '2019', image: image12.clip(table) },

      { year: '2020', image: image13.clip(table) }

    ]

  },

  'Sowing Date': {

    legendTitle: 'Sowing Date',

    legendSub:   'Days since the last sowing event',

    unit:        'day(s)',

    vis: { bands: ['b1'], min: 18.2, max: 254.0, palette: ['fef200', 'ff7f50', 'e0115f', '8a2be2'] },

    data: [

      { year: '2018', image: image14.clip(table) },

      { year: '2019', image: image15.clip(table) },

      { year: '2020', image: image16.clip(table) },

      { year: '2021', image: image17.clip(table) },

      { year: '2022', image: image18.clip(table) },

      { year: '2023', image: image19.clip(table) },

      { year: '2024', image: image20.clip(table) },

      { year: '2025', image: image21.clip(table) }

    ]

  }

};



// ====================================================================

// 2. APPLICATION STATE

// ====================================================================

var state = {

  mode:        'Cropping Intensity',

  index:       0,

  activeImage: null,

  isPlaying:   false,

  allLayers:   {},  // Pre-built layers keyed by mode name: { modeName: [layer, ...] }

  yearButtons: []

};



// ====================================================================

// 3. INSPECTOR PANEL

// ====================================================================

var inspectorPanel = ui.Panel({

  style: { position: 'top-right', padding: '12px 18px', width: '320px', border: '1px solid #ccc' }

});

var titleLabel = ui.Label({

  style: { fontWeight: 'bold', fontSize: '14px', margin: '4px 4px 8px 4px', color: 'black' }

});

var valueLabel = ui.Label({

  style: { color: '#7f8c8d', fontSize: '14px', margin: '8px 4px 4px 4px', whiteSpace: 'pre' }

});

inspectorPanel.add(titleLabel);

inspectorPanel.add(valueLabel);

Map.add(inspectorPanel);

Map.style().set('cursor', 'crosshair');



var resetInspector = function() {

  var cfg = MODES[state.mode];

  titleLabel.setValue('Statistics (' + cfg.data[state.index].year + ')');

  valueLabel.setValue(cfg.legendTitle + ':\nClick inside a polygon to calculate.');

  valueLabel.style().set({

    color: '#7f8c8d', fontSize: '14px', fontWeight: 'normal',

    fontStyle: 'normal', margin: '8px 4px 4px 4px'

  });

  highlightLayer.setEeObject(ee.Image());

};



// ====================================================================

// 4. LEGEND PANEL

// ====================================================================

var legendPanel = ui.Panel({

  style: { position: 'top-left', padding: '10px 15px', border: '1px solid #ccc', backgroundColor: 'white' }

});

var legendTitleLabel = ui.Label({

  style: { fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }

});

var legendSubLabel = ui.Label({

  style: { fontSize: '12px', margin: '0 0 8px 0', textAlign: 'center', stretch: 'horizontal' }

});

var minLabel = ui.Label('', { fontSize: '11px', fontWeight: 'bold' });

var midLabel = ui.Label('', { fontSize: '11px', fontWeight: 'bold' });

var maxLabel = ui.Label('', { fontSize: '11px', fontWeight: 'bold' });

var legendThumbnail = ui.Thumbnail({

  image: ee.Image.pixelLonLat().select('longitude').int(),

  style: { margin: '0 5px' }

});

var legendTicksPanel = ui.Panel({

  widgets: [

    minLabel,

    ui.Label('', { stretch: 'horizontal' }),

    midLabel,

    ui.Label('', { stretch: 'horizontal' }),

    maxLabel

  ],

  layout: ui.Panel.Layout.flow('horizontal'),

  style:  { width: '180px', margin: '4px 5px 0 5px' }

});

legendPanel.add(legendTitleLabel);

legendPanel.add(legendThumbnail);

legendPanel.add(legendTicksPanel);

legendPanel.add(legendSubLabel);

Map.add(legendPanel);



var updateLegend = function() {

  var cfg = MODES[state.mode];

  legendTitleLabel.setValue(cfg.legendTitle);

  legendSubLabel.setValue(cfg.legendSub);

  minLabel.setValue(cfg.vis.min.toFixed(1));

  maxLabel.setValue(cfg.vis.max.toFixed(1));

  midLabel.setValue(((cfg.vis.min + cfg.vis.max) / 2).toFixed(1));

  legendThumbnail.setParams({

    bbox: [0, 0, 100, 1], dimensions: '180x15', format: 'png',

    min: 0, max: 100, palette: cfg.vis.palette

  });

};



// ====================================================================

// 5. TIMELINE CONTROLS

// ====================================================================

var sliderLabel = ui.Label({

  style: { margin: '14px 0 0 20px', fontWeight: 'bold', color: '#2c3e50', fontSize: '14px', width: '80px' }

});

var playButton = ui.Button({

  label: 'Play',

  style: { margin: '11px 15px 0 5px', fontWeight: 'bold' }

});

var buttonsContainer = ui.Panel({

  layout: ui.Panel.Layout.flow('horizontal'),

  style:  { backgroundColor: '#ffffff00' }

});

var timelinePanel = ui.Panel({

  widgets: [

    ui.Label({ value: 'TIMELINE:', style: { fontWeight: 'bold', fontSize: '13px', margin: '18px 10px 0 0' } }),

    playButton, buttonsContainer, sliderLabel

  ],

  layout: ui.Panel.Layout.flow('horizontal'),

  style:  { position: 'bottom-center', padding: '2px 20px 5px 20px',

    border: '1px solid #ccc', backgroundColor: 'white' }

});

Map.add(timelinePanel);



var updateActiveButton = function(activeIdx) {

  state.yearButtons.forEach(function(btn, i) {

    btn.style().set({

      backgroundColor: '#ffffff00',

      color:      i === activeIdx ? '#ff0000' : '#555555',

      border:     'none',

      fontWeight: i === activeIdx ? 'bold'    : 'normal'

    });

  });

};



// ====================================================================

// 6. CROSSFADE TRANSITION

// ====================================================================

var FADE_STEPS = 20;

var FADE_MS    = 1500;



var crossfade = function(fromIdx, toIdx, step) {

  if (step > FADE_STEPS) return;

  var weight = step / FADE_STEPS;

  // Use pre-built layer references for the current mode

  var layers = state.allLayers[state.mode];

  layers.forEach(function(layer, i) {

    layer.setOpacity(i === fromIdx ? 1.0 - weight : i === toIdx ? weight : 0.0);

  });

  if (step < FADE_STEPS) {

    ui.util.setTimeout(function() { crossfade(fromIdx, toIdx, step + 1); },

        Math.round(FADE_MS / FADE_STEPS));

  }

};



// ====================================================================

// 7. YEAR SELECTION & ANIMATION

// ====================================================================

var selectYear = function(index, snap) {

  var cfg  = MODES[state.mode];

  var from = state.index;

  state.index       = index;

  state.activeImage = cfg.data[index].image;



  sliderLabel.setValue('Year: ' + cfg.data[index].year);

  resetInspector();

  updateActiveButton(index);



  // Reference pre-built layers — no Map.layers() manipulation needed

  var layers = state.allLayers[state.mode];

  if (snap) {

    layers.forEach(function(layer, i) { layer.setOpacity(i === index ? 1.0 : 0.0); });

  } else {

    crossfade(from, index, 0);

  }

};



var playAnimation = function() {

  var cfg  = MODES[state.mode];

  var next = state.index + 1;

  if (!state.isPlaying || next > cfg.data.length - 1) {

    state.isPlaying = false;

    playButton.setLabel('Play').style().set({ color: 'black' });

    return;

  }

  ui.util.setTimeout(function() {

    if (!state.isPlaying) return;

    selectYear(next, false);

    playAnimation();

  }, 3000);

};



playButton.onClick(function() {

  var cfg = MODES[state.mode];

  if (state.isPlaying) {

    state.isPlaying = false;

    playButton.setLabel('Play').style().set({ color: 'black' });

  } else {

    if (state.index === cfg.data.length - 1) selectYear(0, true);

    state.isPlaying = true;

    playButton.setLabel('Pause').style().set({ color: 'red' });

    playAnimation();

  }

});



// ====================================================================

// 8. MODE SWITCHER

// ====================================================================

var updateTimelineWidgets = function() {

  var cfg = MODES[state.mode];

  buttonsContainer.clear();

  state.yearButtons = [];

  cfg.data.forEach(function(item, i) {

    var btn = ui.Button({

      label:   item.year,

      onClick: function() {

        if (state.isPlaying) {

          state.isPlaying = false;

          playButton.setLabel('Play').style().set({ color: 'black' });

        }

        selectYear(i, true);

      },

      style: { margin: '8px 6px', padding: '2px 4px', fontSize: '13px',

        backgroundColor: '#ffffff00', border: 'none' }

    });

    state.yearButtons.push(btn);

    buttonsContainer.add(btn);

  });

};



var switchMode = function(modeName) {

  if (state.isPlaying) {

    state.isPlaying = false;

    playButton.setLabel('Play').style().set({ color: 'black' });

  }



  // Hide all layers from the current mode before switching

  state.allLayers[state.mode].forEach(function(layer) {

    layer.setOpacity(0.0);

  });



  state.mode = modeName;

  updateTimelineWidgets();

  updateLegend();

  selectYear(0, true);  // selectYear will reveal the correct layer via setOpacity

};



var modeDropdown = ui.Select({

  items:    Object.keys(MODES),

  value:    state.mode,

  onChange: switchMode,

  style:    { position: 'top-center', padding: '2px', width: '180px' }

});

Map.add(modeDropdown);



// ====================================================================

// 9. MAP CLICK HANDLER (debounced to prevent stacked server requests)

// ====================================================================

var clickTimer = null;



Map.onClick(function(coords) {

  // Cancel any pending click that hasn't fired yet

  if (clickTimer !== null) {

    ui.util.clearTimeout(clickTimer);

    clickTimer = null;

  }



  // Show immediate feedback while debounce window is open

  valueLabel.setValue('Identifying area & extracting values...');

  valueLabel.style().set({ color: 'black', fontSize: '14px', fontWeight: 'normal', margin: '8px 4px 4px 4px' });



  clickTimer = ui.util.setTimeout(function() {

    clickTimer = null;

    var cfg        = MODES[state.mode];

    var clickPoint = ee.Geometry.Point([coords.lon, coords.lat]);



    table.filterBounds(clickPoint).geometry().evaluate(function(geom) {

      if (!geom) {

        highlightLayer.setEeObject(ee.Image());

        valueLabel.setValue('Click is outside data coverage boundaries.');

        valueLabel.style().set({ color: '#c0392b', fontSize: '13px', margin: '8px 4px 4px 4px' });

        return;

      }



      var polyGeom = ee.Geometry(geom);

      highlightLayer.setEeObject(

          table.filter(ee.Filter.bounds(clickPoint))

              .style({ color: 'Black', width: 5, fillColor: '00000000' })

      );



      ee.Dictionary({

        mean:  state.activeImage.reduceRegion({

          reducer: ee.Reducer.mean(),  geometry: polyGeom,   scale: 30,

          maxPixels: 1e9, tileScale: 4 }).get('b1'),

        pixel: state.activeImage.reduceRegion({

          reducer: ee.Reducer.first(), geometry: clickPoint, scale: 10,

          maxPixels: 1e9 }).get('b1')

      }).evaluate(function(result) {

        if (!result) {

          valueLabel.setValue('Extraction error or empty data.');

          valueLabel.style().set({ color: '#7f8c8d', fontStyle: 'italic', margin: '8px 4px 4px 4px' });

          return;

        }

        var pixelText = (result.pixel !== null)

            ? '• Pixel value:   ' + result.pixel.toFixed(2) + ' ' + cfg.unit

            : '• Pixel value:   No data';

        var meanText = (result.mean !== null)

            ? '• Polygon mean: ' + result.mean.toFixed(2) + ' ' + cfg.unit

            : '• Polygon mean: No data';

        valueLabel.setValue(pixelText + '\n' + meanText);

        valueLabel.style().set({ color: 'black', fontWeight: 'bold', fontSize: '13px', margin: '8px 4px 4px 4px' });

      });

    });

  }, 300);  // 300ms debounce window

});



// ====================================================================

// INITIALIZE

// Pre-add ALL layers for ALL modes once at startup (opacity = 0).

// switchMode and selectYear control visibility via setOpacity only —

// Map.layers().reset() is never called after this point.

// ====================================================================



// Fixed base layers added once

Map.addLayer(

    table.style({ color: '#ffffff00', width: 0, fillColor: '00000000' }),

    {}, 'Polygon Boundaries'

);

Map.layers().add(highlightLayer);



// Pre-build and add every layer for every mode

Object.keys(MODES).forEach(function(modeName) {

  var cfg = MODES[modeName];

  var layers = cfg.data.map(function(item) {

    var layer = ui.Map.Layer(item.image, cfg.vis, modeName + ' ' + item.year, true);

    layer.setOpacity(0.0);

    Map.layers().add(layer);

    return layer;

  });

  state.allLayers[modeName] = layers;

});



// Set initial active image then kick off the UI

state.activeImage = MODES[state.mode].data[0].image;

updateTimelineWidgets();

updateLegend();



// Reveal only the first year of the default mode

state.allLayers[state.mode][0].setOpacity(1.0);

sliderLabel.setValue('Year: ' + MODES[state.mode].data[0].year);

resetInspector();

updateActiveButton(0);



Map.centerObject(table, 10);