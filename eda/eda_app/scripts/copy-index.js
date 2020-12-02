'use strict';

const fs = require('fs-extra');

var source = './src/index_locale.html';
var target = './dist/app-eda/index.html';

fs.copySync(source, target, {recursive: true});

console.log('\x1b[34m=====\x1b[0m Fitxer \x1b[32m[/src/index_locale.html] \x1b[0mcopiat a \x1b[32m[/dist/app-eda] \x1b[34m=====\x1b[0m');
