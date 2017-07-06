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

                vm.$onInit = function () {
                    setAutosaver();
                };

                vm.$onChanges = function (props) {
                    if (props.section) {
                        if (!props.currentValue) {
                            cancelAutosaver();
                        }
                        else if (!props.previousValue) {
                            setAutosaver();
                        }
                    }
                };

                vm.$onDestroy = function () {
                    cancelAutosaver();
                };

                var setAutosaver = function () {
                    if (vm.section && !vm.autosaver) {
                        vm.autosaver = $interval(function () {
                            Examination.saveAllTextualAnswersOfSection(vm.section, vm.examHash, true);
                        }, 1000 * 60);
                    }
                };

                var cancelAutosaver = function () {
                    if (!vm.section && vm.autosaver) {
                        $interval.cancel(vm.autosaver);
                        delete vm.autosaver;
                    }
                };
            }
        ]
    });
