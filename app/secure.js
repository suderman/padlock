// 2015 Jon Suderman
// Padlock Certificate Authority & OCSP Responder
// https://github.com/suderman/padlock
// 
// Certificate Authority API
// Port 11443
// GET to build/request certificates
// POST to revoke/delete certificates

var path = require('path'),
    fs = require('fs');
var dir = fs.realpathSync(path.join(__dirname, '../certificates')),
    bin = fs.realpathSync(path.join(__dirname, '../bin'));

var express = require('express');
var app = express(),
    server = require('http').createServer(app);

 // Views
app.set('views', path.join(__dirname));
// app.set('view engine', 'hjs');

// Static assets
app.use(express.static(path.join(__dirname, '../public')));

// Send the root certificate
app.get('/ca.crt', function(req, res) {
  res.sendfile(`${dir}/ca/ca.crt`);
});

// Send the certificate revocation list
app.get('/ca.crl', function(req, res) {
  res.sendfile(`${dir}/crl/ca.crl`);
});

// Send the certificate revocation list (pem)
app.get('/ca.crl.pem', function(req, res) {
  res.sendfile(`${dir}/crl/ca.crl.pem`);
});

// Send revoked certificates on GET
app.get('/revoked/:filename\.:filetype(crt|key|p12|pem|pub|zip)', function(req, res) {
  var path = `${dir}/revoked/${req.params.filename}/${req.params.filename}.${req.params.filetype}`;

  // Send the requested file
  if (test('-f', path)) {
    res.sendfile(path);
  }
});

// Sign/present certificates on GET
app.get('/:filename\.:filetype(crt|key|p12|pem|pub|zip)', function(req, res) {
  var path = `${dir}/certs/${req.params.filename}/${req.params.filename}.${req.params.filetype}`;

  // Build the requested file if it doesn't exist
  if (!test('-f', path)) {
    exec(`${bin}/certify '${req.params.filename}'`);
  }

  // Send the requested file
  res.sendfile(path);
});

// Revoke certicates on POST
app.post('/:filename\.:filetype(crt|key|p12|pem|pub|zip)', function(req, res) {
  var path = `${dir}/certs/${req.params.filename}/${req.params.filename}.${req.params.filetype}`;

  // Revoke the certificate if it exists
  if (test('-f', path)) {
    exec(`${bin}/revoke '${req.params.filename}'`);
    res.send(200, req.params.filename + ' is now revoked');
  } else {
    res.send(200, req.params.filename + " doesn't exist");
  }
});

// Show index page
app.get(/\/*/, function(req, res) {

  var { DOMAIN, CA_NAME, CA_EMAIL } = process.env;
  res.render('index.ejs', { 
    private:  true, 
    ca_name:  CA_NAME, 
    ca_email: CA_EMAIL, 
    domain:   DOMAIN,
    certs:    exec(`ls ${dir}/certs`, { silent: true }).output.split("\n"), 
    revoked:  exec(`ls ${dir}/revoked`, { silent: true }).output.split("\n")
  });
});

// Secure port
app.listen(process.env.SECURE_PORT);
console.log('Listening on port ' + process.env.SECURE_PORT);
