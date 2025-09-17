"use strict";

const docRules = require('@lumjs/build/jsdoc-rules');
const ourRules = docRules.rootReadme.srcDocs.clone(); 

module.exports = ourRules;