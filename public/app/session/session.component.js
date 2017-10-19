'use strict';
angular.module('app.session')
    .component('session', {
        templateUrl: '/assets/app/session/session.template.html',
        controller: ['$location', 'Session', '$rootScope',
            function ($location, Session, $rootScope) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.user = Session.getUser();
                    ctrl.credentials = {};
                    Session.setLoginEnv(ctrl);
                };

                $rootScope.$on('devLogout', function () {
                    ctrl.user = Session.getUser();
                    ctrl.credentials = {};
                    Session.setLoginEnv(ctrl);
                });

                $rootScope.$on('examStarted', function () {
                    ctrl.hideNavBar = true;
                });

                $rootScope.$on('examEnded', function () {
                    ctrl.hideNavBar = false;
                });

                // dev-mode login, not usable with production environment
                ctrl.login = function () {
                    Session.login(ctrl.credentials.username, ctrl.credentials.password)
                        .then(function (user) {
                            ctrl.user = user;
                        });
                };

            }
        ]
    });
