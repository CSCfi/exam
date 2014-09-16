(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamController', ['$scope', '$modal', 'sessionService', '$sce', '$routeParams', '$translate', '$http', '$location', 'SITNET_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'RoomResource', 'SoftwareResource', 'dateService',
            function ($scope, $modal, sessionService, $sce, $routeParams, $translate, $http, $location, SITNET_CONF, ExamRes, QuestionRes, UserRes, RoomResource, SoftwareResource, dateService) {

                $scope.dateService = dateService;
                $scope.session = sessionService;

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "exam-editor/exam_section_general.html";
                $scope.libraryTemplate = SITNET_CONF.TEMPLATES_PATH + "library/library.html";
                $scope.examsTemplate = "";

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

                // SIT-367, temporarily removed Room selection from exam
//                $scope.examRooms = RoomResource.rooms.query();


                // Todo: Fill in durations from database for final version
                $scope.examDurations = [
                    "45",
                    "90",
                    "110",
                    "180"
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

                if (($routeParams.id === undefined) && !$scope.user.isStudent) {
                    $scope.exams = ExamRes.exams.query();
                } else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.newExam = exam;
                            $scope.softwaresUpdate = $scope.newExam.softwares.length;

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

                $scope.softwares = SoftwareResource.softwares.query();

                $scope.selectedSoftwares = function (exam) {
                    return exam.softwares.map(function (software) {
                        return software.name;
                    }).join(", ");
                };

                $scope.updateSoftwareInfo = function () {

                    if($scope.softwaresUpdate && $scope.newExam.softwares.length !== $scope.softwaresUpdate) {

                        ExamRes.machines.reset({eid: $scope.newExam.id});

                        angular.forEach($scope.newExam.softwares, function (software) {
                            ExamRes.machine.add({eid: $scope.newExam.id, sid: software.id});
                        });
                        toastr.info("Tentin ohjelmistot päivitetty.");
                        $scope.selectedSoftwares($scope.newExam);

                        $scope.softwaresUpdate = $scope.newExam.softwares.length;
                    }
                };

                $scope.openInspectorModal = function () {

                    var exam = {
                        "id": $scope.newExam.id
                    };

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
                        getInspectors ();
                    }, function () {
                        // Cancel button clicked
                    });
                };

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
                };

                $scope.reindexNumbering = function () {
                    // set sections and question nubering
                    angular.forEach($scope.newExam.examSections, function (section, index) {
                        section.index = index +1;

                        angular.forEach(section.questions, function (question, index) {
                            question.index = index +1;
                        });
                    });
                };

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
                    $scope.newExam.duration = duration;
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
                            "state": ($scope.newExam.state === 'PUBLISHED' ? 'PUBLISHED': 'SAVED'),
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
//                        "state": 'SAVED',
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

                        // if exam is already PUBLISHED save it as PUBLISHED
                        "state": ($scope.newExam.state === 'PUBLISHED' ? 'PUBLISHED': 'SAVED'),
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
//                        $location.path("/exams");
                        }, function (error) {
                        toastr.error(error.data);
                    });

                };

                // Called when Save and Publish button is clicked
                $scope.saveAndPublishExam = function () {

                    var err = $scope.publishSanityCheck($scope.newExam);
                    $scope.errors = err;
                    if(Object.getOwnPropertyNames(err).length != 0) {

                        var modalInstance = $modal.open({
                            templateUrl: 'assets/templates/dialogs/exam_publish_questions.html',
                            backdrop: 'static',
                            keyboard: true,
                            controller: function($scope, $modalInstance, errors){
                                 $scope.errors = errors;
                                $scope.ok = function(){
                                    $modalInstance.dismiss();
                                };
                            },
                            resolve: {
                                errors: function () {
                                    return $scope.errors;
                                }
                            }
                        });

                        return;
                    }

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

                $scope.countQuestions = function(exam) {

                    var count = 0;
                    angular.forEach(exam.examSections, function (section, index) {
                        count += section.questions.length;
                    });
                    return count;
                };

                $scope.publishSanityCheck = function(exam) {

                    var errors = {};

                    if(exam.course == null)
                        errors.course = "Opintojakso puuttuu";

                    if(exam.name == null || exam.name.length < 2)
                        errors.name = "Tentin nimi puuttuu, tai on liian lyhyt";

                    if($scope.dateService.startTimestamp == 0)
                        errors.examActiveStartDate = "Alkuaika puuttuu";

                    if($scope.dateService.endTimestamp == 0)
                        errors.examActiveEndDate = "Loppuaika puuttuu";

                    if($scope.countQuestions < 1)
                        errors.questions = "Tentissä ei ole yhtään kysymystä";

                    if(exam.duration == null || exam.duration < 1)
                        errors.duration = "Tentin kestoa ei ole määritelty";

                    if(exam.grading == null)
                        errors.grading = "Tentin arvosana-asteikkoa ei ole määritelty";

                    if(exam.examType == null)
                        errors.examType = "Tentin suoritustyyppiä ei ole määritelty";

                    return errors;
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
                            $scope.updateExam();
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );


                }

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
                        toastr.warning("Arvonnassa ei voi olla enemmän kysymyksiä kuin osioon on lisättynä.");
                        section.lotteryItemCount = section.questions.length;
                    }

                    else if (section.lotteryItemCount < 1) {
                        toastr.warning("Arvonnassa täytyy olla vähintään yksi kysymys.");
                        section.lotteryItemCount = 1;
                    }

                    else {
                        ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
                            section = sec;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.selectFile = function () {

                    // Save question before entering attachment to not lose data.
//                    $scope.saveQuestion();

                    var exam = $scope.newExam;

                    var ctrl = function ($scope, $modalInstance) {

                        $scope.newExam = exam;

                        $scope.submit = function (exam) {

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
                                .success(function (attachment) {
                                    $modalInstance.dismiss();
                                    exam.attachment = attachment;
                                })
                                .error(function (error) {
                                    $modalInstance.dismiss();
                                    toastr.error(error);
                                });
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/exam-editor/dialog_exam_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function (resp) {
                        // OK button
                        modalInstance.dismiss();
                        $location.path('/exams/'+ $scope.newExam.id);
                    }, function () {
                        modalInstance.dismiss();
                        // Cancel button
                    });
                };

                $scope.removeExamRoom = function() {
                    $scope.newExam.room = null;
                    $scope.updateExam($scope.newExam);
                };

                $scope.getSectionId = function (id) {

                    return document.getElementById(id).select();
                };

            }]);
}());