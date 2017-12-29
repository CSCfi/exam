'use strict';

angular.module('app.examination')
    .component('examinationHeader', {
        template:
        '<div class="row">\n' +
        '    <div class="exam-header">\n' +
        '        <div class="exam-header-img-wrap">\n' +
        '            <img src="/assets/assets/images/exam-logo-mobile.svg" alt="exam"\n' +
        '                 onerror="this.onerror=null;this.src=\'/assets/assets/images/exam-logo-mobile.png\'"/>\n' +
        '        </div>\n' +
        '        <div class="exam-header-title divider"></div>\n' +
        '        <div class="exam-header-title">{{ $ctrl.exam.course.name }} <span>{{ $ctrl.exam.course.code }}</span></div>\n' +
        '        <div class="language-selector">\n' +
        '            <a class="exam-clock-text" ng-click="$ctrl.switchLanguage(\'fi\')">FI</a>\n' +
        '            <a class="exam-clock-text" ng-click="$ctrl.switchLanguage(\'sv\')">SV</a>\n' +
        '            <a class="exam-clock-text" ng-click="$ctrl.switchLanguage(\'en\')">EN</a>\n' +
        '            <span class="exam-header-title divider"></span>\n' +
        '        </div>\n' +
        '        <examination-clock\n' +
        '                ng-if="!$ctrl.isPreview" exam-hash="$ctrl.exam.hash" on-timeout="$ctrl.informTimeout()">\n' +
        '        </examination-clock>\n' +
        '    </div>\n' +
        '</div>',
        bindings: {
            exam: '<',
            onTimeout: '&',
            isPreview: '<'
        },
        controller: ['Session',
            function (Session) {

                var vm = this;

                vm.informTimeout = function () {
                    vm.onTimeout();
                };

                vm.switchLanguage = function (key) {
                    Session.switchLanguage(key);
                };
            }
        ]
    });
