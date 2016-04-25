(function () {
    'use strict';

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
        'pascalprecht.translate',
        'ui.bootstrap',
        'exam.services',
        'exam.controllers',
        'exam.resources',
        'exam.directives',
        'exam.filters',
        'exam.utils'])
        .constant('EXAM_CONF', {
            AUTH_STORAGE_KEY: 'EXAM_USER',
            AUTH_HEADER: 'x-exam-authentication',
            CONTEXT_PATH: '/',
            LANGUAGES_PATH: '/assets/assets/languages/',
            TEMPLATES_PATH: '/assets/app/'
        });
}());
