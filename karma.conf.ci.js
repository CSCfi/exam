module.exports = function (config) {
    var common = require('./karma.conf.js');
    common(config);
    config.set({
        singleRun: true,
        autoWatch: false,
        browsers: ['PhantomJS']
    });
};
