exports.config = {
    seleniumAddress: 'http://localhost:4444/wd/hub',
    specs: ['student-login-spec.js'],
    onPrepare: function () {
        global.EC = protractor.ExpectedConditions;
    }
};
