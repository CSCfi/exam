'use strict';
angular.module('app.question')
    .component('questionSelector', {
        templateUrl: '/assets/app/question/selector/questionSelector.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', 'ExamRes', function ($translate, ExamRes) {

            var vm = this;

            vm.$onInit = function () {
                vm.questions = [];
            };

            vm.resultsUpdated = function (results) {
                vm.questions = results;
            };

            vm.questionSelected = function (count) {
                vm.selectionCount = count;
            };

            vm.addQuestions = function () {
                // check that at least one has been selected
                var isEmpty = true,
                    boxes = angular.element('.questionToUpdate'),
                    ids = [];

                var insertQuestion = function (sectionId, questionIds, to, examId) {

                    var sectionQuestions = questionIds.map(function (question) {
                        return question;
                    }).join(',');

                    ExamRes.sectionquestionsmultiple.insert({
                            eid: examId,
                            sid: sectionId,
                            seq: to,
                            questions: sectionQuestions
                        }, function (sec) {
                            toastr.info($translate.instant('sitnet_question_added'));
                            vm.close();
                        }, function (error) {
                            toastr.error(error.data);
                            // remove broken objects
                            vm.section.sectionQuestions = vm.section.sectionQuestions.filter(function (sq) {
                                return sq;
                            });
                        }
                    );

                };

                // calculate the new order number for question sequence
                // always add question to last spot, because dragndrop
                // is not in use here
                var to = parseInt(vm.resolve.questionCount) + 1;

                angular.forEach(boxes, function (input) {
                    if (angular.element(input).prop('checked')) {
                        isEmpty = false;
                        ids.push(angular.element(input).val());
                    }
                });

                if (isEmpty) {
                    toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                }
                else {
                    insertQuestion(vm.resolve.sectionId, ids, to, vm.resolve.examId);
                }
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

        }]
    });

