require("babel/register")({ stage: 0 });
require('shelljs/global');

// Load environment variables
require('dotenv').load();

// Initiate
if (! exec('bin/init').code) {

  // Start Apps
  require('./public');
  require('./secure');
  require('./ocsp');
}
