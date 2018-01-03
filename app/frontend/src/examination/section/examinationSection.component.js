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

angular.module('app.examination')
    .component('examinationSection', {
        template: require('./examinationSection.template.html'),
        bindings: {
            examHash: '<',
            isPreview: '<',
            section: '<'
        },
        controller: ['$interval', 'Examination',
            function ($interval, Examination) {

                const vm = this;
                let _autosaver = null;

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

                const resetAutosaver = function () {
                    cancelAutosaver();
                    if (vm.section) {
                        _autosaver = $interval(function () {
                            Examination.saveAllTextualAnswersOfSection(vm.section, vm.examHash, true);
                        }, 1000 * 60);
                    }
                };

                const cancelAutosaver = function () {
                    if (_autosaver) {
                        $interval.cancel(_autosaver);
                        _autosaver = null;
                    }
                };
            }
        ]
    });
