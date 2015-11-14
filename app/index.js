require("babel/register")({ stage: 0 });
require('shelljs/global');

// Load environment variables
['NAME','ORG','EMAIL','CITY','REGION','COUNTRY','SECURE_PORT','PUBLIC_PORT','OCSP_PORT','DOMAIN','OCSP_DOMAIN'].forEach(function(key) {
  delete process.env[key];
});
require('dotenv').load();

// Initiate
if (! exec('bin/init').code) {

  // Start Apps
  require('./public');
  require('./secure');
  require('./ocsp');

  // Refresh the CRL every hour
  setInterval(function() { exec('bin/crl') }, 3600000);
}
