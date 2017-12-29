'use strict';
angular.module('app.review')
    .component('abortedExams', {
        templateUrl: '/assets/app/review/listing/dialogs/abortedExams.template.html',
        bindings: {
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', '$scope', 'ExamRes', 'toast', function ($translate, $scope, ExamRes, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.abortedExams = vm.resolve.abortedExams;
            };

            vm.permitRetrial = function (reservation) {
                ExamRes.reservation.update({id: reservation.id}, function () {
                    reservation.retrialPermitted = true;
                    toast.info($translate.instant('sitnet_retrial_permitted'));
                });
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function () {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });

        }]
    });
