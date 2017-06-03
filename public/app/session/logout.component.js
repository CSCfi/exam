'use strict';
angular.module('app.session')
    .component("logout", {
        controller: ['Session',
            function (Session) {
                Session.logout();
            }
        ]
    });
