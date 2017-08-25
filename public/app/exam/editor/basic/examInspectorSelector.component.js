'use strict';
angular.module('app.exam.editor')
    .component('examInspectorSelector', {
        templateUrl: '/assets/app/exam/editor/basic/examInspectorSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'limitToFilter', 'ExamRes', 'UserRes',
            function ($translate, limitToFilter, ExamRes, UserRes) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newInspector = {
                        id: null,
                        name: null,
                        sendMessage: false,
                        comment: ''
                    };
                    getInspectors();
                };

                vm.allInspectors = function (filter, criteria) {

                    return UserRes.filterUsersByExam.query({
                        role: 'TEACHER',
                        eid: vm.exam.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                vm.setInspector = function ($item, $model, $label) {
                    vm.newInspector.id = $item.id;
                };

                vm.addInspector = function () {
                    if (vm.newInspector.id > 0) {
                        ExamRes.inspection.insert({
                            eid: vm.exam.id,
                            uid: vm.newInspector.id,
                            comment: vm.newInspector.comment || ''
                        }, function () {
                            // reload the list
                            getInspectors();
                            // clear input field
                            delete vm.newInspector;

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    } else {
                        toastr.error($translate.instant('sitnet_teacher_not_found'));
                    }
                };

                vm.removeInspector = function (id) {
                    ExamRes.inspector.remove({id: id},
                        function () {
                            getInspectors();
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                function getInspectors() {
                    ExamRes.inspections.get({id: vm.exam.id},
                        function (inspections) {
                            vm.examInspections = inspections;
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                }


            }]
    });
