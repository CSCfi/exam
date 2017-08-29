'use strict';
angular.module('app.session')
    .component('eula', {
        template: '<div id="sitnet-dialog">\n' +
        '\n' +
        '    <div class="student-message-dialog-wrapper-padding">\n' +
        '        <div class="student-enroll-dialog-wrap">\n' +
        '            <div class="student-enroll-title">{{\'sitnet_accept_useragreement\' | translate}}</div>\n' +
        '        </div>\n' +
        '        <div class="modal-body">\n' +
        '            <div ng-bind-html="$ctrl.eula.value">\n' +
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

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.settings = {
                        eula: Settings.agreement.get()
                    };
                };

                ctrl.cancel = function () {
                    ctrl.dismiss({$value: 'cancel'});
                };

                ctrl.ok = function () {
                    ctrl.close();
                }
            }
        ]
    });
