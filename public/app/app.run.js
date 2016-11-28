'use strict';

angular.module('exam').run(['$http', '$route', '$interval', '$timeout', '$sessionStorage', 'sessionService', 'EXAM_CONF',
    function ($http, $route, $interval, $timeout, $sessionStorage, sessionService, EXAM_CONF) {

        var user = $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY];
        if (user) {
            if (!user.loginRole) {
                // This happens if user refreshes the tab before having selected a login role,
                // lets just throw him out.
                sessionService.logout();
            }
            var header = {};
            header[EXAM_CONF.AUTH_HEADER] = user.token;
            $http.defaults.headers.common = header;
            sessionService.setUser(user);
            sessionService.translate(user.lang);
            sessionService.restartSessionCheck();
        } else {
            sessionService.switchLanguage('en');
            sessionService.login('', '');
        }
    }
]);
