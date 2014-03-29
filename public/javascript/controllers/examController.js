(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamController', ['$scope', '$sce', '$routeParams', '$translate', '$http', '$location', 'SITNET_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'dateService',
            function ($scope, $sce, $routeParams, $translate, $http, $location, SITNET_CONF, ExamRes, QuestionRes, UserRes, dateService) {

                $scope.dateService = dateService;

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "teacher/exam_section_general.html";
                $scope.libraryTemplate = SITNET_CONF.TEMPLATES_PATH + "library/library.html";
                $scope.examsTemplate;

                $scope.user = $scope.session.user;
                if ($scope.user.isStudent) {
                    $scope.examsTemplate = SITNET_CONF.TEMPLATES_PATH + "student/exams.html";
                }
                else if ($scope.user.isTeacher) {
                    $scope.examsTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/exams.html";
                }

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
                UserRes.usersByRole.query({role: 'TEACHER'}, 
                		function (value) {
                			$scope.examInspectors = value;
                		},
                		function (error) {
                			
                		});

//                $scope.examInspectors = [
//                                         "Pentti Hilkuri",
//                                         "Arvon Penaali",
//                                         "Pasi Kuikka"
//                                         ];
                
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
                    "instruction": null,
                    "shared": false,
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

                $scope.newSection = {
                    hide: false,
                    name: $translate("sitnet_exam_section_default_name"),
                    questions: []
                };

                if ($routeParams.id === undefined)
                    $scope.exams = ExamRes.exams.query();
                else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (value) {
                            $scope.newExam = value;
                        },
                        function (error) {
                            // error
                        }
                    );
                }

                $scope.addNewSection = function () {
                    ExamRes.sections.insertSection({eid: $scope.newExam.id}, $scope.newSection, function (section) {
                        toastr.success("Osio lisätty.");
                        $scope.newExam.examSections.push(section);
                    }, function (error) {
                        toastr.error("Jokin meni pieleen");
                    });
                };

                // Called when create exam button is clicked
                $scope.createExam = function () {

                    // first create an empty exam
                    ExamRes.exams.save($scope.newExam, function (draftExam) {
                        $scope.newExam = draftExam;

                        // now insert empty section into exam
                        ExamRes.sections.insertSection({eid: draftExam.id}, $scope.newSection, function (section) {
                            toastr.info("Osio lisätty.");
                        }, function (error) {
                            toastr.error("Jokin meni pieleen");
                        });

                        ExamRes.events.insertEvent({examId: draftExam.id}, $scope.newExamEvent, function (event) {
                            toastr.info("Event lisätty.");
                            $scope.newExam.examEvent = event;
                        }, function (error) {
                            toastr.error("Jokin meni pieleen");
                        });

                        $location.path("/exams/" + draftExam.id);
                        toastr.info("Tenttiluonnos tehty.");

                    }, function (error) {
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
                            case "MultipleChoiceQuestion":
                                icon = "fa-list-ol";
                                break;
                            case "EssayQuestion":
                                icon = "fa-edit";
                                break;
                            default:
                                icon = "fa-question-circle";
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

                        ExamRes.section.deleteSection({sectionId: section.id}, function (section) {
                            toastr.info("Osio poistettu.");
                            $scope.newExam.examSections.splice($scope.sections.indexOf(section), 1);

                        }, function (error) {
                            toastr.error("Jokin meni pieleen");
                        });
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
                    // Todo: Implement this
                };

                $scope.editExam = function () {
                    // Todo: Implement this
                };

                // Called when Save button is clicked
                $scope.saveExam = function () {
                    $scope.newExam.state = "PUBLISHED"
                    $scope.newExamEvent.examReadableStartDate = $scope.dateService.modStartDate;
                    $scope.newExamEvent.examReadableEndDate = $scope.dateService.modEndDate;

                    var examToSave = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "instruction": $scope.newExam.instruction,
                        "state": $scope.newExam.state,
                        "examEvent": $scope.newExam.examEvent,
                        "shared": $scope.newExam.shared
                    };

                    ExamRes.exams.update(examToSave, function (exam) {

                        toastr.info("Tentti tallennettu.");
                    }, function (error) {
                        toastr.error("Jokin meni pieleen");
                    });
                };

                // Called when a question is drag and dropped to a exam section
                $scope.onDrop = function ($event, $data, section) {
                    if (angular.isArray($data)) {
                        section.questions.push.apply(questions, $data);
                        return;
                    }
                    section.questions.push($data);

                    var newQuestion = $data;
                    newQuestion.id = null;

                    angular.forEach(newQuestion.options, function (value, index) {
                        value.id = null;
                    })

                    ExamRes.sections.insertSection({eid: $scope.newExam.id, sid: section.id}, newQuestion, function (section) {
                        toastr.info("Kysymys lisätty osioon.");
                    }, function (error) {
                        toastr.error("Jokin meni pieleen");
                    });
                };
            }]);
}());