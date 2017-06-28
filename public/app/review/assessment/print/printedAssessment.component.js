'use strict';

angular.module('app.review')
    .component('printedAssessment', {
        templateUrl: '/assets/app/review/assessment/print/printedAssessment.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$routeParams', '$document', '$sce', 'ExamRes', 'questionService', 'examService', 'Assessment', 'EXAM_CONF', 'Session',
            function ($routeParams, $document, $sce, ExamRes, questionService, examService, Assessment, EXAM_CONF, Session) {

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

                            vm.questionSummary = questionService.getQuestionAmounts(exam);
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
                            ExamRes.examParticipationsOfUser.query({
                                eid: vm.exam.parent.id,
                                uid: vm.student.id
                            }, function (data) {
                                // Filter out the participation we are looking into
                                vm.previousParticipations = data.filter(function (p) {
                                    return p.id !== vm.participation.id;
                                });

                                $document.ready(function () {
                                    $('#vmenu').hide();
                                    var mainView = $('#mainView');
                                    mainView.css('margin', '0 15px');
                                    mainView.css('max-width', '1000px');

                                    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
                                    setTimeout(function () {
                                        window.print();
                                    }, 2000);
                                });

                            });

                        });
                };

                vm.translateGrade = function (participation) {
                    return !participation.exam.grade ? 'N/A' : examService.getExamGradeDisplayName(participation.exam.grade.name);
                };

                vm.getGrade = function () {
                    return !vm.exam.grade ? 'N/A' : examService.getExamGradeDisplayName(vm.exam.grade.name);
                };

                vm.getCreditType = function () {
                    return !vm.exam ? 'N/A' : examService.getExamTypeDisplayName(vm.exam.examType.type);
                };

                vm.getLanguage = function () {
                    return !vm.exam ? 'N/A' : getLanguageNativeName(Assessment.pickExamLanguage(vm.exam).code);
                };

                vm.getExamMaxPossibleScore = function () {
                    return examService.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return examService.getTotalScore(vm.exam);
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
                    return questionService.scoreWeightedMultipleChoiceAnswer(sq);
                };

                vm.scoreMultipleChoiceAnswer = function (sq) {
                    if (sq.question.type !== 'MultipleChoiceQuestion') {
                        return 0;
                    }
                    return questionService.scoreMultipleChoiceAnswer(sq);
                };

                vm.calculateMaxPoints = function (sq) {
                    return questionService.calculateMaxPoints(sq);
                };

            }
        ]
    });
