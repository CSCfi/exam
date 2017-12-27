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

'use strict';
angular.module('app.maturity')
    .component('maturityReporting', {
        templateUrl: '/assets/app/maturity/reporting/maturityReporting.template.html',
        controller: ['$translate', 'LanguageInspections', 'Session', 'EXAM_CONF',
            function ($translate, LanguageInspections, Session, EXAM_CONF) {

                var vm = this;

                vm.$onInit = function () {
                    vm.selection = {opened: false, month: new Date()};
                    vm.query();
                };

                vm.printReport = function () {
                    setTimeout(function () {
                        window.print();
                    }, 500);
                };

                vm.open = function ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    vm.selection.opened = true;
                };

                vm.query = function () {
                    var params = {};
                    if (vm.selection.month) {
                        params.month = vm.selection.month;
                    }
                    LanguageInspections.query(params).then(
                        function (inspections) {
                            vm.processedInspections = inspections.filter(function (i) {
                                return i.finishedAt;
                            });
                        });
                };

                vm.showStatement = function (statement) {
                    LanguageInspections.showStatement(statement);
                };

            }
        ]
    });

