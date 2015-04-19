// 2015 Jon Suderman
// Padlock Certificate Authority & OCSP Responder
// https://github.com/suderman/padlock
// 
// Certificate Authority API
// Port 11443
// GET to build/request certificates
// POST to revoke/delete certificates
//
// OCSP responder
// Port 11188
// GET or POST OCSP queries

// Load environment variables
require('dotenv').load();

require('shelljs/global');
var express = require('express'),
    ocsp = express(),
    ocsp_server = require('http').createServer(ocsp);

exec("bin/init", { encoding: 'utf8' });

// ----------------------
// Private App
// ----------------------
var app = express(),
    server = require('http').createServer(app);

// Where to find views
app.configure(function() {
  app.set('views', __dirname);
});

// Send the root certificate
app.get('/ca.crt', function(req, res) {
  res.sendfile('/config/ca/ca.crt');
});

// Send the certificate revocation list
app.get('/ca.crl', function(req, res) {
  res.sendfile('/config/crl/ca.crl');
});

// Send the certificate revocation list (pem)
app.get('/ca.crl.pem', function(req, res) {
  res.sendfile('/config/crl/ca.crl.pem');
});

// Send revoked certificates on GET
app.get('/revoked/:filename\.:filetype(crt|key|p12|pem|pub|zip)', function(req, res) {
  var path = '/config/revoked/' + req.params.filename + '/' + req.params.filename + '.' + req.params.filetype;

  // Send the requested file
  if (test('-f', path)) {
    res.sendfile(path);
  }
});

// Sign/present certificates on GET
app.get('/:filename\.:filetype(crt|key|p12|pem|pub|zip)', function(req, res) {
  var path = '/config/certs/' + req.params.filename + '/' + req.params.filename + '.' + req.params.filetype;

  // Build the requested file if it doesn't exist
  if (!test('-f', path)) {
    exec("/certify.sh '" + req.params.filename + "'", { encoding: 'utf8' });
  }

  // Send the requested file
  res.sendfile(path);
});

// Revoke certicates on POST
app.post('/:filename\.:filetype(crt|key|p12|pem|pub|zip)', function(req, res) {
  var path = '/config/certs/' + req.params.filename + '/' + req.params.filename + '.' + req.params.filetype;

  // Revoke the certificate if it exists
  if (test('-f', path)) {
    exec("/revoke.sh '" + req.params.filename + "'", { encoding: 'utf8' });
    res.send(200, req.params.filename + ' is now revoked');
  } else {
    res.send(200, req.params.filename + " doesn't exist");
  }
});

// Show index page
app.get(/\/*/, function(req, res) {
  var certs = exec('ls /config/certs', { encoding: 'utf8', silent:true }).output.split("\n");
  var revoked = exec('ls /config/revoked', { encoding: 'utf8', silent:true }).output.split("\n");
  var ca_name = (test('-f', '/config/env/CA_NAME')) ? exec('cat /config/env/CA_NAME', { encoding: 'utf8', silent:true }).output.replace(/[\n\r]/g,'') : "Certificate Authority";
  var domain = (test('-f', '/config/env/DOMAIN')) ? exec('cat /config/env/DOMAIN', { encoding: 'utf8', silent:true }).output.replace(/[\n\r]/g,'') : "localhost";
  res.render('index.ejs', { private: true, certs: certs, revoked: revoked, ca_name: ca_name, ca_email: 'ca@' + domain, domain: domain });
});

// Private port
port = 11443;
app.listen(port);
console.log('Listening on port ' + port);



// ----------------------
//  Public App
// ----------------------
var public_app = express(),
    public_server = require('http').createServer(public_app);

// Where to find views
public_app.configure(function() {
  public_app.set('views', __dirname);
});

// Send the root certificate
public_app.get('/ca.crt', function(req, res) {
  res.sendfile('/config/ca/ca.crt');
});

// Send the certificate revocation list
public_app.get('/ca.crl', function(req, res) {
  res.sendfile('/config/crl/ca.crl');
});

// Send the certificate revocation list (pem)
public_app.get('/ca.crl.pem', function(req, res) {
  res.sendfile('/config/crl/ca.crl.pem');
});

// Show index page
public_app.get(/\/*/, function(req, res) {
  var ca_name = (test('-f', '/config/env/CA_NAME')) ? exec('cat /config/env/CA_NAME', { encoding: 'utf8', silent:true }).output.replace(/[\n\r]/g,'') : "Certificate Authority";
  var domain = (test('-f', '/config/env/DOMAIN')) ? exec('cat /config/env/DOMAIN', { encoding: 'utf8', silent:true }).output.replace(/[\n\r]/g,'') : "localhost";
  res.render('index.ejs', { private: false, certs: [], revoked: [], ca_name: ca_name, ca_email: 'ca@' + domain, domain: domain });
});

// Public port
port = 11180;
public_app.listen(port);
console.log('Listening on port ' + port);


// ----------------------
// OCSP Responder
// ----------------------
var ocsp = express(),
    ocsp_server = require('http').createServer(ocsp),
    fs = require('fs'),
    crypto = require('crypto');

// Custom config & methods
ocsp.ca = {};
ocsp.ca.minutes_valid = 5;
ocsp.ca.requests_dir  = '/config/ocsp/requests/';
ocsp.ca.responses_dir = '/config/ocsp/responses/';

// Needed for req.rawBody
ocsp.configure(function() {
  ocsp.set('views', __dirname);
  ocsp.use(function(req, res, next) {
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

ocsp.ca.request = function(b64, suffix) {
  return ocsp.ca.requests_dir + crypto.createHash('md5').update(b64).digest('hex') + suffix;
}
ocsp.ca.response = function(b64, suffix) {
  return ocsp.ca.responses_dir + crypto.createHash('md5').update(b64).digest('hex') + suffix;
}

ocsp.ca.generate = function(req, resp) {
  var command = [
    'openssl ocsp',
    '-index   /config/db/index',
    '-CA      /config/ca/ca.crt',
    '-CAfile  /config/ca/ca.crt',
    '-issuer  /config/ca/ca.crt', 
    '-rsigner /config/ocsp/ocsp.crt', 
    '-rkey    /config/ocsp/ocsp.key', 
    '-nmin ' + ocsp.ca.minutes_valid, 
    '-reqin   "' + req + '"',
    '-respout "' + resp + '"'
  ].join(' ');
  return exec(command).output;
}

// Refresh OCSP responses (preload cache) before they expire
ocsp.ca.refresh = function() {

  // Loop through all cached requests
  exec('ls ' + ocsp.ca.requests_dir, { silent: true }).output.split("\n").forEach(function(filename) {
    var cached_req = ocsp.ca.requests_dir + filename,
        temp_resp = ocsp.ca.responses_dir + filename + Date.now(),
        cached_resp = ocsp.ca.responses_dir + filename;

    // Ensure it actually exists
    if (test('-f', cached_req)) {

      // Generate an updated response
      ocsp.ca.generate(cached_req, temp_resp);

      // If the response was successful, put it in the cache; otherwise delete the cached request
      if (test('-f', temp_resp)) {
        fs.rename(temp_resp, cached_resp);
      } else {
        fs.unlink(cached_req);
      }
    }
  });
}

// Verify this certificate
ocsp.ca.verify = function(b64, res) {

  // Get paths from b64
  var temp_req = ocsp.ca.request(b64, Date.now()),
      cached_req = ocsp.ca.request(b64, ''),
      temp_resp = ocsp.ca.response(b64, Date.now()),
      cached_resp = ocsp.ca.response(b64, '');

  // Decode b64 string to request file
  fs.writeFileSync(temp_req, new Buffer(b64, 'base64'));

  // Determine if this request is cachable (doesn't contain nonce)
  var cache = (exec('openssl ocsp -req_text -reqin "' + temp_req + '" | grep "OCSP Nonce"').output == "") ? true : false; 

  // Generate a new response to a temporary file
  ocsp.ca.generate(temp_req, temp_resp);

  // If this is a cacheable request, rename the file somewhere it'll be saved; otherwise delete it
  if (cache) { 
    fs.rename(temp_req, cached_req);
  } else {
    fs.unlink(temp_req); 
  }

  // Send the response
  if (test('-f', temp_resp)) {

    // Set the headers
    res.setHeader('Content-type', 'application/ocsp-response');
    res.setHeader('Content-length', fs.readFileSync(temp_resp, 'binary').length);

    // Send the response file to the client
    res.sendfile(temp_resp, function(err){

      // If this is a cacheable response, rename the file somewhere it'll be saved; otherwise delete it
      if (cache) { 
        fs.rename(temp_resp, cached_resp); 
      } else {
        fs.unlink(temp_resp); 
      }
    });

  // If it was a malformed request, delete everything
  } else {
    if (test('-f', temp_req)) fs.unlink(temp_req);
    if (test('-f', cached_req)) fs.unlink(cached_req);
    if (test('-f', temp_resp)) fs.unlink(temp_resp);
    if (test('-f', cached_resp)) fs.unlink(cached_resp);

    // Let the client know
    res.setHeader('Content-type', 'application/ocsp-response');
    res.setHeader('Content-length', fs.readFileSync('/ca/malformedRequest', 'binary').length);
    res.sendfile('/ca/malformedRequest');
  }
}

// Verify request on POST
ocsp.post('/', function(req, res) {
  var b64 = new Buffer(req.rawBody).toString('base64');
  ocsp.ca.serve(b64, res);
});

// Verify request on GET
ocsp.get('/*', function(req, res) {
  var b64 = unescape(req.params[0]);
  if (b64.charAt(0) == "/") b64 = b64.substr(1); // Just in case there's a leading slash
  ocsp.ca.serve(b64, res);
});

// Attempt to serve a cached response, or initiate a fresh response if none exists
ocsp.ca.serve = function(b64, res) {

  // Get path from b64
  var cached_resp = ocsp.ca.response(b64, '');

  // Send the response
  if (test('-f', cached_resp)) {

    // Set the headers
    res.setHeader('Content-type', 'application/ocsp-response');
    res.setHeader('Content-length', fs.readFileSync(cached_resp, 'binary').length);

    // Send the response file to the client
    res.sendfile(cached_resp);

  // If it's not in the cache, verify the request right now!
  } else {
    ocsp.ca.verify(b64, res);
  }
}

// OCSP port
port = 11188;
ocsp.listen(port);
console.log('Listening on port ' + port);

// Refresh OCSP responses (preload cache) before they expire
setInterval(function() {
  console.log("Refreshing responses every " + (ocsp.ca.minutes_valid - 0.5) + " minutes");
  ocsp.ca.refresh();
}, (ocsp.ca.minutes_valid - 0.5) * 60 * 1000);

// Clean cache
exec('rm -rf ' + ocsp.ca.responses_dir + '*');
exec('rm -rf ' + ocsp.ca.requests_dir + '*');

