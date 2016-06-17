module.exports = function (config) {
    config.set({
        basePath: '.',
        files: [
            'public/components/vendor/angular.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'public/components/vendor/angular-translate.js',
            'public/components/vendor/angular-resource.js',
            'public/components/vendor/angular-animate.js',
            'public/components/vendor/angular-cookies.js',
            'public/components/vendor/angular-route.js',
            'public/components/vendor/angular-sanitize.js',
            'public/components/vendor/ngStorage.js',
            'public/components/vendor/angular-promise-extras.js',
            'node_modules/jquery/dist/jquery.js',
            'public/components/vendor/dialogs.min.js',
            'public/components/vendor/ui-bootstrap-tpls-1.1.2.min.js',
            'public/components/vendor/FileSaver.min.js',
            'node_modules/jasmine-jquery/lib/jasmine-jquery.js',
            'test/unit/test_app.js',
            //'public/app/administrative/reportResource.js',
            //'public/app/administrative/settingsResource.js',
            //'public/app/facility/softwareResource.js',
            'public/app/**/*Resource.js',
            'public/app/administrative/statistics/*.js',
            'public/app/exam/examController.js',
            'public/app/utility/*.js',
            'test/unit/**/*Spec.js',
            {pattern: 'test/unit/fixtures/**/*.json', watched: true, served: true, included: false}
        ],
        exclude: [
            'public/components/vendor/MathJax-2.6-latest/**/*.js',
            'public/components/vendor/ckeditor/**/*.js',
            'public/components/vendor/i18n/**/*.js'
        ],
        singleRun: false,
        autoWatch: true,
        frameworks: ['jasmine'],
        browsers: ['Chrome'],
        plugins: [
            'karma-chrome-launcher',
            'karma-phantomjs-launcher',
            'karma-jasmine'
        ],
        reporters: ['dots'],
        logLevel: config.LOG_INFO
    });
};