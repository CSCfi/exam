/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */
import angular from 'angular';
angular.module('app.exam.editor')
    .component('publicationDialog', {
        template: require('./publicationDialog.template.html'),
        bindings: {
            resolve: '<',
            close: '&',
            dismiss: '&'
        },
        controller: ['$translate', function ($translate) {
            const vm = this;

            vm.getConfirmationText = function () {
                let confirmation = vm.resolve.collaborative ? $translate.instant('sitnet_pre_publish_exam_confirm') :
                    $translate.instant('sitnet_publish_exam_confirm');
                if (vm.resolve.exam.executionType.type !== 'PRINTOUT') {
                    confirmation += ' ' + $translate.instant('sitnet_publish_exam_confirm_enroll');
                }
                return confirmation;
            };

            vm.getTitle = function () {
                return vm.resolve.collaborative ? 'sitnet_pre_publish_exam_confirm_dialog_title' : 'sitnet_publish_exam_confirm_dialog_title';
            }

            vm.ok = function () {
                vm.close();
            };

            vm.cancel = function () {
                vm.dismiss();
            };
        }]
    });
