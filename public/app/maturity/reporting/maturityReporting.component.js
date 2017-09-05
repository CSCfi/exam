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
                            inspections.forEach(function (i) {
                                i.ownerAggregate = i.exam.parent.examOwners.map(function (o) {
                                    return o.firstName + ' ' + o.lastName;
                                }).join(', ');
                                i.studentName = i.exam.creator ? i.exam.creator.firstName + ' ' + i.exam.creator.lastName : '';
                                i.studentNameAggregate = i.exam.creator ? i.exam.creator.lastName + ' ' + i.exam.creator.firstName : '';
                                i.inspectorName = i.modifier ? i.modifier.firstName + ' ' + i.modifier.lastName : '';
                                i.inspectorNameAggregate = i.modifier ? i.modifier.lastName + ' ' + i.modifier.firstName : '';
                            });
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

