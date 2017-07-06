'use strict';

angular.module('app.examination')
    .component('examinationHeader', {
        templateUrl: '/assets/app/examination/header/examinationHeader.template.html',
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
