var baseConf = require('./baseConf');
baseConf.capabilities = {
        browserName: 'chrome',
        chromeOptions: {
            binary: '/usr/bin/google-chrome'
        }
    };
exports.config = baseConf;
