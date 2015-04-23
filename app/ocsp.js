// 2015 Jon Suderman
// Padlock Certificate Authority & OCSP Responder
// https://github.com/suderman/padlock

// ----------------------
// OCSP Responder
// ----------------------

var path = require('path'),
    fs = require('fs'),
    crypto = require('crypto');

var ca  = fs.realpathSync(path.join(__dirname, '../ca')),
    bin = fs.realpathSync(path.join(__dirname, '../bin')),
    pub = fs.realpathSync(path.join(__dirname, '../public'));

var express = require('express');
var app = express(),
    server = require('http').createServer(app);

// Needed for req.rawBody
app.configure(function() {
  app.set('views', __dirname);
  app.use(function(req, res, next) {
    var data = new Buffer('');
    req.on('data', function(chunk) {
        data = Buffer.concat([data, chunk]);
    });
    req.on('end', function() {
      req.rawBody = data;
      next();
    });
  });
});

// Custom config & methods
var ocsp = {

  // Actual b64 or filename (check for hyphen)
  filename: function(b64, cached=false) {
    var filename = (b64.indexOf('-')<0) ? crypto.createHash('md5').update(b64).digest('hex') : b64;
    var suffix = (cached) ? 'cached' : Date.now();
    return `${filename}-${suffix}`;
  },

  requestPath: function(filename) {
    return `${ca}/ocsp/requests/${filename}`;
  },

  responsePath: function(filename) {
    return `${ca}/ocsp/responses/${filename}`;
  },

  minutesValid: 5
};


// Refresh OCSP responses (preload cache) before they expire
ocsp.refresh = function() {

  // Loop through all cached requests
  exec(`ls ${ca}/ocsp/requests/`, { silent: true }).output.split("\n").forEach(function(filename) {

    var cached = ocsp.filename(filename, true);

    // Ensure it actually exists
    if (test('-f', ocsp.requestPath(cached))) {

      // Generate an updated response
      exec(`${bin}/ocsp "${cached}"`);

    }
  });
}

// Verify this certificate
ocsp.verify = function(b64, res) {

  // Get filename from b64
  var filename = ocsp.filename(b64);

  // Write decoded b64 string to request file
  fs.writeFileSync(ocsp.requestPath(filename), new Buffer(b64, 'base64'));

  // Generate a new response to a temporary file
  exec(`${bin}/ocsp "${filename}"`);

  // Send the response
  var responsePath = ocsp.responsePath(filename);
  if (test('-f', responsePath)) {

    // Set the headers
    res.setHeader('Content-type', 'application/ocsp-response');
    res.setHeader('Content-length', fs.readFileSync(responsePath, 'binary').length);

    // Send the response file to the client, then delete it from disk
    res.sendfile(responsePath, function(err){ fs.unlink(responsePath) });

  // If it was a malformed request...
  } else {

    // Let the client know
    res.setHeader('Content-type', 'application/ocsp-response');
    res.setHeader('Content-length', fs.readFileSync(`${pub}/malformedRequest`, 'binary').length);
    res.sendfile(`${pub}/malformedRequest`);
  }
}

// Verify request on POST
app.post('/', function(req, res) {
  console.log('OCSP POST')
  var b64 = new Buffer(req.rawBody).toString('base64');
  ocsp.serve(b64, res);
});

// Verify request on GET
app.get('/*', function(req, res) {
  console.log('OCSP GET')
  var b64 = unescape(req.params[0]);
  if (b64.charAt(0) == "/") b64 = b64.substr(1); // Just in case there's a leading slash
  ocsp.serve(b64, res);
});

// Attempt to serve a cached response, or initiate a fresh response if none exists
ocsp.serve = function(b64, res) {

  // Get path from b64
  var responsePath = ocsp.responsePath(ocsp.filename(b64, true))

  // Send the response
  if (test('-f', responsePath)) {
    console.log('Cached response');

    // Set the headers
    res.setHeader('Content-type', 'application/ocsp-response');
    res.setHeader('Content-length', fs.readFileSync(responsePath, 'binary').length);

    // Send the response file to the client
    res.sendfile(responsePath);

  // If it's not in the cache, verify the request right now!
  } else {
    console.log('Fresh response');
    ocsp.verify(b64, res);
  }
}

// OCSP port
app.listen(process.env.OCSP_PORT);
console.log('OCSP listening on port ' + process.env.OCSP_PORT);

// Refresh OCSP responses (preload cache) before they expire
setInterval(function() {
  console.log("OCSP refreshing responses every " + (ocsp.minutesValid - 0.5) + " minutes");
  ocsp.refresh();
}, (ocsp.minutesValid - 0.5) * 60 * 1000);

// Clean cache
exec(`rm -rf ${ocsp.responsePath('*')}`);
exec(`rm -rf ${ocsp.requestPath('*')}`);
