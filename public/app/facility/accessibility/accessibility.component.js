'use strict';
angular.module("facility.accessibility")
    .component('accessibility', {
        templateUrl: '/assets/app/facility/accessibility/accessibility.template.html',
        controller: ['$translate', '$http', function ($translate, $http) {

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
                    toastr.info($translate.instant("sitnet_accessibility_added"));
                });
            };

            ctrl.update = function (accessibility) {
                $http.put('/app/accessibility', accessibility).success(function () {
                    toastr.info($translate.instant("sitnet_accessibility_updated"));
                });
            };

            ctrl.remove = function (accessibility) {
                $http.delete('/app/accessibility/' + accessibility.id).success(function () {
                    ctrl.accessibilities.splice(ctrl.accessibilities.indexOf(accessibility), 1);
                    toastr.info($translate.instant("sitnet_accessibility_removed"));
                });
            };
        }]
    });
