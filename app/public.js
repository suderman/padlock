// 2015 Jon Suderman
// Padlock Certificate Authority & OCSP Responder
// https://github.com/suderman/padlock
// 
// Certificate Authority Public
// Port 11180

var path = require('path'),
    fs = require('fs');
var dir = fs.realpathSync(path.join(__dirname, '../certificates')),
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

// Show index page
app.get(/\/*/, function(req, res) {

  var { DOMAIN, CA_NAME, CA_EMAIL } = process.env;
  res.render('index.ejs', { 
    private:  false, 
    ca_name:  CA_NAME, 
    ca_email: CA_EMAIL, 
    domain:   DOMAIN,
    certs:    [], 
    revoked:  []
  });
});

// Public port
app.listen(process.env.PUBLIC_PORT);
console.log('Listening on port ' + process.env.PUBLIC_PORT);
