'use strict';
angular.module('app.question')
    .component('examQuestionEditor', {
        template:
        '<div id="sitnet-dialog">\n' +
        '    <div class="modal-body">\n' +
        '        <exam-question exam-question="$ctrl.resolve.examQuestion" on-save="$ctrl.onSave(question, examQuestion)" on-cancel="$ctrl.cancel()"\n' +
        '                  lottery-on="$ctrl.resolve.lotteryOn"></exam-question>\n' +
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
                // This component is used for editing distributed exam questions.

                var vm = this;

                vm.onSave = function (question, examQuestion) {
                    vm.close({
                        $value: {question: question, examQuestion: examQuestion}
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

