// 2015 Jon Suderman
// Padlock Certificate Authority & OCSP Responder
// https://github.com/suderman/padlock
// 
// Certificate Authority Public
// Port 11180

var path = require('path'),
    fs = require('fs');
var ca  = fs.realpathSync(path.join(__dirname, '../ca')),
    bin = fs.realpathSync(path.join(__dirname, '../bin'));

var express = require('express');

// ----------------------
//  Public App
// ----------------------
var app = express(),
    server = require('http').createServer(app);

 // Views
app.set('views', path.join(__dirname));

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

// Show index page
app.get(/\/*/, function(req, res) {
  res.render('index.ejs', { 
    private:     false, 
    domain:      process.env.DOMAIN,
    name:        process.env.NAME, 
    email:       process.env.EMAIL, 
    ocsp_domain: process.env.OCSP_DOMAIN, 
    certs:       [], 
    revoked:     []
  });
});

// Public port
app.listen(process.env.PUBLIC_PORT);
console.log('Public listening on port ' + process.env.PUBLIC_PORT);
