(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamController', ['$scope', 'sessionService', '$sce', '$routeParams', '$translate', '$http', '$location', 'SITNET_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'dateService',
            function ($scope, sessionService, $sce, $routeParams, $translate, $http, $location, SITNET_CONF, ExamRes, QuestionRes, UserRes, dateService) {

                $scope.dateService = dateService;
                $scope.session = sessionService;

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section_general.html";
                $scope.libraryTemplate = SITNET_CONF.TEMPLATES_PATH + "library/library.html";
                $scope.examsTemplate;

                $scope.user = $scope.session.user;
                if ($scope.user.isStudent) {
                    $scope.examsTemplate = SITNET_CONF.TEMPLATES_PATH + "student/exams.html";
                }
                else if ($scope.user.isTeacher) {
                    $scope.examsTemplate = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exams.html";
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
                    "state": "DRAFT"
                };


                $scope.newSection = {
                    expanded: true,
                    name: $translate("sitnet_exam_section_default_name"),
                    questions: []
                };

                if ($routeParams.id === undefined)
                    $scope.exams = ExamRes.exams.query();
                else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.newExam = exam;

                            $scope.reindexNumbering();
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.reindexNumbering = function () {
                    // set sections and question nubering
                    angular.forEach($scope.newExam.examSections, function (section, index) {
                        section.index = index +1;

                        angular.forEach(section.questions, function (question, index) {
                            question.index = index +1;
                        });
                    });
                }

                $scope.addNewSection = function () {
                    ExamRes.sections.insert({eid: $scope.newExam.id}, $scope.newSection, function (section) {
                        toastr.success("Osio lisätty.");
                        $scope.newExam.examSections.push(section);
                        $scope.reindexNumbering();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                // Called when create exam button is clicked
                $scope.createExam = function () {

                	ExamRes.draft.get( 
                		function (response) {
	                        toastr.info("Tenttiluonnos tehty.");
	                        $location.path("/exams/" + response.id);
		                }, function (error) {
		                    toastr.error(error.data);
		                });
                };

                $scope.setExamRoom = function (room) {
                    $scope.newExam.room = room;
                };

                $scope.setExamDuration = function (duration) {
                    $scope.newExam.duration = duration;
                };

                $scope.setExamInspector = function (inspector) {
                    $scope.newExam.inspector = inspector;
                };

                $scope.setExamGrading = function (grading) {
                    $scope.newExam.grading = grading;
                };

                $scope.setExamLanguage = function (language) {
                    $scope.newExam.examLanguage = language;
                };

                $scope.setExamAnswerLanguage = function (answerLanguage) {
                    $scope.newExam.answerLanguage = answerLanguage;
                };

                var questions = QuestionRes.questions.query(function () {
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
                    section.expanded = !section.expanded;
                };

                $scope.removeSection = function (section) {
                    if (confirm('Poistetaanko osio?')) {

                        ExamRes.sections.remove({eid: $scope.newExam.id, sid: section.id}, function (id) {
                            toastr.info("Osio poistettu.");
                            $scope.newExam.examSections.splice($scope.newExam.examSections.indexOf(section), 1);
                            $scope.reindexNumbering();

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.renameSection = function (section) {
                	
            		ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
            			section = sec;
            			toastr.info("Osio päivitetty.");
            		}, function (error) {
            			toastr.error(error.data);
            		});
                };

                $scope.expandSection = function (section) {

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
                        section = sec;
//                        toastr.info("Osio päivitetty.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.expandQuestion = function (question) {

                    var questionToUpdate = {
                        "id": question.id,
                        "type": question.type,
                        "expanded": question.expanded
                    };

                    QuestionRes.questions.update({id: questionToUpdate.id}, questionToUpdate, function (q) {
                        question = q;
//                        toastr.info("Osio päivitetty.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.clearAllQuestions = function (section) {
                    if (confirm('Poistetaanko kaikki kysymykset?')) {
                        section.questions.splice(0, questions.length);
                    }
                };

                $scope.removeQuestion = function (section, question) {
                    if (confirm('Poistetaanko kysymys?')) {
                        section.questions.splice(section.questions.indexOf(question), 1);
                        
                        ExamRes.questions.remove({eid: $scope.newExam.id, sid: section.id, qid: question.id}, function (sec) {
                        	section = sec;
                        	toastr.info("Kysymys poistettu.");
                        }, function (error) {
                            toastr.error(error.data);
                        });
                        
                        
                    }
                };

                $scope.editSection = function (section) {
                    console.log(section);
                };

//                $scope.Question = function (question) {
//                    question.hide = !question.hide;
//                };

                $scope.editQuestion = function (question) {
                    // Todo: Implement this
                };

                $scope.editExam = function () {
                    // Todo: Implement this
                };

                // Called when Save button is clicked
                $scope.saveExam = function () {

                    var examToSave = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "instruction": $scope.newExam.instruction,
                        "state": 'SAVED',
	                    "course": $scope.newExam.course,    // there is no course
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": $scope.dateService.startTimestamp,
                        "examActiveEndDate": $scope.dateService.endTimestamp,
                        "room": $scope.newExam.room,
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.grading,
                        "examLanguage": $scope.newExam.examLanguage,
                        "answerLanguage": $scope.newExam.answerLanguage,
                        "expanded": $scope.newExam.expanded
                    };
                    
                    ExamRes.exams.update({id: examToSave.id}, examToSave, function (exam) {
                        toastr.info("Tentti tallennettu.");
                    }, function (error) {
                        toastr.error(error.data);
                    });

                };

                // Called when Save and publish button is clicked
                $scope.saveAndPublishExam = function () {
                    if (confirm('Oletko varma että haluat julkaista tentin?\nTämän jälkeen '+
                    		'opeskelijat voivat osallistua tenttiin eikä tenttiä voi enää muokata.')) {

                        var examToSave = {
                            "id": $scope.newExam.id,
                            "name": $scope.newExam.name,
                            "instruction": $scope.newExam.instruction,
                            "state": 'PUBLISHED',
                            "course": $scope.newExam.course,    // there is no course
                            "shared": $scope.newExam.shared,
                            "examActiveStartDate": $scope.dateService.startTimestamp,
                            "examActiveEndDate": $scope.dateService.endTimestamp,
                            "room": $scope.newExam.room,
                            "duration": $scope.newExam.duration,
                            "grading": $scope.newExam.grading,
                            "examLanguage": $scope.newExam.examLanguage,
                            "answerLanguage": $scope.newExam.answerLanguage
                        };

                        ExamRes.exams.update({id: examToSave.id}, examToSave, function (exam) {
                            toastr.success("Tentti tallennettu ja julkaistu");
                        }, function (error) {
                            toastr.error(error.data);
                        });
                	}
                };
                
                // Called when a question is drag and dropped to a exam section
                $scope.onDrop = function ($event, $data, section) {
                    if (angular.isArray($data)) {
                        section.questions.push.apply(questions, $data);
                        return;
                    }
                    section.questions.push($data);

//                    var newQuestion = $data;
//                    newQuestion.id = null;
//
//                    angular.forEach(newQuestion.options, function (value, index) {
//                        value.id = null;
//                    });

                    ExamRes.questions.insert({eid: $scope.newExam.id, sid: section.id, qid: $data.id}, function (section) {
                        toastr.info("Kysymys lisätty osioon.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                    
                    
//                    ExamRes.sections.insertSection({eid: $scope.newExam.id, sid: section.id}, newQuestion, function (section) {
//                    	toastr.info("Kysymys lisätty osioon.");
//                    }, function (error) {
//                    	toastr.error(error.data);
//                    });
                };
                
                $scope.examFilter = function(item, comparator)
                {
                    return (item.state == comparator);
                };
                
            }]);
}());