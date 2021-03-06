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
var ca  = fs.realpathSync(path.join(__dirname, '../ca')),
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
  res.sendfile(`${ca}/root/ca.crt`);
});

// Send the root certificate (txt)
app.get('/ca.txt', function(req, res) {
  res.sendfile(`${ca}/root/ca.txt`);
});

// Send the certificate revocation list
app.get('/ca.crl', function(req, res) {
  res.sendfile(`${ca}/crl/ca.crl`);
});

// Send the certificate revocation list (pem)
app.get('/ca.crl.pem', function(req, res) {
  res.sendfile(`${ca}/crl/ca.crl.pem`);
});

// Send the certificate revocation list (txt)
app.get('/ca.crl.txt', function(req, res) {
  res.sendfile(`${ca}/crl/ca.crl.txt`);
});

// Nuke all certicates on CA POST
app.post('/ca\.:filetype(crt|txt|crl|crl.pem|crl.txt)', function(req, res) {
  exec(`${bin}/reset`);
  res.send(200, 'Certifcate Authority and all certificates deleted. Rebuilding new CA...');
});

// Send the diffie hellman parameters
app.get('/dh.pem', function(req, res) {
  res.sendfile(`${ca}/root/dh.pem`);
});

// Send list of comma-separated values of revoked certificates on GET
app.get('/revoked/:filename\.:filetype(csv)', function(req, res) {
  var filename = req.params.filename.replace(/[^\w\.@\-\_]/gi,'').replace(/.csv$/,'');
  var certs = exec(`cd ${ca}/revoked && ls -d *${filename}`, { silent: true }).output.split("\n");
  res.send(200, certs.filter(Boolean).join(','));
});

// Send list of comma-separated values of certificates on GET
app.get('/:filename\.:filetype(csv)', function(req, res) {
  var filename = req.params.filename.replace(/[^\w\.@\-\_]/gi,'').replace(/.csv$/,'');
  var certs = exec(`cd ${ca}/certs && ls -d *${filename}`, { silent: true }).output.split("\n");
  res.send(200, certs.filter(Boolean).join(','));
});

// Send revoked certificates on GET
app.get('/revoked/:filename\.:filetype(crt|key|p12|pub|txt|tun\.ovpn|tap\.ovpn|ovpn|ta|zip)', function(req, res) {
  var path = `${ca}/revoked/${req.params.filename}/${req.params.filename}.${req.params.filetype}`;

  // Send the requested file
  if (test('-f', path)) {
    res.sendfile(path);
  }
});

// Sign/present certificates on GET
app.get('/:filename\.:filetype(crt|key|p12|pub|txt|tun\.ovpn|tap\.ovpn|ovpn|ta|zip)', function(req, res) {
  var path = `${ca}/certs/${req.params.filename}/${req.params.filename}.${req.params.filetype}`;

  // Build the requested file if it doesn't exist
  if (!test('-f', path)) {
    exec(`${bin}/certify '${req.params.filename}'`);
  }

  // Send the requested file
  res.sendfile(path);
});

// Revoke certicates on POST
app.post('/:filename\.:filetype(crt|key)', function(req, res) {
  var path = `${ca}/certs/${req.params.filename}/${req.params.filename}.${req.params.filetype}`;

  // Revoke the certificate if it exists
  if (test('-f', path)) {
    exec(`${bin}/revoke '${req.params.filename}'`);
    res.send(200, req.params.filename + ' is now revoked');
  } else {
    res.send(200, req.params.filename + " doesn't exist");
  }
});

// Delete certicate's related files on POST
app.post('/:filename\.:filetype(pub|txt|p12|tun\.ovpn|tap\.ovpn|ovpn|zip)', function(req, res) {
  var path = `${ca}/certs/${req.params.filename}/${req.params.filename}.${req.params.filetype}`;

  // Revoke the certificate if it exists
  if (test('-f', path)) {
    exec(`rm -rf '${path}'`);
    res.send(200, path + ' is now deleted');
  } else {
    res.send(200, path + " doesn't exist");
  }
});

// Show index page
app.get(/\/*/, function(req, res) {
  res.render('index.ejs', { 
    private:     true, 
    domain:      process.env.DOMAIN,
    name:        process.env.NAME, 
    email:       process.env.EMAIL, 
    ocsp_domain: process.env.OCSP_DOMAIN, 
    certs:       exec(`ls ${ca}/certs`, { silent: true }).output.split("\n"), 
    revoked:     exec(`ls ${ca}/revoked`, { silent: true }).output.split("\n")
  });
});

// Secure port
app.listen(process.env.SECURE_PORT);
console.log('Secure listening on port ' + process.env.SECURE_PORT);
