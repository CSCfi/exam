'use strict';

// TODO: remove
angular.module('exam.resources', []);
angular.module('exam.controllers', []);
angular.module('exam.services', []);
angular.module('exam.directives', []);
angular.module('exam.filters', []);
angular.module('exam.utils', []);

angular.module('exam', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngStorage',
    'ngPromiseExtras',
    'http-auth-interceptor',
    'ui.bootstrap',
    'ui.calendar',
    'ui.select',
    'ui.multiselect',
    'ui.select2',
    'dialogs.main',
    'pascalprecht.translate',
    'mgcrea.ngStrap.affix',
    'mgcrea.ngStrap.helpers.debounce', // required by affix
    'mgcrea.ngStrap.helpers.dimensions', // required by affix
    'tmh.dynamicLocale',
    'exam.services', // TODO: make these named by feature, make module.js for each subdirectory
    'exam.controllers',
    'exam.resources',
    'exam.directives',
    'exam.filters',
    'exam.utils',
    'administrative'
]);

