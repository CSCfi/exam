(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamController', ['$scope', '$timeout', '$rootScope', '$q', '$anchorScroll', '$modal', 'sessionService', 'examService', '$routeParams', '$translate', '$http', '$location', 'SITNET_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'LanguageRes', 'RoomResource', 'SoftwareResource', 'DragDropHandler', 'SettingsResource',
            function ($scope, $timeout, $rootScope, $q, $anchorScroll, $modal, sessionService, examService, $routeParams, $translate, $http, $location, SITNET_CONF, ExamRes, QuestionRes, UserRes, LanguageRes, RoomResource, SoftwareResource, DragDropHandler, SettingsResource) {

                $scope.newExam = {};

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "exam/editor/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "exam/editor/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "exam/editor/exam_section_general.html";
                $scope.libraryTemplate = SITNET_CONF.TEMPLATES_PATH + "question/library.html";
                $scope.selectCourseTemplate = SITNET_CONF.TEMPLATES_PATH + "exam/editor/exam_section_general_course_select.html";
                $scope.examsTemplate = "";
                $scope.examTypes = [];
                $scope.gradeScale = {};

                $scope.user = sessionService.getUser();

                $rootScope.$on('$routeChangeSuccess', function (newRoute, oldRoute) {
                    $timeout(function () {
                        var scrollTo = $routeParams.scrollTo;
                        if (scrollTo) {
                            var old = $location.hash();
                            $location.hash(scrollTo);
                            $anchorScroll();
                            $location.hash(old);
                        }
                    }, 1000);
                });

                if ($scope.user.isStudent) {
                    $scope.examsTemplate = SITNET_CONF.TEMPLATES_PATH + "exam/student/exams.html";
                }
                else {
                    $scope.examsTemplate = SITNET_CONF.TEMPLATES_PATH + "exam/editor/exams.html";
                }

                SettingsResource.examDurations.get(function (data) {
                    $scope.examDurations = data.examDurations;
                });

                SettingsResource.gradeScale.get(function (data) {
                    $scope.gradeScale = data;
                });

                LanguageRes.languages.query(function (languages) {
                    $scope.examLanguages = languages.map(function (language) {
                        language.name = getLanguageNativeName(language.code);
                        return language;
                    });
                });

                var refreshExamTypes = function () {
                    examService.refreshExamTypes().then(function (types) {
                        $scope.examTypes = types;
                    });
                };
                var refreshGradeScales = function () {
                    examService.refreshGradeScales().then(function (scales) {
                        $scope.examGradings = scales;
                    });
                };
                refreshExamTypes();
                refreshGradeScales();

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                    refreshGradeScales();
                });

                var initializeExam = function(){
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.newExam = exam;
                            $scope.newExam.examLanguages.forEach(function (language) {
                                // Use front-end language names always to allow for i18n etc
                                language.name = getLanguageNativeName(language.code);
                            });
                            $scope.softwaresUpdate = exam.softwares ? exam.softwares.length : 0;
                            $scope.languagesUpdate = exam.examLanguages ? exam.examLanguages.length : 0;
                            // Set exam grade scale from course default if not specifically set for exam
                            if (!exam.gradeScale && exam.course && exam.course.gradeScale) {
                                $scope.newExam.gradeScale = exam.course.gradeScale;
                                $scope.newExam.gradeScale.name = examService.getScaleDisplayName(
                                    $scope.newExam.course.gradeScale.description);
                            } else if (exam.gradeScale) {
                                $scope.newExam.gradeScale.name = examService.getScaleDisplayName(exam.gradeScale);
                            }
                            $scope.reindexNumbering();
                            getInspectors();
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                if (!$routeParams.id && !$scope.user.isStudent) {
                    $scope.exams = ExamRes.exams.query();
                } else {
                    initializeExam();
                }

                $scope.hostname = SettingsResource.hostname.get();

                $scope.softwares = SoftwareResource.softwares.query();

                $scope.selectedSoftwares = function (exam) {
                    return exam.softwares.map(function (software) {
                        return software.name;
                    }).join(", ");
                };

                $scope.selectedLanguages = function (exam) {
                    return exam.examLanguages.map(function (language) {
                        return getLanguageNativeName(language.code);
                    }).join(", ");
                };

                $scope.updateSoftwareInfo = function () {

                    if ($scope.newExam.softwares.length !== $scope.softwaresUpdate) {

                        ExamRes.softwares.reset({eid: $scope.newExam.id}, function () {
                            var promises = [];
                            angular.forEach($scope.newExam.softwares, function (software) {
                                promises.push(ExamRes.software.add({eid: $scope.newExam.id, sid: software.id}));
                            });
                            $q.all(promises).then(function () {
                                toastr.info($translate('sitnet_exam_software_updated'));
                                $scope.selectedSoftwares($scope.newExam);

                                $scope.softwaresUpdate = $scope.newExam.softwares.length;
                            });
                        });
                    }
                };

                $scope.updateExamLanguages = function () {

                    if ($scope.newExam.examLanguages.length !== $scope.languagesUpdate) {

                        ExamRes.languages.reset({eid: $scope.newExam.id}, function () {
                            var promises = [];
                            angular.forEach($scope.newExam.examLanguages, function (language) {
                                promises.push(ExamRes.language.add({eid: $scope.newExam.id, code: language.code}));
                            });
                            $q.all(promises).then(function () {
                                toastr.info($translate('sitnet_exam_language_updated'));
                                $scope.selectedLanguages($scope.newExam);
                                $scope.languagesUpdate = $scope.newExam.examLanguages.length;
                            });
                        });
                    }
                };

                $scope.openInspectorModal = function () {

                    var exam = {
                        "id": $scope.newExam.id
                    };

                    var modalInstance = $modal.open({
                        templateUrl: SITNET_CONF.TEMPLATES_PATH + 'exam/editor/exam_inspector.html',
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
                        getInspectors();
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

                function getInspectors() {
                    if ($scope.newExam.id) {
                        ExamRes.inspections.get({id: $scope.newExam.id},
                            function (inspectors) {
                                $scope.inspectors = inspectors;
                            },
                            function (error) {
                                //toastr.error(error.data);
                            });
                    }
                }

                $scope.removeInspector = function (id) {
                    ExamRes.inspector.remove({id: id},
                        function (inspectors) {
                            getInspectors();
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.reindexNumbering = function () {
                    // set sections and question numbering
                    angular.forEach($scope.newExam.examSections, function (section, index) {
                        section.index = index + 1;

                        angular.forEach(section.sectionQuestions, function (sectionQuestion, index) {
                            sectionQuestion.question.index = index + 1; // FIXME
                        });
                    });
                };

                $scope.addNewSection = function () {

                    var index = $scope.newExam.examSections.length + 1;
                    $scope.newSection.name = $translate("sitnet_exam_section_default_name") + " " + index;

                    ExamRes.sections.insert({eid: $scope.newExam.id}, $scope.newSection, function (section) {
                        toastr.success($translate('sitnet_section_added'));
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
                            toastr.info($translate("sitnet_exam_added"));
                            $location.path("/exams/addcourse/" + response.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.continueToExam = function () {
                    $location.path("/exams/" + $routeParams.id);
                };

                $scope.setExamDuration = function (duration) {
                    // Todo: should make proper time selector in UI
                    $scope.newExam.duration = duration;
                    $scope.updateExam();
                };

                $scope.checkDuration = function (duration) {
                    if (!$scope.newExam.duration) return "";
                    return $scope.newExam.duration === duration ? "btn-primary" : "";
                };

                $scope.checkGrading = function (grading) {
                    if (!$scope.newExam.gradeScale) {
                        return "";
                    }
                    return $scope.newExam.gradeScale.id === grading.id ? "btn-primary" : "";
                };

                $scope.checkType = function (type) {
                    if (!$scope.newExam.examType) return "";
                    return $scope.newExam.examType.type === type ? "btn-primary" : "";
                };

                $scope.setExamGrading = function (grading) {
                    $scope.newExam.gradeScale = grading;
                    $scope.updateExam();
                };

                $scope.setExamType = function (type) {
                    $scope.newExam.examType.type = type;
                    $scope.updateExam();
                };

                $scope.toggleSection = function (section) {
                    section.icon = "";
                    section.expanded = !section.expanded;
                };

                $scope.removeSection = function (section) {
                    if (confirm($translate('sitnet_remove_section'))) {

                        ExamRes.sections.remove({eid: $scope.newExam.id, sid: section.id}, function (id) {
                            toastr.info($translate("sitnet_section_removed"));
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
                        toastr.info($translate("sitnet_section_updated"));
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

                $scope.clearAllQuestions = function (section) {
                    if (confirm($translate('sitnet_remove_all_questions'))) {
                        ExamRes.clearsection.clear({sid: section.id}, function () {
                            section.sectionQuestions.splice(0, section.sectionQuestions.length);
                            toastr.info($translate("sitnet_all_questions_removed"));
                        }, function (error) {
                            toastr.error(error.data);
                        });

                    }
                };

                $scope.removeQuestion = function (section, sectionQuestion) {
                    if (confirm($translate('sitnet_remove_question'))) {
                        ExamRes.questions.remove({
                            eid: $scope.newExam.id,
                            sid: section.id,
                            qid: sectionQuestion.question.id
                        }, function () {
                            section.sectionQuestions.splice(section.sectionQuestions.indexOf(sectionQuestion), 1);
                            toastr.info($translate("sitnet_question_removed"));
                            if (section.sectionQuestions.length < 2 && section.lotteryOn) {
                                // turn off lottery
                                section.lotteryOn = false;
                                section.lotteryItemCount = 1;
                                ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section);
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                var getUpdate = function (overrides) {
                    var update = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name,
                        "examType": $scope.newExam.examType,
                        "instruction": $scope.newExam.instruction,
                        "enrollInstruction": $scope.newExam.enrollInstruction,
                        "state": $scope.newExam.state,
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": new Date($scope.newExam.examActiveStartDate).getTime(),
                        "examActiveEndDate": new Date($scope.newExam.examActiveEndDate).setHours(23, 59, 59, 999),
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.gradeScale.id,
                        "expanded": $scope.newExam.expanded
                    };
                    for (var k in overrides) {
                        if (overrides.hasOwnProperty(k)) {
                            update[k] = overrides[k];
                        }
                    }
                    return update;
                };

                $scope.updateExam = function (newExam) {

                    var examToSave = getUpdate();

                    ExamRes.exams.update({id: $scope.newExam.id}, examToSave,
                        function (exam) {
                            toastr.info($translate("sitnet_exam_saved"));
                            $scope.newExam = exam;
                            $scope.newExam.examLanguages.forEach(function (language) {
                                // Use front-end language names always to allow for i18n etc
                                language.name = getLanguageNativeName(language.code);
                            });
                        }, function (error) {
                            if (error.data && error.data.indexOf("sitnet_error_") > 0) {
                                toastr.error($translate(error.data));
                            } else if (error.data) {
                                toastr.error(error.data);
                            }
                        });
                };

                //Called when Preview Button is clicked
                $scope.previewExam = function () {
                    //First save the exam, so that
                    //we have something to preview
                    var examId = $routeParams.id;
                    var examToSave = getUpdate();

                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function (exam) {
                            toastr.info($translate("sitnet_exam_saved"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    $location.url($location.path());
                    $location.path("/exams/preview/" + examId);

                };

                // Called when Save button is clicked
                $scope.saveExam = function () {
                    if ($scope.newExam.course == undefined) { // use == not ===
                        toastr.error($translate('sitnet_course_missing'));
                        return;
                    }
                    if ($scope.newExam.examLanguages === undefined || $scope.newExam.examLanguages.length === 0) {
                        toastr.error($translate('sitnet_error_exam_empty_exam_language'));
                        return;
                    }
                    var newState = $scope.newExam.state === 'PUBLISHED' ? 'PUBLISHED' : 'SAVED';

                    var examToSave = getUpdate({"state": newState});

                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function (exam) {
                            toastr.info($translate("sitnet_exam_saved"));
                            $scope.newExam.state = newState;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.unpublishExam = function () {
                    ExamRes.examEnrolments.query({eid: $scope.newExam.id}, function (enrolments) {
                        if (enrolments && enrolments.length > 0) {
                            toastr.warning($translate('sitnet_unpublish_not_possible'));
                        } else {
                            var modalInstance = $modal.open({
                                templateUrl: SITNET_CONF.TEMPLATES_PATH + 'exam/editor/exam_unpublish_dialog.html',
                                backdrop: 'static',
                                keyboard: true,
                                controller: "ModalInstanceCtrl"
                            });

                            modalInstance.result.then(function () {
                                var examToSave = getUpdate({"state": 'SAVED'});
                                ExamRes.exams.update({id: examToSave.id}, examToSave,
                                    function () {
                                        toastr.success($translate("sitnet_exam_unpublished"));
                                        $scope.newExam.state = 'SAVED';
                                    }, function (error) {
                                        toastr.error(error.data);
                                    });

                            }, function (error) {
                                // Cancel button clicked
                            });
                        }
                    });
                };


                // Called when Save and Publish button is clicked
                $scope.saveAndPublishExam = function () {

                    var err = $scope.publishSanityCheck($scope.newExam);
                    $scope.errors = err;
                    if (Object.getOwnPropertyNames(err) && Object.getOwnPropertyNames(err).length != 0) {

                        $modal.open({
                            templateUrl: SITNET_CONF.TEMPLATES_PATH + 'exam/editor/exam_publish_questions.html',
                            backdrop: 'static',
                            keyboard: true,
                            controller: function ($scope, $modalInstance, errors) {
                                $scope.errors = errors;
                                $scope.ok = function () {
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
                        templateUrl: SITNET_CONF.TEMPLATES_PATH + 'exam/editor/exam_publish_dialog.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {

                        // OK button clicked

                        var examToSave = getUpdate({"state": 'PUBLISHED'});

                        ExamRes.exams.update({id: examToSave.id}, examToSave,
                            function (exam) {
                                toastr.success($translate("sitnet_exam_saved_and_published"));
                                $location.url($location.path());
                                $location.path("/exams");
                            }, function (error) {
                                toastr.error(error.data);
                            });

                    }, function (error) {
                        // Cancel button clicked
                    });

                };

                $scope.countQuestions = function (exam) {

                    var count = 0;
                    angular.forEach(exam.examSections, function (section, index) {
                        count += section.sectionQuestions.length;
                    });
                    return count;
                };

                $scope.publishSanityCheck = function (exam) {

                    var errors = {};

                    if (exam.course == undefined) { // use == not ===
                        errors.course = $translate("sitnet_course_missing");
                    }

                    if (exam.name === undefined || exam.name.length < 2) {
                        errors.name = $translate('sitnet_exam_name_missing_or_too_short');
                    }

                    if (!$scope.newExam.examLanguages || $scope.newExam.examLanguages.length === 0) {
                        errors.name = $translate('sitnet_error_exam_empty_exam_language');
                    }

                    if (!$scope.newExam.examActiveStartDate) {
                        errors.examActiveStartDate = $translate('sitnet_exam_start_date_missing');
                    }

                    if (!$scope.newExam.examActiveEndDate) {
                        errors.examActiveEndDate = $translate('sitnet_exam_end_date_missing');
                    }

                    if (!$scope.countQuestions || $scope.countQuestions < 1) {
                        errors.questions = $translate('sitnet_exam_has_no_questions');
                    }

                    if (exam.duration === undefined || exam.duration < 1) {
                        errors.duration = $translate('sitnet_exam_duration_missing');
                    }

                    if ($scope.newExam.gradeScale === undefined) {
                        errors.grading = $translate('sitnet_exam_grade_scale_missing');
                    }

                    if (exam.examType === undefined) {
                        errors.examType = $translate('sitnet_exam_credit_type_missing');
                    }

                    return errors;
                };

                // TODO: this controller should be split on a per-view basis to avoid having this kind of duplication

                $scope.deleteExam = function (exam) {
                    if (confirm($translate('sitnet_remove_exam'))) {

                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate('sitnet_exam_removed'));
                            $scope.exams.splice($scope.exams.indexOf(exam), 1);

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.cancelNewExam = function (exam) {
                    if (confirm($translate('sitnet_remove_exam'))) {

                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate('sitnet_exam_removed'));
                            $location.path('/exams/');
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.moveQuestion = function (section, from, to) {
                    DragDropHandler.moveObject(section.sectionQuestions, from, to);
                    ExamRes.reordersection.update({
                        eid: $scope.newExam.id,
                        sid: section.id,
                        from: from,
                        to: to
                    }, function () {
                        toastr.info($translate("sitnet_questions_reordered"));
                    });
                };

                var updateSection = function (section) {
                    var index = -1;
                    $scope.newExam.examSections.some(function (s, i) {
                        if (s.id === section.id) {
                            index = i;
                            return true;
                        }
                    });
                    if (index >= 0) {
                        $scope.newExam.examSections[index] = section;
                    }

                };

                $scope.insertQuestion = function (section, object, to) {

                    if(object instanceof Array) {
                        var questions = angular.copy(object).reverse();

                        var sectionQuestions = questions.map(function(question){ return question.id; }).join(",");

                        ExamRes.sectionquestionsmultiple.insert({
                                eid: $scope.newExam.id,
                                sid: section.id,
                                seq: to,
                                questions: sectionQuestions
                            }, function (sec) {
                                toastr.info($translate("sitnet_question_added"));
                                var promises = [];
                                promises.push(DragDropHandler.addObject(sectionQuestions, section.sectionQuestions, to));
                                $q.all(promises).then(function(){
                                    initializeExam();
                                });

                            }, function (error) {
                                toastr.error(error.data);
                            }
                        );

                    } else {
                        var question = angular.copy(object);
                        var sectionQuestion = {question: question};
                        ExamRes.sectionquestions.insert({
                                eid: $scope.newExam.id,
                                sid: section.id,
                                seq: to,
                                qid: question.id
                            }, function (sec) {
                                DragDropHandler.addObject(sectionQuestion, section.sectionQuestions, to);
                                toastr.info($translate("sitnet_question_added"));
                                updateSection(sec); // needs manual update as the scope is somehow not automatically refreshed
                            }, function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                //http://draptik.github.io/blog/2013/07/28/restful-crud-with-angularjs/
                $scope.createQuestionFromExamView = function (type, section) {
                    var newQuestion = {
                        type: type
                    };

                    QuestionRes.questions.create(newQuestion,
                        function (response) {
                            newQuestion = response;
                            var nextSeq;
                            if (section.sectionQuestions === undefined || section.sectionQuestions.length === 0) {
                                nextSeq = 0;
                            } else {
                                nextSeq = Math.max.apply(Math, section.sectionQuestions.map(function (s) {
                                    return s.sequenceNumber;
                                })) + 1;
                            }
                            $location.path("/questions/" + response.id + "/exam/" + $scope.newExam.id + "/section/" + section.id + "/sequence/" + nextSeq);
                        }, function (error) {
                            toastr.error(error.data);
                        });


                };

                $scope.examFilter = function (item, comparator) {
                    return (item.state == comparator);
                };

                $scope.toggleLottery = function (section) {
                    if (section.sectionQuestions && section.sectionQuestions.length > 1) {
                        section.lotteryOn = !section.lotteryOn;
                        ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section,
                            function (sec) {
                                section = sec;

                                if (section.lotteryItemCount === undefined) {
                                    section.lotteryItemCount = 1;
                                }

                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                };

                $scope.updateLotteryCount = function (section) {

                    if (!section.lotteryItemCount) {
                        toastr.warning($translate("sitnet_warn_lottery_count"));
                        section.lotteryItemCount = section.lotteryItemCount === undefined || section.lotteryItemCount == 0 ? 1 : section.sectionQuestions.length;
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

                    var exam = $scope.newExam;

                    var ctrl = function ($scope, $modalInstance) {

                        $scope.newExam = exam;

                        $scope.submit = function (exam) {

                            var file = $scope.attachmentFile;
                            if (file === undefined) {
                                toastr.error($translate("sitnet_attachment_not_chosen"));
                                return;
                            }
                            var url = "attachment/exam";
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
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function () {
                            $modalInstance.dismiss("Cancelled");
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: SITNET_CONF.TEMPLATES_PATH + 'exam/editor/dialog_exam_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        modalInstance.dismiss();
                        $location.path('/exams/' + $scope.newExam.id);
                    });
                };

                $scope.removeExamRoom = function () {
                    $scope.newExam.room = null;
                    $scope.updateExam($scope.newExam);
                };

                $scope.getSectionId = function (id) {

                    if (document.getElementById(id)) {
                        return document.getElementById(id).select();
                    }
                };

                $scope.shortText = function (text) {
                    // remove HTML tags
                    return String(text).replace(/<[^>]+>/gm, '');
                };

            }]);
}());