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

// Send the certificate revocation list
app.get('/ca.crl', function(req, res) {
  res.sendfile(`${ca}/crl/ca.crl`);
});

// Send the certificate revocation list (pem)
app.get('/ca.crl.pem', function(req, res) {
  res.sendfile(`${ca}/crl/ca.crl.pem`);
});

// Show index page
app.get(/\/*/, function(req, res) {
  res.render('index.ejs', { 
    private:  false, 
    domain:    process.env.DOMAIN,
    ca_name:   process.env.CA_NAME, 
    ca_email:  process.env.CA_EMAIL, 
    crl_host:  process.env.CRL_HOST, 
    ocsp_host: process.env.OCSP_HOST, 
    certs:    [], 
    revoked:  []
  });
});

// Public port
app.listen(process.env.PUBLIC_PORT);
console.log('Public listening on port ' + process.env.PUBLIC_PORT);
