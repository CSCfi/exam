'use strict';
angular.module('app.facility.accessibility')
    .component('accessibility', {
        templateUrl: '/assets/app/facility/accessibility/accessibility.template.html',
        controller: ['$translate', '$http', 'toast', function ($translate, $http, toast) {

            var ctrl = this;

            ctrl.$onInit = function () {
                ctrl.newItem = {};
                $http.get('/app/accessibility').success(function (data) {
                    ctrl.accessibilities = data;
                });
            };

            ctrl.add = function (item) {
                $http.post('/app/accessibility', item).success(function (data) {
                    ctrl.accessibilities.push(data);
                    toast.info($translate.instant("sitnet_accessibility_added"));
                });
            };

            ctrl.update = function (accessibility) {
                $http.put('/app/accessibility', accessibility).success(function () {
                    toast.info($translate.instant("sitnet_accessibility_updated"));
                });
            };

            ctrl.remove = function (accessibility) {
                $http.delete('/app/accessibility/' + accessibility.id).success(function () {
                    ctrl.accessibilities.splice(ctrl.accessibilities.indexOf(accessibility), 1);
                    toast.info($translate.instant("sitnet_accessibility_removed"));
                });
            };
        }]
    });
