/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';

angular.module('app.question').component('examQuestionEditor', {
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
        resolve: '<',
    },
    controller: [
        '$scope',
        function($scope) {
            // This component is used for editing distributed exam questions.

            const vm = this;

            vm.onSave = function(question, examQuestion) {
                vm.close({
                    $value: { question: question, examQuestion: examQuestion },
                });
            };

            vm.cancel = function() {
                vm.dismiss({ $value: 'cancel' });
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function() {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });
        },
    ],
});
