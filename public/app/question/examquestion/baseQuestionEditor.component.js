'use strict';
angular.module('app.question')
    .component('baseQuestionEditor', {
        template:
        '<div id="sitnet-dialog">\n' +
        '    <div class="modal-body">\n' +
        '        <question new-question="$ctrl.resolve.newQuestion" question-id="$ctrl.resolve.questionId" on-save="$ctrl.onSave(question)" on-cancel="$ctrl.cancel()"\n' +
        '                  lottery-on="$ctrl.resolve.lotteryOn"></question>\n' +
        '    </div>\n' +
        '    <div class="modal-footer">\n' +
        '    </div>\n' +
        '</div>',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope',
            function ($scope) {
                // This component is used for creating new exam questions and editing existing undistributed ones.

                var vm = this;

                vm.onSave = function (question) {
                    vm.close({
                        $value: {'question': question}
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

