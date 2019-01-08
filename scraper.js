/*--------------------------------------------------------------------
-- Yellowstone National Park released a sample library! --------------
-- Very exciting news, except that each sample resides on it's -------
-- own webpage, and there's no way to download them all as a batch. --
-- So here's a scraper that will do it for you! ----------------------
-- This scraper collects links from the main page, visits each one ---
-- and comes back with a url for each sample. Then another scraper ---
-- takes these urls, downloads each sample, and saves it to the ------
-- mp3s directory, and voila. All the samples in one place. Ahhh -----
----------------------------------------------------------------------*/


const Crawler = require('crawler');
const fs = require('fs');

// New Crawler. Default callback looks for AUDIO tags, and extracts src attribute
// Src attributes are formatted as a URL and pushed into mp3Urls array
const c = new Crawler({
  maxConnections: 1000,
  sampleUrls: [],
  callback: (error, response, done) => {
    if(error) {
      console.log(error);
    } else {
      const $ = response.$;
      const srcs = [];
      $('AUDIO SOURCE').each( (index, file) => srcs.push("https://www.nps.gov" + $(file).attr('src')));
      response.options.sampleUrls.push(...srcs);
      done();
    }
  }
});

// Scrape the main page, looking for all links that lead to audio samples
const pageUrls = new Promise((resolve, reject) => {
  c.direct({
    uri: "https://www.nps.gov/yell/learn/photosmultimedia/soundlibrary.htm",
    callback: (error, response) => {
      if(error) {
        console.log(error);
      } else {
        const $ = response.$;
        const links = $('A[href*="/yell/learn/photosmultimedia/sounds-"]').toArray();
        const urls = links.map( link => "https://www.nps.gov" + link.attribs.href);
        resolve(urls);
      }
    }
  });
});

// queue the page URLs. Crawler scrapes each page for Audio tags,
// saving the src attributes in c.options.mp3Urls
pageUrls.then( urls => {
  c.queue(urls);
});

// New Crawler. Takes a URL for each sample (in an array),
// Downloads and saves each sample to the mp3s directory
const mp3 = new Crawler({
  maxConnections: 1000,
  encoding:null,
  jQuery: false,
  callback: (error, response, done) => {
    if(error) {
      console.log(error);
    } else {
      // Format filename from uri
      const uri = response.options.uri;
      let filename = uri.slice(uri.indexOf('-') + 1);
      filename = filename.replace(/^(YELL|\d*)/i, '');
      // Save to directory mp3s
      const stream = fs.createWriteStream(`mp3s/${filename}`);
      stream.write(response.body);
      stream.end();
    }
  }
});

// When all audio pages have been processed
// Download each sample using its URL.
c.on('drain', () => mp3.queue(c.options.sampleUrls));
