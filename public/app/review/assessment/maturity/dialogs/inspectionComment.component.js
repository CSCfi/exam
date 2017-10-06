'use strict';
angular.module('app.review')
    .component('rInspectionComment', {
        templateUrl: '/assets/app/review/assessment/maturity/dialogs/inspectionComment.template.html',
        bindings: {
            close: '&',
            dismiss: '&'
        },
        controller: ['$scope', 'Files', function ($scope, Files) {

            var vm = this;

            vm.$onInit = function () {
                vm.data = {comment: null};
            };

            vm.ok = function () {
                vm.close({
                    $value: {'comment': vm.data.comment}
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
