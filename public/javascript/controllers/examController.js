(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamController', ['$scope', '$modal', 'sessionService', '$sce', '$routeParams', '$translate', '$http', '$location', 'SITNET_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'RoomResource', 'dateService',
            function ($scope, $modal, sessionService, $sce, $routeParams, $translate, $http, $location, SITNET_CONF, ExamRes, QuestionRes, UserRes, RoomResource, dateService) {

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
                else if ($scope.user.isAdmin) {
                    $scope.examsTemplate = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exams.html";
                }

                // Todo: Fill in rooms from database for final version

                $scope.examRooms = RoomResource.rooms.query();

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

                // Todo: Fill in gradings from database for final version
                $scope.examGradings = [
                    "0-5",
                    "Improbatur-Laudatur",
                    "Hyväksytty-Hylätty"
                ];

                // Todo: Fill in languages from database for final version
                $scope.examLanguages = [
                    "Suomi",
                    "Ruotsi",
                    "Englanti",
                    "Saksa"
                ];

                // Todo: Fill in languages from database for final version
                $scope.examAnswerLanguages = [
                    "Suomi",
                    "Ruotsi",
                    "Englanti",
                    "Saksa"
                ];

                $scope.examTypes = [
                    "Osasuoritus",
                    "Loppusuoritus",
                    "Kypsyysnäyte"
                ];

                if (($routeParams.id === undefined) && !$scope.user.isStudent)
                    $scope.exams = ExamRes.exams.query();
                else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.newExam = exam;

                            if ($scope.newExam.examLanguage === null) {
                                $scope.newExam.examLanguage = $scope.examLanguages[0];
                            }

                            if ($scope.newExam.answerLanguage === null) {
                                $scope.newExam.answerLanguage = $scope.examAnswerLanguages[0];
                            }

                            if ($scope.newExam.examType === null) {
                                // examtype id 2 is Final
                                ExamRes.examType.insert({eid: $scope.newExam.id, etid: 2}, function (updated_exam) {
                                	toastr.info("Tentti päivitetty.");
                                    $scope.newExam = updated_exam;
                                }, function (error) {
                                    toastr.error(error.data);
                                });
                            }

                            $scope.dateService.startDate = exam.examActiveStartDate;
                            $scope.dateService.endDate = exam.examActiveEndDate;

                            $scope.reindexNumbering();
                            getInspectors();
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.openInspectorModal = function () {

                    var exam = {
                        "id": $scope.newExam.id
                    }

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/exam-editor/exam_inspector.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ExamInspectionController",
                        resolve: {
                            exam: function () {
                                return exam;
                            }
                        }
                    });

                    modalInstance.result.then(function (inspectors) {
                        // OK button clicked
                        getInspectors ()
                    }, function () {
                        // Cancel button clicked
                    });
                }

                $scope.newSection = {
                    expanded: true,
                    name: $translate("sitnet_exam_section_default_name"),
                    questions: []
                };

                $scope.inspectors = {};

                function getInspectors () {
                    if($scope.newExam.id) {
                        ExamRes.inspections.get({id: $scope.newExam.id},
                            function (inspectors) {
                                $scope.inspectors = inspectors;
                            },
                            function (error) {
                                //toastr.error(error.data);
                            });
                    }
                }

                $scope.removeInspector = function(id) {
                    ExamRes.inspector.remove({id: id},
                        function (inspectors) {
                            getInspectors();
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
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
                            toastr.info("Uusi tentti luotu.");
                            $location.path("/exams/" + response.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.setExamRoom = function (room) {
                	
                    ExamRes.room.update({eid: $scope.newExam.id, rid: room.id}, function (exam) {
                    	$scope.newExam.room = room;
                    	toastr.info("Tentti päivitetty.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.setExamDuration = function (duration) {
                    // Todo: should make proper time selector in UI
                    $scope.newExam.duration = duration * 60;
                    $scope.updateExam();
                };

                $scope.setExamGrading = function (grading) {
                    $scope.newExam.grading = grading;
                    $scope.updateExam();
                };

                $scope.setExamLanguage = function (language) {
                    $scope.newExam.examLanguage = language;
                    $scope.updateExam();
                };

                $scope.setExamAnswerLanguage = function (answerLanguage) {
                    $scope.newExam.answerLanguage = answerLanguage;
                    $scope.updateExam();
                };

                $scope.setExamType = function (type) {
                    $scope.newExam.examType.type = type;
                    $scope.updateExam();
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
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.clearAllQuestions = function (section) {
                    if (confirm('Poistetaanko kaikki kysymykset?')) {
//                        section.questions.splice(0, questions.length);

                        ExamRes.clearsection.clear({sid: section.id}, function (sec) {
                            section = sec;
                            toastr.info("Kysymykset poistettu.");
                        }, function (error) {
                            toastr.error(error.data);
                        });

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
                    //console.log(section);
                };

                $scope.editQuestion = function (question) {
                    // Todo: Implement this
                };

                $scope.editExam = function () {
                    // Todo: Implement this
                };

                // Called from ui-blur
                $scope.updateExam = function (newExam) {

                        var examToSave = {
                            "id": $scope.newExam.id,
                            "name": $scope.newExam.name,
//                            "course": $scope.newExam.course,
                            "examType": $scope.newExam.examType,
                            "instruction": $scope.newExam.instruction,
                            "state": 'SAVED',
                            "shared": $scope.newExam.shared,
                            "examActiveStartDate": $scope.dateService.startTimestamp,
                            "examActiveEndDate": $scope.dateService.endTimestamp,
//                            "room": $scope.newExam.room,
                            "duration": $scope.newExam.duration,
                            "grading": $scope.newExam.grading,
                            "examLanguage": $scope.newExam.examLanguage,
                            "answerLanguage": $scope.newExam.answerLanguage,
                            "expanded": $scope.newExam.expanded
                        };

                        ExamRes.exams.update({id: $scope.newExam.id}, examToSave,
                            function (exam) {
                                toastr.info("Tentti tallennettu.");
                                $scope.newExam = exam;
                            }, function (error) {

                                toastr.error(error.data);
                            });
                };

                //Called when Preview Button is clicked
                $scope.previewExam = function () {
                    //First save the exam, so that
                    //we have something to preview
                    var examId = $routeParams.id;

                    var examToSave = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "instruction": $scope.newExam.instruction,
                        "state": 'SAVED',
//                        "course": $scope.newExam.course,    // there is no course
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": $scope.dateService.startTimestamp,
                        "examActiveEndDate": $scope.dateService.endTimestamp,
//                        "room": $scope.newExam.room,
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.grading,
                        "examLanguage": $scope.newExam.examLanguage,
                        "answerLanguage": $scope.newExam.answerLanguage,
                        "expanded": $scope.newExam.expanded
                    };

                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function (exam) {
                            toastr.info("Tentti tallennettu.");
                        }, function (error) {
                            toastr.error(error.data);
                        });

                    $location.path("/exams/preview/" + examId);

                }

                // Called when Save button is clicked
                $scope.saveExam = function () {

                    var examToSave = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "instruction": $scope.newExam.instruction,
                        "state": 'SAVED',
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": $scope.dateService.startTimestamp,
                        "examActiveEndDate": $scope.dateService.endTimestamp,
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.grading,
                        "examLanguage": $scope.newExam.examLanguage,
                        "answerLanguage": $scope.newExam.answerLanguage,
                        "expanded": $scope.newExam.expanded
                    };
                    
                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function (exam) {
                        toastr.info("Tentti tallennettu.");
                        $location.path("/exams");
                        }, function (error) {
                        toastr.error(error.data);
                    });

                };

                // Called when Save and Publish button is clicked
                $scope.saveAndPublishExam = function () {

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/exam-editor/exam_publish_dialog.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {

                        // OK button clicked

                        var examToSave = {
                            "id": $scope.newExam.id,
                            "name": $scope.newExam.name,
                            "instruction": $scope.newExam.instruction,
                            "state": 'PUBLISHED',
//                            "course": $scope.newExam.course,    // there is no course
                            "shared": $scope.newExam.shared,
                            "examActiveStartDate": $scope.dateService.startTimestamp,
                            "examActiveEndDate": $scope.dateService.endTimestamp,
//                            "room": $scope.newExam.room,
                            "duration": $scope.newExam.duration,
                            "grading": $scope.newExam.grading,
                            "examLanguage": $scope.newExam.examLanguage,
                            "answerLanguage": $scope.newExam.answerLanguage,
                            "expanded": $scope.newExam.expanded
                        };

                        ExamRes.exams.update({id: examToSave.id}, examToSave,
                            function (exam) {
                            toastr.success("Tentti tallennettu ja julkaistu");
                            $location.path("/exams");
                        }, function (error) {
                            toastr.error(error.data);
                        });

                    }, function (error) {
                        // Cancel button clicked
                    });

                };

                $scope.deleteExam = function (exam) {
                    if (confirm('Haluatko poistaa tentin lopullisesti?')) {

                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success("Tentti poistettu");
                            $scope.exams.splice($scope.exams.indexOf(exam), 1);

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

                    ExamRes.questions.insert({eid: $scope.newExam.id, sid: section.id, qid: $data.id}, function (section) {
                        toastr.info("Kysymys lisätty osioon.");
                    }, function (error) {
                        toastr.error(error.data);
                    });

                };

                //http://draptik.github.io/blog/2013/07/28/restful-crud-with-angularjs/
                $scope.createQuestionFromExamView = function (type, section) {
                    var newQuestion = {
                        type: type
                    }

                    QuestionRes.questions.create(newQuestion,
                        function (response) {
                            newQuestion = response;

                            $location.path("/questions/" + response.id + "/exam/" + $scope.newExam.id + "/section/" + section.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });


                }
                
                $scope.examFilter = function(item, comparator)
                {
                    return (item.state == comparator);
                };

                $scope.toggleLottery = function (section) {

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
                        section = sec;

//                        if( section.lotteryItemCount === undefined )
//                            section.lotteryItemCount = 1;

                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.updateLotteryCount = function (section) {

                    if (section.lotteryItemCount > section.questions.length) {
                        toastr.info("Arvonnassa ei voi olla enemmän kysymyksiä kuin osioon on lisättynä.");
                        section.lotteryItemCount = section.questions.length;
                    }

                    else if (section.lotteryItemCount < 1) {
                        toastr.info("Arvonnassa täytyy olla vähintään yksi kysymys.");
                        section.lotteryItemCount = section.questions.length;
                    }

                    else {
                        ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
                            section = sec;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                }

                $scope.selectFile = function () {


                    // Save exam first to not lose data.
                    // Can't use this, will redirect to exams page.
                    //$scope.saveExam();

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/exam-editor/dialog_exam_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        $location.path('/exams/'+ $scope.newExam.id);
                    }, function () {
                        // Cancel button
                    });
                };

                $scope.submit = function(exam) {

                    var file = $scope.attachmentFile;
                    var url = "attachment/exam";
                    //$scope.fileUpload.uploadAttachment(file, url);
                    var fd = new FormData();
                    fd.append('file', file);
                    fd.append('examId', exam.id);
                    $http.post(url, fd, {
                        transformRequest: angular.identity,
                        headers: {'Content-Type': undefined}
                    })
                        .success(function(){
                        })
                        .error(function(){
                        });
                }

                $scope.removeExamRoom = function() {
                    $scope.newExam.room = null;
                    $scope.updateExam($scope.newExam);
                }

            }]);
}());