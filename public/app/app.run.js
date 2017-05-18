'use strict';

angular.module('exam').run(['$http', '$sessionStorage', 'Session', 'EXAM_CONF',
    function ($http, $sessionStorage, Session, EXAM_CONF) {
        var user = $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY];
        if (user) {
            if (!user.loginRole) {
                // This happens if user refreshes the tab before having selected a login role,
                // lets just throw him out.
                Session.logout();
            }
            var header = {};
            header[EXAM_CONF.AUTH_HEADER] = user.token;
            $http.defaults.headers.common = header;
            Session.setUser(user);
            Session.translate(user.lang);
            Session.restartSessionCheck();
        } else {
            Session.switchLanguage('en');
            Session.login('', '');
        }
    }
]);
