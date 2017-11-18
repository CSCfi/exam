'use strict';
angular.module('app.exam.editor')
    .component('examOwnerSelector', {
        templateUrl: '/assets/app/exam/editor/basic/examOwnerSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'limitToFilter', 'ExamRes', 'UserRes', 'toast',
            function ($translate, limitToFilter, ExamRes, UserRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newOwner = {
                        "id": null,
                        "name": null
                    };
                    vm.examOwners = getExamOwners();
                };

                vm.allExamOwners = function (filter, criteria) {

                    return UserRes.filterOwnersByExam.query({
                        role: 'TEACHER',
                        eid: vm.exam.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.setExamOwner = function ($item, $model, $label) {
                    vm.newOwner.id = $item.id;
                };

                vm.addExamOwner = function () {
                    if (vm.newOwner.id > 0) {
                        ExamRes.examowner.insert({
                            eid: vm.exam.id,
                            uid: vm.newOwner.id
                        }, function () {
                            getExamOwners();
                            // clear input field
                            delete vm.newOwner.name;
                            delete vm.newOwner.id;
                        }, function (error) {
                            toast.error(error.data);
                        });
                    } else {
                        toast.error($translate.instant('sitnet_teacher_not_found'));
                    }
                };

                vm.removeOwner = function (id) {
                    ExamRes.examowner.remove({eid: vm.exam.id, uid: id},
                        function () {
                            getExamOwners();
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

                function getExamOwners() {
                    ExamRes.owners.query({id: vm.exam.id},
                        function (examOwners) {
                            vm.examOwners = examOwners;
                        },
                        function (error) {
                            toast.error(error.data);
                        });

                }


            }]
    });
