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

angular.module('app.question')
    .component('baseQuestionEditor', {
        template:
            '<div id="sitnet-dialog">\n' +
            '    <div class="modal-body">\n' +
            '        <question new-question="$ctrl.resolve.newQuestion" question-id="$ctrl.resolve.questionId" on-save="$ctrl.onSave(question)" on-cancel="$ctrl.cancel()"\n' +
            '                  question-draft="$ctrl.resolve.questionDraft" collaborative="$ctrl.resolve.collaborative" lottery-on="$ctrl.resolve.lotteryOn"></question>\n' +
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

                const vm = this;

                vm.onSave = function (question) {
                    vm.close({
                        $value: { 'question': question }
                    });
                };

                vm.cancel = function () {
                    vm.dismiss({ $value: 'cancel' });
                };

                // Close modal if user clicked the back button and no changes made
                $scope.$on('$routeChangeStart', function () {
                    if (!window.onbeforeunload) {
                        vm.cancel();
                    }
                });

            }]
    });

