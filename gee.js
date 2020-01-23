var palettes = require('users/gena/packages:palettes');
var palette = palettes.colorbrewer.PRGn [11];

var dataset = ee.ImageCollection('COPERNICUS/S3/OLCI')
                .filterBounds(ijssel_rect)
                .filterDate("2018-06-01", "2018-07-01");

// Use the start of the collection and now to bound the slider.
// var start = ee.Image(dataset.first()).date().get('year').format();

// var now = Date.now();
// var end = ee.Date(now).format();

var get_MCI_clipped = function(img) {
  // var img = dataset.filterDate(range.start(), range.end()).first()
  // img = img.clip(ijssel_precise)
  
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
  
  img = img.clip(ijssel_rect);
  // var date = ee.Date(img.get('system:time_start'));
  // var date_string = date.format('dd-MM-YYYY_HH-mm-ss');
  
  // get bright pixels
  var QA = img.select(['quality_flags']);
  var bright_pix = getQABits(QA, 24,27, 'Bright').eq(0);
  
  // calculate MCI
  var l709 = img.select('Oa11_radiance');
  var l681 = img.select('Oa10_radiance');
  var l753 = img.select('Oa12_radiance');
  
  var MCI = img.expression(
    'l709 - l681 - (((709-681)/(753-681)) * (l753-l681))', {
      'l709': img.select('Oa11_radiance'),
      'l681': img.select('Oa10_radiance'),
      'l753': img.select('Oa12_radiance')
  });
  
  var MCI_cloud_clip = MCI.updateMask(bright_pix);
  
  MCI_cloud_clip = MCI_cloud_clip.copyProperties({source: img})
  
  return MCI_cloud_clip
  // return None
};

var get_RGB = function(img) {
  // var img = dataset.filterDate(range.start(), range.end()).first()
  // img = img.clip(ijssel_precise)
  
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
  
  img = img.clip(ijssel_rect);
  
  // get bright pixels
  var QA = img.select(['quality_flags']);
  var bright_pix = getQABits(QA, 24,27, 'Bright').eq(0);
  
  // Convert to radiance units.
  var rgb = img.select(['Oa08_radiance', 'Oa06_radiance', 'Oa04_radiance'])
    .multiply(ee.Image([0.00876539, 0.0123538, 0.0115198]));
  
  // var RGB_cloud_clip = rgb.updateMask(bright_pix);
  rgb = rgb.copyProperties({source: img})
  return rgb
};


var RGB = dataset.map(get_RGB);
var MCI_clipped = dataset.map(get_MCI_clipped);

dates = dataset.aggregate_array("system:time_start")

var dates = dataset
  .map(function(image){
    return ee.Feature(null, {"date": image.date().format('YYYY-MM-dd')})
  })
  .aggregate_array('date')
  
var datelist = ee.List(dates)
var len_images = datelist.length()
print("total images found")

// Export MCI_clipped
var list=MCI_clipped.toList(40)
for (var i=0;i<40;i++){
  // var date = image.date().format('yyyy-MM-dd')
  try {
    var image=ee.Image(list.get(i));
    var date = datelist.get(i).getInfo()

    var name = 'MCI_'+i.toString() + '_' + date;
    print(name);
    // Export MCI        
    Export.image.toDrive({
        image: image,
        description: name, //+ date.format('dd-MM-YYYY_HH-mm-ss').toString(),
        fileNamePrefix: name, // this is the name actually
        scale: 300,
        region: ijssel_rect,
        // region: ijssel_rect,
        fileFormat: 'GeoTIFF',
        folder: 'geo_exports',
        formatOptions: {
          cloudOptimized: true
        }
    });
  } catch(error) {
    print('something went wrong in ' + i.toString())
  }
}

// Export RGB
var list=RGB.toList(40)
for (var i=0;i<40;i++){
  try {
    var image=ee.Image(list.get(i));
    var date = datelist.get(i).getInfo()

    var name = 'RGB_' + i.toString() + '_' + date;
    print(name);
    // Export MCI        
    Export.image.toDrive({
        image: image,
        description: name, //+ date.format('dd-MM-YYYY_HH-mm-ss').toString(),
        fileNamePrefix: name, // this is the name actually
        scale: 300,
        region: ijssel_rect,
        // region: ijssel_rect,
        fileFormat: 'GeoTIFF',
        folder: 'geo_exports',
        formatOptions: {
          cloudOptimized: true
        }
    });
  } catch(error) {
    print('something went wrong in ' + i.toString())
  }
}