'use strict';
angular.module('app.review')
    .component('noShows', {
        templateUrl: '/assets/app/review/listing/dialogs/noShows.template.html',
        bindings: {
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', '$scope', 'ExamRes', function ($translate, $scope, ExamRes) {

            //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.

            var vm = this;

            vm.$onInit = function () {
                vm.noShows = vm.resolve.noShows;
            };

            vm.permitRetrial = function (reservation) {
                ExamRes.reservation.update({id: reservation.id}, function () {
                    reservation.retrialPermitted = true;
                    toastr.info($translate.instant('sitnet_retrial_permitted'));
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
