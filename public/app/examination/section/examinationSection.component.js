'use strict';

angular.module('app.examination')
    .component('examinationSection', {
        templateUrl: '/assets/app/examination/section/examinationSection.template.html',
        bindings: {
            examHash: '<',
            isPreview: '<',
            section: '<'
        },
        controller: ['$interval', 'Examination',
            function ($interval, Examination) {

                var vm = this;
                var _autosaver = null;

                vm.$onInit = function () {
                    resetAutosaver();
                };

                vm.$onChanges = function (props) {
                    if (props.section) {
                        // Section changed
                        resetAutosaver();
                    }
                };

                vm.$onDestroy = function () {
                    // No section currently active
                    cancelAutosaver();
                };

                var resetAutosaver = function () {
                    cancelAutosaver();
                    if (vm.section) {
                        _autosaver = $interval(function () {
                            Examination.saveAllTextualAnswersOfSection(vm.section, vm.examHash, true);
                        }, 1000 * 60);
                    }
                };

                var cancelAutosaver = function () {
                    if (_autosaver) {
                        $interval.cancel(_autosaver);
                        _autosaver = null;
                    }
                };
            }
        ]
    });
