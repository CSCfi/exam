'use strict';
angular.module('app.question')
    .component('questionSelector', {
        templateUrl: '/assets/app/question/selector/questionSelector.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', 'ExamRes', 'toast', function ($translate, ExamRes, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.questions = [];
            };

            vm.resultsUpdated = function (results) {
                vm.questions = results;
            };

            vm.questionSelected = function (selections) {
                vm.selections = selections;
            };

            vm.addQuestions = function () {
                // check that at least one has been selected
                if (vm.selections.length === 0) {
                    toast.warning($translate.instant('sitnet_choose_atleast_one'));
                    return;
                }
                var insertQuestion = function (sectionId, to, examId) {

                    ExamRes.sectionquestionsmultiple.insert({
                            eid: examId,
                            sid: sectionId,
                            seq: to,
                            questions: vm.selections.join()
                        }, function (sec) {
                            toast.info($translate.instant('sitnet_question_added'));
                            vm.close();
                        }, function (error) {
                            toast.error(error.data);
                            vm.close({error: error});
                        }
                    );

                };

                // calculate the new order number for question sequence
                // always add question to last spot, because dragndrop
                // is not in use here
                var to = parseInt(vm.resolve.questionCount) + 1;
                insertQuestion(vm.resolve.sectionId, to, vm.resolve.examId);
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

        }]
    });

