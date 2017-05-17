'use strict';
angular.module("session")
    .component("logout", {
        controller: ['Session',
            function (Session) {
                Session.logout();
            }
        ]
    });
