(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamController', ['$scope', '$modal', 'sessionService', '$sce', '$routeParams', '$translate', '$http', '$location', 'SITNET_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'LanguageRes', 'RoomResource', 'SoftwareResource', 'DragDropHandler', 'SettingsResource', 'dateService',
            function($scope, $modal, sessionService, $sce, $routeParams, $translate, $http, $location, SITNET_CONF, ExamRes, QuestionRes, UserRes, LanguageRes, RoomResource, SoftwareResource, DragDropHandler, SettingsResource, dateService) {

                $scope.dateService = dateService;
                $scope.session = sessionService;

                $scope.newExam = {};

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

                // dynamic tab index - - -
                var setExamTabs = function() {

                    var tabindex = 1;
                    var tabs = angular.element('input,select,li,button,.dropdown-menu.a,span.create-new,a');
                    if (tabs) {
                        angular.forEach(tabs, function(element) {
                            if (element.type != "hidden") {
                                angular.element(element).attr("tabindex", tabindex);
                                tabindex++;
                                console.log(element);

                            }
                        });
                    }
                };

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

                LanguageRes.languages.query(function(languages) {
                    $scope.examLanguages = languages.map(function(language) {
                        language.name = getLanguageNativeName(language.code);
                        return language;
                    });
                });

                $scope.examTypes = [
                    "Osasuoritus",
                    "Loppusuoritus"
                ];

                if (($routeParams.id === undefined) && !$scope.user.isStudent) {
                    $scope.exams = ExamRes.exams.query();
                } else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function(exam) {
                            $scope.newExam = exam;
                            $scope.softwaresUpdate = $scope.newExam.softwares.length;
                            $scope.languagesUpdate = $scope.newExam.examLanguages.length;
                            $scope.dateService.startDate = exam.examActiveStartDate;
                            $scope.dateService.endDate = exam.examActiveEndDate;

                            $scope.reindexNumbering();
                            getInspectors();
                            //setExamTabs(); not working
                        },
                        function(error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.hostname = SettingsResource.hostname.get();

                $scope.softwares = SoftwareResource.softwares.query();

                $scope.selectedSoftwares = function(exam) {
                    return exam.softwares.map(function(software) {
                        return software.name;
                    }).join(", ");
                };

                $scope.selectedLanguages = function(exam) {
                    return exam.examLanguages.map(function(language) {
                        return getLanguageNativeName(language.code);
                    }).join(", ");
                };

                $scope.updateSoftwareInfo = function() {

                    if ($scope.newExam.softwares.length !== $scope.softwaresUpdate) {

                        ExamRes.machines.reset({eid: $scope.newExam.id});

                        angular.forEach($scope.newExam.softwares, function(software) {
                            ExamRes.machine.add({eid: $scope.newExam.id, sid: software.id});
                        });
                        toastr.info($translate('sitnet_exam_software_updated'));
                        $scope.selectedSoftwares($scope.newExam);

                        $scope.softwaresUpdate = $scope.newExam.softwares.length;
                    }
                };

                $scope.updateExamLanguages = function() {

                    if ($scope.newExam.examLanguages.length !== $scope.languagesUpdate) {

                        ExamRes.languages.reset({eid: $scope.newExam.id});

                        angular.forEach($scope.newExam.examLanguages, function(language) {
                            ExamRes.language.add({eid: $scope.newExam.id, code: language.code});
                        });
                        toastr.info($translate('sitnet_exam_language_updated'));
                        $scope.selectedLanguages($scope.newExam);

                        $scope.languagesUpdate = $scope.newExam.softwares.length;
                    }
                };

                $scope.openInspectorModal = function() {

                    var exam = {
                        "id": $scope.newExam.id
                    };

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/exam-editor/exam_inspector.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ExamInspectionController",
                        resolve: {
                            exam: function() {
                                return exam;
                            }
                        }
                    });

                    modalInstance.result.then(function(inspectors) {
                        // OK button clicked
                        getInspectors();
                    }, function() {
                        // Cancel button clicked
                    });
                };

                $scope.newSection = {
                    expanded: true,
                    name: $translate("sitnet_exam_section_default_name"),
                    questions: []
                };

                $scope.inspectors = {};

                function getInspectors() {
                    if ($scope.newExam.id) {
                        ExamRes.inspections.get({id: $scope.newExam.id},
                            function(inspectors) {
                                $scope.inspectors = inspectors;
                            },
                            function(error) {
                                //toastr.error(error.data);
                            });
                    }
                }

                $scope.removeInspector = function(id) {
                    ExamRes.inspector.remove({id: id},
                        function(inspectors) {
                            getInspectors();
                        },
                        function(error) {
                            toastr.error(error.data);
                        });
                };

                $scope.reindexNumbering = function() {
                    // set sections and question numbering
                    angular.forEach($scope.newExam.examSections, function(section, index) {
                        section.index = index + 1;

                        angular.forEach(section.sectionQuestions, function(sectionQuestion, index) {
                            sectionQuestion.question.index = index + 1; // FIXME
                        });
                    });
                };

                $scope.addNewSection = function() {

                    var index = $scope.newExam.examSections.length + 1;
                    $scope.newSection.name = $translate("sitnet_exam_section_default_name") + " " + index;

                    ExamRes.sections.insert({eid: $scope.newExam.id}, $scope.newSection, function(section) {
                        toastr.success($translate('sitnet_section_added'));
                        $scope.newExam.examSections.push(section);
                        $scope.reindexNumbering();
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                // Called when create exam button is clicked
                $scope.createExam = function() {

                    ExamRes.draft.get(
                        function(response) {
                            toastr.info($translate("sitnet_exam_added"));
                            $location.path("/exams/" + response.id);
                        }, function(error) {
                            toastr.error(error.data);
                        });
                };

                $scope.setExamRoom = function(room) {

                    ExamRes.room.update({eid: $scope.newExam.id, rid: room.id}, function(exam) {
                        $scope.newExam.room = room;
                        toastr.info($translate("sitnet_exam_updated"));
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                $scope.setExamDuration = function(duration) {
                    // Todo: should make proper time selector in UI
                    $scope.newExam.duration = duration;
                    $scope.updateExam();
                };

                $scope.checkDuration = function(duration) {
                    if (duration && $scope.newExam && "duration" in $scope.newExam) {
                        return $scope.newExam.duration === duration ? "btn-primary" : "";
                    }
                    return "";
                };

                $scope.checkGrading = function(grading) {
                    if (grading && $scope.newExam && "grading" in $scope.newExam) {
                        return $scope.newExam.grading === grading ? "btn-primary" : "";
                    }
                    return "";
                };

                $scope.checkType = function(type) {
                    if (type && $scope.newExam.examType && "type" in $scope.newExam.examType) {
                        return $scope.newExam.examType.type === type ? "btn-primary" : "";
                    }
                    return "";
                };

                $scope.setExamGrading = function(grading) {
                    $scope.newExam.grading = grading;
                    $scope.updateExam();
                };

                $scope.setExamType = function(type) {
                    $scope.newExam.examType.type = type;
                    $scope.updateExam();
                };

                $scope.contentTypes = ["aineistotyypit", "haettava", "kannasta", "Kaikki aineistotyypit - oletus"];
                $scope.libraryFilter = "";
                $scope.selected = undefined;

                $scope.toggleSection = function(section) {
                    section.icon = "";
                    section.expanded = !section.expanded;
                };

                $scope.removeSection = function(section) {
                    if (confirm($translate('sitnet_remove_section'))) {

                        ExamRes.sections.remove({eid: $scope.newExam.id, sid: section.id}, function(id) {
                            toastr.info($translate("sitnet_section_removed"));
                            $scope.newExam.examSections.splice($scope.newExam.examSections.indexOf(section), 1);
                            $scope.reindexNumbering();

                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.renameSection = function(section) {

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function(sec) {
                        section = sec;
                        toastr.info($translate("sitnet_section_updated"));
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                $scope.expandSection = function(section) {

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function(sec) {
                        section = sec;
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                $scope.clearAllQuestions = function(section) {
                    if (confirm($translate('sitnet_remove_all_questions'))) {
                        ExamRes.clearsection.clear({sid: section.id}, function() {
                            section.sectionQuestions.splice(0, section.sectionQuestions.length);
                            toastr.info($translate("sitnet_all_questions_removed"));
                        }, function(error) {
                            toastr.error(error.data);
                        });

                    }
                };

                $scope.removeQuestion = function(section, sectionQuestion) {
                    if (confirm($translate('sitnet_remove_question'))) {
                        ExamRes.questions.remove({eid: $scope.newExam.id, sid: section.id, qid: sectionQuestion.question.id}, function() {
                            section.sectionQuestions.splice(section.sectionQuestions.indexOf(sectionQuestion), 1);
                            toastr.info($translate("sitnet_question_removed"));
                            if (section.sectionQuestions.length < 2 && section.lotteryOn) {
                                // turn off lottery
                                section.lotteryOn = false;
                                section.lotteryItemCount = 1;
                                ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section);
                            }
                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.updateExam = function(newExam) {

                    var examToSave = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "examType": $scope.newExam.examType,
                        "instruction": $scope.newExam.instruction,
                        "enrollInstruction": $scope.newExam.enrollInstruction,
                        "state": $scope.newExam.state,
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": $scope.dateService.startTimestamp,
                        "examActiveEndDate": $scope.dateService.endTimestamp,
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.grading,
                        "expanded": $scope.newExam.expanded
                    };

                    ExamRes.exams.update({id: $scope.newExam.id}, examToSave,
                        function(exam) {
                            toastr.info($translate("sitnet_exam_saved"));
                            $scope.newExam = exam;
                        }, function(error) {
                            if (error.data.indexOf("sitnet_error_") > 0) {
                                toastr.error($translate(error.data));
                            } else {
                                toastr.error(error.data);
                            }
                        });
                };

                //Called when Preview Button is clicked
                $scope.previewExam = function() {
                    //First save the exam, so that
                    //we have something to preview
                    var examId = $routeParams.id;

                    var examToSave = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "instruction": $scope.newExam.instruction,
                        "enrollInstruction": $scope.newExam.enrollInstruction,
//                        "state": 'SAVED',
//                        "course": $scope.newExam.course,    // there is no course
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": $scope.dateService.startTimestamp,
                        "examActiveEndDate": $scope.dateService.endTimestamp,
//                        "room": $scope.newExam.room,
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.grading,
                        "expanded": $scope.newExam.expanded
                    };

                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function(exam) {
                            toastr.info($translate("sitnet_exam_saved"));
                        }, function(error) {
                            toastr.error(error.data);
                        });

                    $location.path("/exams/preview/" + examId);

                };

                // Called when Save button is clicked
                $scope.saveExam = function() {
                    if ($scope.newExam.examLanguages.length == 0) {
                        toastr.error($translate('sitnet_error_exam_empty_exam_language'));
                        return;
                    }
                    var newState = $scope.newExam.state === 'PUBLISHED' ? 'PUBLISHED' : 'SAVED';

                    var examToSave = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "instruction": $scope.newExam.instruction,
                        "enrollInstruction": $scope.newExam.enrollInstruction,

                        // if exam is already PUBLISHED save it as PUBLISHED
                        "state": newState,
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": $scope.dateService.startTimestamp,
                        "examActiveEndDate": $scope.dateService.endTimestamp,
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.grading,
                        "expanded": $scope.newExam.expanded
                    };

                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function(exam) {
                            toastr.info($translate("sitnet_exam_saved"));
                            $scope.newExam.state = newState;
//                        $location.path("/exams");
                        }, function(error) {
                            toastr.error(error.data);
                        });
                };

                $scope.unpublishExam = function() {
                    ExamRes.examEnrolments.query({eid: $scope.newExam.id}, function(enrolments) {
                        if (enrolments.length > 0) {
                            toastr.warning($translate('sitnet_unpublish_not_possible'));
                        } else {
                            var modalInstance = $modal.open({
                                templateUrl: 'assets/templates/exam-editor/exam_unpublish_dialog.html',
                                backdrop: 'static',
                                keyboard: true,
                                controller: "ModalInstanceCtrl"
                            });

                            modalInstance.result.then(function() {
                                var examToSave = {
                                    "id": $scope.newExam.id,
                                    "name": $scope.newExam.name,
                                    "instruction": $scope.newExam.instruction,
                                    "enrollInstruction": $scope.newExam.enrollInstruction,
                                    "state": 'SAVED',
//                            "course": $scope.newExam.course,    // there is no course
                                    "shared": $scope.newExam.shared,
                                    "examActiveStartDate": $scope.dateService.startTimestamp,
                                    "examActiveEndDate": $scope.dateService.endTimestamp,
//                            "room": $scope.newExam.room,
                                    "duration": $scope.newExam.duration,
                                    "grading": $scope.newExam.grading,
                                    "expanded": $scope.newExam.expanded
                                };

                                ExamRes.exams.update({id: examToSave.id}, examToSave,
                                    function(exam) {
                                        toastr.success($translate("sitnet_exam_unpublished"));
                                        $scope.newExam = exam;
                                    }, function(error) {
                                        toastr.error(error.data);
                                    });

                            }, function(error) {
                                // Cancel button clicked
                            });
                        }
                    });
                };


                // Called when Save and Publish button is clicked
                $scope.saveAndPublishExam = function() {

                    var err = $scope.publishSanityCheck($scope.newExam);
                    $scope.errors = err;
                    if (Object.getOwnPropertyNames(err).length != 0) {

                        $modal.open({
                            templateUrl: 'assets/templates/dialogs/exam_publish_questions.html',
                            backdrop: 'static',
                            keyboard: true,
                            controller: function($scope, $modalInstance, errors) {
                                $scope.errors = errors;
                                $scope.ok = function() {
                                    $modalInstance.dismiss();
                                };
                            },
                            resolve: {
                                errors: function() {
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

                    modalInstance.result.then(function() {

                        // OK button clicked

                        var examToSave = {
                            "id": $scope.newExam.id,
                            "name": $scope.newExam.name,
                            "instruction": $scope.newExam.instruction,
                            "enrollInstruction": $scope.newExam.enrollInstruction,
                            "state": 'PUBLISHED',
//                            "course": $scope.newExam.course,    // there is no course
                            "shared": $scope.newExam.shared,
                            "examActiveStartDate": $scope.dateService.startTimestamp,
                            "examActiveEndDate": $scope.dateService.endTimestamp,
//                            "room": $scope.newExam.room,
                            "duration": $scope.newExam.duration,
                            "grading": $scope.newExam.grading,
                            "expanded": $scope.newExam.expanded
                        };

                        ExamRes.exams.update({id: examToSave.id}, examToSave,
                            function(exam) {
                                toastr.success($translate("sitnet_exam_saved_and_published"));
                                $location.path("/exams");
                            }, function(error) {
                                toastr.error(error.data);
                            });

                    }, function(error) {
                        // Cancel button clicked
                    });

                };

                $scope.countQuestions = function(exam) {

                    var count = 0;
                    angular.forEach(exam.examSections, function(section, index) {
                        count += section.sectionQuestions.length;
                    });
                    return count;
                };

                $scope.publishSanityCheck = function(exam) {

                    var errors = {};

                    if (exam.course == null) {
                        errors.course = $translate("sitnet_course_missing");
                    }

                    if (exam.name == null || exam.name.length < 2) {
                        errors.name = $translate('sitnet_exam_name_missing_or_too_short');
                    }

                    if ($scope.newExam.examLanguages.length == 0) {
                        errors.name = $translate('sitnet_error_exam_empty_exam_language');
                    }

                    if ($scope.dateService.startTimestamp == 0) {
                        errors.examActiveStartDate = $translate('sitnet_exam_start_date_missing');
                    }

                    if ($scope.dateService.endTimestamp == 0) {
                        errors.examActiveEndDate = $translate('sitnet_exam_end_date_missing');
                    }

                    if ($scope.countQuestions < 1) {
                        errors.questions = $translate('sitnet_exam_has_no_questions');
                    }

                    if (exam.duration == null || exam.duration < 1) {
                        errors.duration = $translate('sitnet_exam_duration_missing');
                    }

                    if (exam.grading == null) {
                        errors.grading = $translate('sitnet_exam_grade_scale_missing');
                    }

                    if (exam.examType == null) {
                        errors.examType = $translate('sitnet_exam_credit_type_missing');
                    }

                    return errors;
                };

                // TODO: this controller should be split on a per-view basis to avoid having this kind of duplication

                $scope.deleteExam = function(exam) {
                    if (confirm($translate('sitnet_remove_exam'))) {

                        ExamRes.exams.remove({id: exam.id}, function(ex) {
                            toastr.success($translate('sitnet_exam_removed'));
                            $scope.exams.splice($scope.exams.indexOf(exam), 1);

                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.cancelNewExam = function(exam) {
                    if (confirm($translate('sitnet_remove_exam'))) {

                        ExamRes.exams.remove({id: exam.id}, function(ex) {
                            toastr.success($translate('sitnet_exam_removed'));
                            $location.path('/exams/');
                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.moveQuestion = function(section, from, to) {
                    DragDropHandler.moveObject(section.sectionQuestions, from, to);
                    ExamRes.reordersection.update({eid: $scope.newExam.id, sid: section.id, from: from, to: to}, function() {
                        toastr.info("Questions reordered");
                    });
                };

                $scope.insertQuestion = function(section, object, to) {
                    var question = angular.copy(object);
                    var sectionQuestion = {question: question};
                    ExamRes.sectionquestions.insert({eid: $scope.newExam.id, sid: section.id, seq: to, qid: question.id}, function(sec) {
                            DragDropHandler.addObject(sectionQuestion, section.sectionQuestions, to)
                            toastr.info($translate("sitnet_question_added"));
                            section = sec;
                            $scope.updateExam();
                        }, function(error) {
                            toastr.error(error.data);
                        }
                    );
                };

                //http://draptik.github.io/blog/2013/07/28/restful-crud-with-angularjs/
                $scope.createQuestionFromExamView = function(type, section) {
                    var newQuestion = {
                        type: type
                    };

                    QuestionRes.questions.create(newQuestion,
                        function(response) {
                            newQuestion = response;
                            var nextSeq;
                            if (section.sectionQuestions.length == 0) {
                                nextSeq = 0;
                            } else {
                                nextSeq = Math.max.apply(Math, section.sectionQuestions.map(function(s) {
                                    return s.sequenceNumber;
                                })) + 1;
                            }
                            $location.path("/questions/" + response.id + "/exam/" + $scope.newExam.id + "/section/" + section.id + "/sequence/" + nextSeq);
                        }, function(error) {
                            toastr.error(error.data);
                        });


                };

                $scope.examFilter = function(item, comparator) {
                    return (item.state == comparator);
                };

                $scope.toggleLottery = function(section) {
                    if (section.sectionQuestions.length > 1) {
                        section.lotteryOn = !section.lotteryOn;
                        ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section,
                            function(sec) {
                                section = sec;

                                if (section.lotteryItemCount === undefined) {
                                    section.lotteryItemCount = 1;
                                }

                            }, function(error) {
                                toastr.error(error.data);
                            });
                    }
                };

                $scope.updateLotteryCount = function(section) {

                    if (section.lotteryItemCount == undefined || section.lotteryItemCount == 0) {
                        toastr.warning($translate("sitnet_warn_lottery_count"));
                        section.lotteryItemCount = section.lotteryItemCount == 0 ? 1 : section.sectionQuestions.length;
                    }
                    else {
                        ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function(sec) {
                            section = sec;
                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.printExamDuration = function(exam) {

                    if (exam && exam.duration) {
                        var h = 0;
                        var d = exam.duration;

                        while (d > 0) {
                            if (d - 60 >= 0) {
                                h++;
                                d = d - 60;
                            } else {
                                break;
                            }
                        }
                        if (h === 0) {
                            return d + "min";
                        } else if (d === 0) {
                            return h + "h ";
                        } else {
                            return h + "h " + d + "min";
                        }
                    } else {
                        return "";
                    }
                };


                $scope.selectFile = function() {

                    // Save question before entering attachment to not lose data.
//                    $scope.saveQuestion();

                    var exam = $scope.newExam;

                    var ctrl = function($scope, $modalInstance) {

                        $scope.newExam = exam;

                        $scope.submit = function(exam) {

                            var file = $scope.attachmentFile;
                            if (file === undefined) {
                                toastr.error($translate("sitnet_attachment_not_chosen"));
                                return;
                            }
                            var url = "attachment/exam";
                            //$scope.fileUpload.uploadAttachment(file, url);
                            var fd = new FormData();
                            fd.append('file', file);
                            fd.append('examId', exam.id);
                            $http.post(url, fd, {
                                transformRequest: angular.identity,
                                headers: {'Content-Type': undefined}
                            })
                                .success(function(attachment) {
                                    $modalInstance.dismiss();
                                    exam.attachment = attachment;
                                })
                                .error(function(error) {
                                    $modalInstance.dismiss();
                                    toastr.error(error);
                                });
                        };
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function() {
                            $modalInstance.dismiss("Cancelled");
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/exam-editor/dialog_exam_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function() {
                        // OK button
                        modalInstance.dismiss();
                        $location.path('/exams/' + $scope.newExam.id);
                    });
                };

                $scope.removeExamRoom = function() {
                    $scope.newExam.room = null;
                    $scope.updateExam($scope.newExam);
                };

                $scope.getSectionId = function(id) {

                    return document.getElementById(id).select();
                };

            }]);
}());