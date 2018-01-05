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

angular.module('app.session')
    .component('eula', {
        template: '<div id="sitnet-dialog">\n' +
        '\n' +
        '    <div class="student-message-dialog-wrapper-padding">\n' +
        '        <div class="student-enroll-dialog-wrap">\n' +
        '            <div class="student-enroll-title">{{\'sitnet_accept_useragreement\' | translate}}</div>\n' +
        '        </div>\n' +
        '        <div class="modal-body">\n' +
        '            <div ng-bind-html="$ctrl.settings.eula.value">\n' +
        '            </div>\n' +
        '        </div>\n' +
        '        <div class="student-message-dialog-footer">\n' +
        '            <div class="student-message-dialog-button-save">\n' +
        '                <button class="btn btn-sm btn-primary" ng-click="$ctrl.ok()">\n' +
        '                    {{\'sitnet_button_accept\' | translate}}\n' +
        '                </button>\n' +
        '            </div>\n' +
        '            <div class="student-message-dialog-button-cancel">\n' +
        '                <button class="btn btn-sm btn-danger pull-left" ng-click="$ctrl.cancel()">{{\'sitnet_button_decline\' | translate}}\n' +
        '                </button>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n',
        bindings: {
            close: '&',
            dismiss: '&'
        },
        controller: ['Settings',
            function (Settings) {

                const vm = this;

                vm.$onInit = function () {
                    vm.settings = {
                        eula: Settings.agreement.get()
                    };
                };

                vm.cancel = function () {
                    vm.dismiss({$value: 'cancel'});
                };

                vm.ok = function () {
                    vm.close();
                };
            }
        ]
    });
