'use strict';
angular.module('app.utility')
    .component('attachmentSelector', {
        templateUrl: '/assets/app/utility/attachment/dialogs/attachmentSelector.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope', 'Files', function ($scope, Files) {

            var vm = this;

            vm.$onInit = function () {
                vm.title = vm.resolve.title;
                vm.isTeacherModal = vm.resolve.isTeacherModal;
                Files.getMaxFilesize().then(function (data) {
                    vm.maxFileSize = data.filesize;
                });
            };

            vm.ok = function () {
                vm.close({
                    $value: {'attachmentFile': vm.attachmentFile}
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
