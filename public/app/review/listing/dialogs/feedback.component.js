'use strict';
angular.module('app.review')
    .component('reviewFeedback', {
        templateUrl: '/assets/app/review/listing/dialogs/feedback.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope', 'Assessment', function ($scope, Assessment) {

            var vm = this;

            vm.$onInit = function () {
                vm.exam = vm.resolve.exam;
            };

            vm.ok = function () {
                if (!vm.exam.examFeedback) {
                    vm.exam.examFeedback = {};
                }
                Assessment.saveFeedback(vm.exam);
                vm.close();
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
