'use strict';
angular.module('app.dashboard')
    .component('dashboard', {
        templateUrl: '/assets/app/dashboard/dashboard.template.html',
        controller: ['Session',
            function (Session) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.user = Session.getUser();
                    if (!ctrl.user) {
                        console.log('not logged in');
                    }
                };

            }]
    });
