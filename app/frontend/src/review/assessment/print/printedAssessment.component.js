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

angular.module('app.review')
    .component('printedAssessment', {
        templateUrl: '/assets/app/review/assessment/print/printedAssessment.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$routeParams', '$document', '$sce', 'ExamRes', 'Question', 'Exam', 'Assessment', 'EXAM_CONF',
            'Session', 'Language',
            function ($routeParams, $document, $sce, ExamRes, Question, Exam, Assessment, EXAM_CONF, Session, Language) {

                var vm = this;

                vm.$onInit = function () {

                    var path = EXAM_CONF.TEMPLATES_PATH + 'review/assessment/print/templates/';
                    vm.templates = {
                        section: path + 'section.html',
                        multiChoice: path + 'multiChoice.html',
                        essay: path + 'essay.html',
                        clozeTest: path + 'clozeTest.html'
                    };

                    ExamRes.reviewerExam.get({eid: $routeParams.id},
                        function (exam) { //TODO: Some duplicates here, refactor some more
                            exam.examSections.forEach(function (es) {
                                es.sectionQuestions.filter(function (esq) {
                                    return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                                }).forEach(function (esq) {
                                    esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                                });
                            });

                            vm.questionSummary = Question.getQuestionAmounts(exam);
                            vm.exam = exam;
                            vm.user = Session.getUser();

                            vm.participation = vm.exam.examParticipations[0];
                            var duration = moment.utc(new Date(vm.participation.duration));
                            if (duration.second() > 29) {
                                duration.add(1, 'minutes');
                            }
                            vm.participation.duration = duration.format('HH:mm');

                            vm.student = vm.participation.user;
                            vm.enrolment = vm.exam.examEnrolments[0];
                            vm.reservation = vm.enrolment.reservation;
                            Assessment.participationsApi.query({
                                eid: vm.exam.parent.id,
                                uid: vm.student.id
                            }, function (data) {
                                // Filter out the participation we are looking into
                                var previousParticipations = data.filter(function (p) {
                                    return p.id !== vm.participation.id;
                                });
                                Assessment.noShowApi.query({
                                    eid: vm.exam.parent.id,
                                    uid: vm.student.id
                                }, function (data) {
                                    var noShows = data.map(function (d) {
                                        return {noShow: true, started: d.reservation.startAt, exam: {state: 'no_show'}};
                                    });
                                    vm.previousParticipations = previousParticipations.concat(noShows);
                                    $document.ready(function () {
                                        $('#vmenu').hide();
                                        var mainView = $('#mainView');
                                        mainView.css('margin', '0 15px');
                                        mainView.css('max-width', '1000px');

                                        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
                                        setTimeout(function () {
                                            window.print();
                                        }, 2000);
                                    });
                                });
                            });

                        });
                };

                vm.translateGrade = function (participation) {
                    return !participation.exam.grade ? 'N/A' : Exam.getExamGradeDisplayName(participation.exam.grade.name);
                };

                vm.getGrade = function () {
                    return !vm.exam.grade ? 'N/A' : Exam.getExamGradeDisplayName(vm.exam.grade.name);
                };

                vm.getCreditType = function () {
                    return !vm.exam ? 'N/A' : Exam.getExamTypeDisplayName(vm.exam.examType.type);
                };

                vm.getLanguage = function () {
                    return !vm.exam ? 'N/A' : Language.getLanguageNativeName(Assessment.pickExamLanguage(vm.exam).code);
                };

                vm.getExamMaxPossibleScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return Exam.getTotalScore(vm.exam);
                };

                vm.getTeacherCount = function () {
                    // Do not add up if user exists in both groups
                    var owners = vm.exam.parent.examOwners.filter(function (owner) {
                        return vm.exam.examInspections.map(function (inspection) {
                            return inspection.user.id;
                        }).indexOf(owner.id) === -1;
                    });
                    return vm.exam.examInspections.length + owners.length;
                };

                vm.displayQuestionText = function (sq) {
                    return $sce.trustAsHtml(sq.question.question);
                };

                vm.getWordCount = function (sq) {
                    if (!sq.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countWords(sq.essayAnswer.answer);
                };

                vm.getCharacterCount = function (sq) {
                    if (!sq.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countCharacters(sq.essayAnswer.answer);
                };

                vm.scoreWeightedMultipleChoiceAnswer = function (sq) {
                    if (sq.question.type !== 'WeightedMultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreWeightedMultipleChoiceAnswer(sq);
                };

                vm.scoreMultipleChoiceAnswer = function (sq) {
                    if (sq.question.type !== 'MultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreMultipleChoiceAnswer(sq);
                };

                vm.calculateMaxPoints = function (sq) {
                    return Question.calculateMaxPoints(sq);
                };

            }
        ]
    });
