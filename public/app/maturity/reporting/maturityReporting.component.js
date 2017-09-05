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

