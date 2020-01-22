var palettes = require('users/gena/packages:palettes');
var palette = palettes.colorbrewer.PRGn [11];

// var dataset = ee.ImageCollection('COPERNICUS/S3/OLCI')
//                   .filterDate('2018-04-01', '2018-05-04');
// var dataset = ee.ImageCollection('COPERNICUS/S3/OLCI')
// var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
// var dataset_wind = ee.ImageCollection('NOAA/NWS/RTMA')
//                   .filterBounds(ijssel_precise);
                  
// var windSpeed = dataset_wind.select('WIND');
print(ijssel_precise)


var dataset = ee.ImageCollection('COPERNICUS/S3/OLCI')
                .filterBounds(ijssel_precise)
                // .filterBounds(erie)
                // .mosaic()
                // .filterBounds(erie)
                // .select(['B8','B4','B5','B6', 'B3', 'B2'])
                // .select(['Oa08_radiance', 'Oa06_radiance', 'Oa04_radiance'])
                
                
                  // .filterDate('2017-01-01', '2018-04-05');
// dataset = dataset.filterBounds(ijssel_point)
                  
// Use the start of the collection and now to bound the slider.
var start = ee.Image(dataset.first()).date().get('year').format();
// var start = ee.Date('2016-10-18').format() // hardcoded to work around .first bug(?)
// dataset.mosaic()
var now = Date.now();
var end = ee.Date(now).format();
// var end = ee.Date('2019-7-4');
      
var showMosaic = function(range) {
  ijssel_precise = ijssel_rect
  // var wind_img = windSpeed.filterDate(range.start(), range.end()).first()
  // wind_img = wind_img.clip(ijssel_precise)
  
  var img = dataset.filterDate(range.start(), range.end()).first()
  img = img.clip(ijssel_precise)
  
  var date = ee.Date(img.get('system:time_start'));
  print('Timestamp: ', date); // ee.Date
  // img = img.clip(erie)
  
  var QA = img.select(['quality_flags']);
  var bright_pix = getQABits(QA, 24,27, 'Bright').eq(0);
  // img= img.updateMask(bright_pix)
  
  
  var l709 = img.select('Oa11_radiance')
  var l681 = img.select('Oa10_radiance')
  var l753 = img.select('Oa12_radiance')
  
  var MCI = img.expression(
    'l709 - l681 - (((709-681)/(753-681)) * (l753-l681))', {
      'l709': img.select('Oa11_radiance'),
      'l681': img.select('Oa10_radiance'),
      'l753': img.select('Oa12_radiance')
    });
    
  var MCI_cloud_clip = MCI.updateMask(bright_pix)
  
  var maxReducer = ee.Reducer.max();
  var minReducer = ee.Reducer.min();
  var medianReducer = ee.Reducer.median();
  var meanReducer = ee.Reducer.mean();
  var theMax = MCI_cloud_clip.reduceRegion(maxReducer, ijssel_precise);
  var theMin = MCI_cloud_clip.reduceRegion(minReducer, ijssel_precise);
  var theMedian = MCI_cloud_clip.reduceRegion(medianReducer, ijssel_precise);
  var theMean = MCI_cloud_clip.reduceRegion(minReducer, ijssel_precise);
  
  print({"max ": theMax, 'min ': theMin, 'mean ': theMean, 'median ': theMedian, 'range': range});
  // print(theMin)

  
  // var l709_l681 = l709.subtract(l681)
  // var l753_l681 = l753.subtract(l681)
  
  // var intermed_1 = 1.40277777778
  // var intermed_2 = l753_l681.mulitply([intermed_1])
  // var intermed_2 = intermed_1.multiply(l753_l681)
  // var MCI = l709_l681.subtract(intermed_2)
  
  var rgb = img.select(['Oa08_radiance', 'Oa06_radiance', 'Oa04_radiance'])
              // Convert to radiance units.
              .multiply(ee.Image([0.00876539, 0.0123538, 0.0115198]));

  var visParams = {
    min: 0,
    max: 6,
    gamma: 1.5,
  };
  
  // var visParams_mci = {
  //   min: -1,
  //   max: 1,
  //   palette: 'FFFFFF, CE7E45, DF923D, F1B555, FCD163, 99B718, 74A901, 66A000, 529400,' +
  //   '3E8601, 207401, 056201, 004C00, 023B01, 012E01, 011D01, 011301'
  // };
  var visParams_mci = {
    min: -5,
    max: 5,
    palette: palette
  };
  
  // var windSpeedVis = {
  //   min: 0.0,
  //   max: 12.0,
  //   palette: ['001137', '01abab', 'e7eb05', '620500'],
  // };
  // Map.addLayer(windSpeed, windSpeedVis, 'Wind Speed');

  // rgb = rgb.clip(ijssel_poly)
  // ndvi = ndvi.clip(andijk_bekken_precise)
  // ndvi = ndvi.clip(ijssel_poly)

  // var layer = ui.Map.Layer(rgb, {bands:['B4','B3','B2'], min:0,max:1}, 'rgb');
  // Map.addLayer(ndvi, {min: -1, max: 1}, 'ndvi');
  // Map.addLayer(rgb, visParams, 'RGB');
  // Map.layers().set(0, layer);
  
  // var wind_layer = ui.Map.Layer(wind_img, windSpeedVis, 'wind speed')
  var rgb_layer = ui.Map.Layer(rgb, visParams, 'true_color');
  var mci_layer = ui.Map.Layer(MCI_cloud_clip, visParams_mci, 'MCI');
  var mci_layer_original = ui.Map.Layer(MCI, visParams_mci, 'MCI_original');
  
  Map.layers().set(0, mci_layer_original);
  Map.layers().set(1, rgb_layer);
  Map.layers().set(2, mci_layer);
  // Map.layers().set(3, wind_layer);

  // do exports to tiff of the mci layer if it is not empty
  // console.log(date.toString());
  var formatdate = date.format('dd-MM-YYYY_HH-mm-ss')
  print(formatdate)
  if (mci_layer) {
    console.log("exporting to tiff")
      Export.image.toDrive({
        image: MCI_cloud_clip,
        description: "ijssel_MCI_", //+ date.format('dd-MM-YYYY_HH-mm-ss').toString(),
        fileNamePrefix: "ijssel_MCI", // this is the name actually
        scale: 200,
        region: ijssel_precise,
        fileFormat: 'GeoTIFF',
        formatOptions: {
          cloudOptimized: true
        }
      });
    }
};

var getQABits = function(image, start, end, newName) {
    // Compute the bits we need to extract.
    var pattern = 0;
    for (var i = start; i <= end; i++) {
       pattern += Math.pow(2, i);
    }
    // Return a single band image of the extracted QA bits, giving the band
    // a new name.
    return image.select([0], [newName])
                  .bitwiseAnd(pattern)
                  .rightShift(start);
};


// Asynchronously compute the date range and show the slider.
var dateRange = ee.DateRange(start, end).evaluate(function(range) {
  print(range)
  var dateSlider = ui.DateSlider({
    start: range['dates'][0],
    end: range['dates'][1],
    value: null,
    period: 2,
    onChange: showMosaic
  });
  Map.add(dateSlider.setValue(now));
});


// var slider = ui.Slider();
// slider.onSlide(function(value) {
//   var int_value = value * (Map.layers().length() - 1) >> 0;
//   Map.layers().get(int_value).setOpacity(1);
//   for (var i = int_value + 1; i < Map.layers().length(); i++) {
//     Map.layers().get(i).setOpacity(0);
// }
// });
// print(slider);
// dataset = dataset.filterBounds(ijssel_point)

// Select bands for visualization and apply band-specific scale factors.
// var rgb = dataset.select(['Oa08_radiance', 'Oa06_radiance', 'Oa04_radiance'])
//               .median()
//               // Convert to radiance units.
//               .multiply(ee.Image([0.00876539, 0.0123538, 0.0115198]));

// var dataset = dataset.select(['B4', 'B5', 'B6', 'B8']).sort('CLOUD_COVERAGE_ASSESSMENT').();
// function addImage(image) { // display each image in collection
//   // var id = image.id
//   // var image = ee.Image(image)
//   var ndvi = image.normalizedDifference(['B8','B4'])
//   Map.addLayer(ndvi)
// }

// dataset.evaluate(function(dataset) {  // use map on client-side
//   dataset.features.map(addImage)
// })

// var ndvi = dataset.().normalizedDifference(['B8','B4'])

// var rededge2 = dataset.select(['B6'])
// var rededge1 = dataset.select(['B5'])
// var red = dataset.select(['B4'])

// var inter = rededge1.subtract(red)
// var chl_a = rededge2.divide(inter)

// var ndvi = dataset.select(['B6'])
//               .median()
//               // .mean()
//               // Convert to radiance units.
//               .multiply(ee.Image([0.0001]));
              

// var rad_05 = dataset.select(['B6'])
//               .median()
//               // .mean()
//               // Convert to radiance units.
//               .multiply(ee.Image([0.0001]));

// var visParams = {
//   min: 0,
//   max: 6,
//   gamma: 1.5,
// };

Map.setCenter(5.295, 52.479, 10); // nederland
// print(andijk_point)
// Map.setCenter(5.25, 52.75, 16); // andijk
// Map.addLayer(rad_05, visParams, 'rad_05');
// Map.addLayer(rgb, visParams, 'RGB');

// var chl_a = chl_a.map(function(img) {return img.clip(ijssel_poly)})

// ndvi = ndvi.clip(ijssel_poly)

// ndvi = ndvi.clip(andijk_bekken)

// ndvi = ndvi.clip(andijk_bekken_precise)

// Map.addLayer(ndvi, {min: -1, max: 1}, 'ndvi');