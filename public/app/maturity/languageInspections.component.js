'use strict';
angular.module('app.maturity')
    .component('languageInspections', {
        templateUrl: '/assets/app/maturity/languageInspections.template.html',
        controller: ['$translate', 'LanguageInspections', 'Session', 'EXAM_CONF',
            function ($translate, LanguageInspections, Session, EXAM_CONF) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.ongoingInspections = [];
                    vm.processedInspections = [];
                    vm.filters = {};
                    vm.templates = {
                        ongoing: EXAM_CONF.TEMPLATES_PATH + 'maturity/templates/inspection_under_review.html',
                        processed: EXAM_CONF.TEMPLATES_PATH + 'maturity/templates/inspection_reviewed.html'
                    };
                    vm.sorting = {
                        ongoing: {
                            predicate: 'arrived',
                            reverse: false
                        },
                        processed: {
                            predicate: 'finishedAt',
                            reverse: false
                        }
                    };
                    query();
                };

                vm.startDateChanged = function (date) {
                    vm.startDate = date;
                    query();
                };

                vm.endDateChanged = function (date) {
                    vm.endDate = date;
                    query();
                };

                var query = function () {
                    var params = {};
                    var tzOffset = new Date().getTimezoneOffset() * 60000;
                    if (vm.startDate) {
                        params.start = Date.parse(vm.startDate) + tzOffset;
                    }
                    if (vm.endDate) {
                        params.end = Date.parse(vm.endDate);
                    }
                    var refreshAll = _.isEmpty(params);
                    LanguageInspections.query(refreshAll ? undefined : params).then(
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
                            if (refreshAll) {
                                vm.ongoingInspections = inspections.filter(function (i) {
                                    return !i.finishedAt;
                                });
                            }
                            vm.processedInspections = inspections.filter(function (i) {
                                return i.finishedAt;
                            });
                        });
                };


                vm.assignInspection = function (inspection) {
                    LanguageInspections.assignInspection(inspection);
                };

                vm.showStatement = function (statement) {
                    LanguageInspections.showStatement(statement);
                };

                vm.getOngoingInspectionsDetails = function () {
                    var amount = vm.ongoingInspections.length.toString();
                    return $translate.instant('sitnet_ongoing_language_inspections_detail').replace('{0}', amount);
                };

                vm.getProcessedInspectionsDetails = function () {
                    var amount = vm.processedInspections.length.toString();
                    var year = moment().format('YYYY');
                    return $translate.instant('sitnet_processed_language_inspections_detail').replace('{0}', amount)
                        .replace('{1}', year);
                };

            }
        ]
    });

