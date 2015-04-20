// Load environment variables
require('dotenv').load();

require("babel/register")({ stage: 0 });

// Initiate
require('shelljs/global');
exec("bin/init");
// exec("bin/test");

// var path = require('path');
// var fs = require('fs');
// console.log('The path is: ' + fs.realpathSync(path.join(__dirname, '../var')));
// console.log(path.join(__dirname, '../public'));

// Start Apps
// require('./public');
require('./secure.js');
// require('./ocsp');
