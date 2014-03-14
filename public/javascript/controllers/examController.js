(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$routeParams', '$translate', '$http', '$location', 'SITNET_CONF', 'ExamRes', 'QuestionRes', 'dateService',
            function ($scope, $routeParams, $translate, $http, $location, SITNET_CONF, ExamRes, QuestionRes, dateService) {

                $scope.dateService = dateService;

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_general.html";
                $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "/exam.html";
                $scope.sections = [];
                $scope.exams = ExamRes.query();

                // Todo: Fill in rooms from database for final version
                $scope.examRooms = [
                    "Room1",
                    "Room2",
                    "Room3",
                    "Room4"
                ];

                // Todo: Fill in durations from database for final version
                $scope.examDurations = [
                    "0.5",
                    "1.0",
                    "1.5",
                    "2.0",
                    "2.5",
                    "3.0",
                    "3.5",
                    "4.0",
                    "4.5",
                    "5.0",
                    "5.5",
                    "6.0",
                    "6.5",
                    "7.0"
                ];

                // Todo: Fill in inspectors from database for final version
                $scope.examInspectors = [
                    "Pentti Hilkuri",
                    "Arvon Penaali",
                    "Pasi Kuikka"
                ];

                // Todo: Fill in gradings from database for final version
                $scope.examGradings = [
                    "1-3",
                    "1-5",
                    "4-10"
                ];

                // Todo: Fill in languages from database for final version
                $scope.examLanguages = [
                    "Swedish",
                    "English",
                    "German"
                ];

                // Todo: Fill in languages from database for final version
                $scope.examAnswerLanguages = [
                    "Swedish",
                    "English",
                    "German"
                ];

                $scope.newExam = {
                    "created": null,
                    "creator": null,
                    "modified": null,
                    "modifier": null,
                    "course": {
                        "organisation": {
                            "name": null
                        },
                        "code": null,
                        "name": null,
                        "responsibleTeacher": null,
                        "type": null,
                        "credits": null
                    },
                    "name": "Kirjoita tentin nimi tähän",
                    "examType": null,
                    "instruction": "Kirjoita ohjeet tähän",
                    "shared": true,
                    "examSections": [],
                    "examEvent": null,
                    "state": "DRAFT"
                };

                $scope.newExamEvent = {
                    "examReadableStartDate": null,
                    "examReadableEndDate": null,
                    "examActiveStartDate": null,
                    "examActiveEndDate": null,
                    "room": null,
                    "duration": null,
                    "inspector": null,
                    "grading": null,
                    "language": null,
                    "answerLanguage": null,
                    "material": null,
                    "guidance": null
                };

                $scope.addNewSection = function () {
                    $scope.sections.push({
                        id: $scope.sections.length + 1,
                        hide: false,
                        name: $translate("section_default_name"),
                        questions: []
                    });

                };
                $scope.addNewSection();

                // Called when create exam button is clicked
                $scope.createExam = function () {
                    // Clear all section id's at this point to make a draft exam
                    angular.forEach($scope.sections, function (value, index) {
                        value.id = null;
                    })

                    $scope.newExam.examSections = $scope.sections;
                    $scope.newExam.examEvent = $scope.newExamEvent;

//                    $http.post('/exams/draft/')
//                        .success(function(data, status, headers, config) {
//                            $scope.doexam = data;
//                            $scope.activeSection = $scope.doexam.examSections[0];
//
//                            // Loop through all questions in the active section
//                            angular.forEach($scope.activeSection.questions, function(value, index) {
//                                if(!value.answer) {
//                                    // When question has not been answered it's status color is set to gray
//                                    // When an active exam is opened it cannot have any answers set
//                                    value.selectedAnsweredState = 'question-unanswered-header';
//                                    value.questionStatus = $translate("sitnet_question_unanswered");
//                                } else {
//                                    value.selectedAnsweredState = 'question-answered-header';
//                                    value.questionStatus = $translate("sitnet_question_answered");
//                                }
//                            })
//                        }).
//                        error(function(data, status, headers, config) {
//                            // called asynchronously if an error occurs
//                            // or server returns response with an error status.
//                        });

                    ExamRes.save($scope.newExam,  function (draftExam){
                        $location.path("/exams/"+draftExam.id);
                        toastr.info("Tenttiluonnos tehty.");
                    }, function(error) {
                        toastr.error("Jokin meni pieleen");
                    });
                }


                $scope.setExamRoom = function (room) {
                    $scope.newExamEvent.room = room;
                }

                $scope.setExamDuration = function (duration) {
                    $scope.newExamEvent.duration = duration;
                }

                $scope.setExamInspector = function (inspector) {
                    $scope.newExamEvent.inspector = inspector;
                }

                $scope.setExamGrading = function (grading) {
                    $scope.newExamEvent.grading = grading;
                }

                $scope.setExamLanguage = function (language) {
                    $scope.newExamEvent.language = language;
                }

                $scope.setExamAnswerLanguage = function (answerLanguage) {
                    $scope.newExamEvent.answerLanguage = answerLanguage;
                }

                var questions = QuestionRes.query(function () {
                    questions.map(function (item) {
                        var icon = "";
                        switch (item.type) {
                            case "MathQuestion":
                            case "MultipleChoiseQuestion":
                                icon = "fa-list-ol";
                                break;
                            case "EssayQuestion":
                                icon = "fa-edit";
                                break;
                            default:
                                icon = "fa-edit";
                                break;
                        }
                        item.icon = icon;
                    });
                    $scope.questions = questions;
                });

                $scope.contentTypes = ["aineistotyypit", "haettava", "kannasta", "Kaikki aineistotyypit - oletus"];
                $scope.libraryFilter = "";
                $scope.selected = undefined;

                $scope.toggleSection = function (section) {
                    section.icon = "";
                    section.hide = !section.hide;
                };

                $scope.removeSection = function (section) {
                    if (confirm('Poistetaanko osio?')) {
                        $scope.sections.splice($scope.sections.indexOf(section), 1);
                    }
                }

                $scope.clearAllQuestions = function (section) {
                    if (confirm('Poistetaanko kaikki kysymykset?')) {
                        section.questions.splice(0, questions.length);
                    }
                }

                $scope.removeQuestion = function (section, question) {
                    if (confirm('Poistetaanko kysymys?')) {
                        section.questions.splice(section.questions.indexOf(question), 1);
                    }
                }


                $scope.editSection = function (section) {
                    console.log(section);
                };

                $scope.toggleQuestion = function (question) {
                    question.hide = !question.hide;
                };

                $scope.editQuestion = function (question) {

                };

                $scope.editExam = function () {

                };

                // Called when Save button is clicked
                $scope.saveExam = function () {
                    $scope.newExam.examSections = $scope.sections;
                    $scope.newExamEvent.examReadableStartDate = $scope.dateService.modStartDate;
                    $scope.newExamEvent.examReadableEndDate = $scope.dateService.modEndDate;
                    $scope.newExam.examEvent = $scope.newExamEvent;

                    ExamRes.save($scope.newExam,  function (newExam){
                        toastr.info("Tentti tallennettu.");
                    }, function(error) {
                        toastr.error("Jokin meni pieleen");
                    });
                };

                // Called when a question is drag and dropped to a exam section
                $scope.onDrop = function ($event, $data, questions) {
                    if (angular.isArray($data)) {
                        questions.push.apply(questions, $data);
                        return;
                    }
                    questions.push($data);

                    var newQuestion = $data;
                    newQuestion.id = null;

                    angular.forEach(newQuestion.options, function (value, index) {
                        value.id = null;
                    })

                    QuestionRes.save(newQuestion, function (returnQuestion) {
                        newQuestion = returnQuestion;
                        toastr.info("Kysymys lisätty.");
                    }, function(error) {
                        toastr.error("Jokin meni pieleen: "+ error);
                    });
                };
            }]);
}());