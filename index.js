'use strict';

const unleash = require('unleash-server');
const enableGoogleOauth = require('./google-auth-hook');

let options = {
    authentication: {
        type: 'custom',
        customAuthHandler: enableGoogleOauth,
    },
};

unleash.start(options);
