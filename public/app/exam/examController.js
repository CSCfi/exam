(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamController', ['dialogs', '$scope', '$timeout', '$filter', '$rootScope', '$q', '$sce', '$anchorScroll', '$modal', 'sessionService', 'examService',
            '$routeParams', '$translate', '$http', '$location', 'EXAM_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'LanguageRes', 'RoomResource',
            'SoftwareResource', 'DragDropHandler', 'SettingsResource', 'fileService', 'questionService', 'EnrollRes',
            function (dialogs, $scope, $timeout, $filter, $rootScope, $q, $sce, $anchorScroll, $modal, sessionService, examService,
                      $routeParams, $translate, $http, $location, EXAM_CONF, ExamRes, QuestionRes, UserRes, LanguageRes, RoomResource,
                      SoftwareResource, DragDropHandler, SettingsResource, fileService, questionService, EnrollRes) {

                $scope.newExam = {};
                $scope.sectionTemplate = {visible: true};
                $scope.templates = {
                    basicInfo: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_basic_info.html",
                    section: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_section.html",
                    question: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_section_question.html",
                    library: EXAM_CONF.TEMPLATES_PATH + "question/library.html",
                    course: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_course.html",
                    sections: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_sections.html"
                };

                $scope.examTypes = [];
                $scope.gradeScaleSetting = {};
                $scope.filter = {};
                $scope.loader = {
                    loading: false
                };

                $scope.user = sessionService.getUser();
                if ($scope.user.isStudent) {
                    $location.path("/");
                }

                $scope.session = sessionService;

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

                // Clear the question type filter when moving away
                $scope.$on('$locationChangeStart', function (event) {
                    questionService.setFilter(null);
                });

                var search = function () {
                    $scope.loader.loading = true;
                    ExamRes.exams.query({filter: $scope.filter.text}, function (exams) {
                        exams.forEach(function (e) {
                            e.ownerAggregate = e.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                            e.stateOrd = ['PUBLISHED', 'SAVED', 'DRAFT'].indexOf(e.state);
                            if (e.stateOrd === 0 && Date.now() <= new Date(e.examActiveEndDate)) {
                                // There's a bug with bootstrap tables, contextual classes wont work together with
                                // striped-table. Therefore overriding the style with this (RBG taken from .success)
                                // https://github.com/twbs/bootstrap/issues/11728
                                e.activityStyle = {'background-color': '#dff0d8 !important'};
                            }
                        });
                        $scope.exams = exams;
                        $scope.loader.loading = false;
                    }, function (err) {
                        $scope.loader.loading = false;
                        toastr.error($translate.instant(err.data));
                    });
                };

                SettingsResource.examDurations.get(function (data) {
                    $scope.examDurations = data.examDurations;
                });

                SettingsResource.gradeScale.get(function (data) {
                    $scope.gradeScaleSetting = data;
                });

                examService.listExecutionTypes().then(function (types) {
                    $scope.executionTypes = types;
                });

                $scope.getExecutionTypeTranslation = function (exam) {
                    return examService.getExecutionTypeTranslation(exam.executionType.type);
                };

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

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                    refreshGradeScales();
                });

                var initialLanguages;
                var initialSoftware;

                var resetGradeScale = function (exam) {
                    // Set exam grade scale from course default if not specifically set for exam
                    if (!exam.gradeScale && exam.course && exam.course.gradeScale) {
                        $scope.newExam.gradeScale = exam.course.gradeScale;
                        $scope.newExam.gradeScale.name = examService.getScaleDisplayName(
                            $scope.newExam.course.gradeScale);
                    } else if (exam.gradeScale) {
                        $scope.newExam.gradeScale.name = examService.getScaleDisplayName(exam.gradeScale);
                    }

                };

                var initializeExam = function () {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.newExam = exam;
                            $scope.newExam.examLanguages.forEach(function (language) {
                                // Use front-end language names always to allow for i18n etc
                                language.name = getLanguageNativeName(language.code);
                            });
                            initialLanguages = exam.examLanguages.length;
                            initialSoftware = exam.softwares.length;
                            resetGradeScale(exam);
                            $scope.reindexNumbering();
                            getInspectors();
                            getExamOwners();
                            if (exam.examEnrolments.filter(function (ee) {
                                    return ee.reservation && ee.reservation.endAt > new Date().getTime();
                                }).length > 0) {
                                // Enrolments/reservations in effect
                                $scope.newExam.hasEnrolmentsInEffect = true;
                            }
                            if ($scope.newExam.executionType.type === 'MATURITY') {
                                // Show only essay questions in the question library
                                questionService.setFilter('EssayQuestion');

                                $scope.examTypes = $scope.examTypes.filter(function (t) {
                                    return t.type === 'FINAL';
                                });
                            }
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                // Here's the party
                refreshExamTypes();
                refreshGradeScales();
                if ($scope.user.isTeacher) {
                    var action = $routeParams.id ? initializeExam : search;
                    action();
                }
                if ($scope.user.isAdmin && $routeParams.id) {
                    initializeExam();
                }

                $scope.search = function () {
                    search();
                };

                $scope.hostname = SettingsResource.hostname.get();

                $scope.softwares = SoftwareResource.softwares.query();

                $scope.selectedSoftwares = function (exam) {
                    if (!exam || !exam.softwares) {
                        return;
                    }
                    return exam.softwares.map(function (software) {
                        return software.name;
                    }).join(", ");
                };

                $scope.selectedLanguages = function (exam) {
                    if (!exam || !exam.examLanguages) {
                        return;
                    }
                    return exam.examLanguages.map(function (language) {
                        return getLanguageNativeName(language.code);
                    }).join(", ");
                };

                $scope.updateSoftwareInfo = function () {
                    if ($scope.newExam.softwares.length !== initialSoftware) {
                        var softwareIds = $scope.newExam.softwares.map(function (s) {
                            return s.id;
                        }).join();
                        ExamRes.software.add({eid: $scope.newExam.id, softwareIds: softwareIds}, function () {
                            toastr.info($translate.instant('sitnet_exam_software_updated'));
                            $scope.selectedSoftwares($scope.newExam);
                            initialSoftware = softwareIds.length;
                        }, function (error) {
                            $scope.newExam.softwares = [];
                            $scope.selectedSoftwares($scope.newExam);
                            initialSoftware = 0;
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.updateExamLanguages = function () {

                    if ($scope.newExam.examLanguages.length !== initialLanguages) {

                        ExamRes.languages.reset({eid: $scope.newExam.id}, function () {
                            var promises = [];
                            angular.forEach($scope.newExam.examLanguages, function (language) {
                                promises.push(ExamRes.language.add({eid: $scope.newExam.id, code: language.code}));
                            });
                            $q.all(promises).then(function () {
                                toastr.info($translate.instant('sitnet_exam_language_updated'));
                                $scope.selectedLanguages($scope.newExam);
                                initialLanguages = $scope.newExam.examLanguages.length;
                            });
                        });
                    }
                };

                /**
                 *
                 * @param modalType "owner" or "inspector"
                 */
                $scope.openExamUserModal = function (modalType) {

                    var exam = {
                        "id": $scope.newExam.id,
                        "modalType": modalType
                    };

                    var templateType = "",
                        controllerType = "";

                    if (modalType === 'owner') {
                        templateType = EXAM_CONF.TEMPLATES_PATH + 'exam/editor/exam_owner.html';
                        controllerType = "ExamOwnerController";
                    } else if (modalType === 'inspector') {
                        templateType = EXAM_CONF.TEMPLATES_PATH + 'exam/editor/exam_inspector.html';
                        controllerType = "ExamInspectionController";
                    } else if (modalType === 'student') {
                        templateType = EXAM_CONF.TEMPLATES_PATH + 'exam/editor/exam_participation.html';
                        controllerType = "ExamEnrolmentController";
                    }

                    var modalInstance = $modal.open({
                        templateUrl: templateType,
                        backdrop: 'static',
                        keyboard: true,
                        controller: controllerType,
                        resolve: {
                            exam: function () {
                                return exam;
                            }
                        }
                    });

                    modalInstance.result.then(function (result) {
                        // OK button clicked
                        if (modalType === 'owner') {
                            getExamOwners();
                        }
                        if (modalType === 'inspector') {
                            getInspectors();
                        }
                        if (modalType === 'student') {
                            $scope.newExam.examEnrolments.push(result);
                        }
                    }, function () {
                        // Cancel button clicked
                    });
                };

                $scope.removeOwner = function (id) {
                    ExamRes.examowner.remove({eid: $scope.newExam.id, uid: id},
                        function (result) {
                            getExamOwners();
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.examOwners = [];

                function getExamOwners() {
                    if ($scope.newExam.id) {
                        ExamRes.owners.query({id: $scope.newExam.id},
                            function (examOwners) {
                                $scope.examOwners = examOwners;
                            },
                            function (error) {
                                toastr.error(error.data);
                            });
                    }
                }

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

                $scope.removeParticipant = function (id) {
                    EnrollRes.unenrollStudent.remove({id: id}, function () {
                        $scope.newExam.examEnrolments = $scope.newExam.examEnrolments.filter(function (ee) {
                            return ee.id !== id;
                        });
                        toastr.info($translate.instant('sitnet_participant_removed'));
                    }, function (error) {
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
                    var newSection = {
                        expanded: true,
                        questions: []
                    };

                    ExamRes.sections.insert({eid: $scope.newExam.id}, newSection, function (section) {
                        toastr.success($translate.instant('sitnet_section_added'));
                        $scope.newExam.examSections.push(section);
                        $scope.reindexNumbering();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                // Called when create exam button is clicked
                $scope.createExam = function (executionType) {
                    examService.createExam(executionType);
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

                $scope.checkGradeScale = function (scale) {
                    if (!$scope.newExam.gradeScale) {
                        return "";
                    }
                    return $scope.newExam.gradeScale.id === scale.id ? "btn-primary" : "";
                };

                $scope.getSelectableScales = function () {
                    if (!$scope.examGradings || !$scope.newExam.course) {
                        return [];
                    }
                    return $scope.examGradings.filter(function (scale) {
                        return $scope.gradeScaleSetting.overridable || !$scope.newExam.course.gradeScale ||
                            $scope.newExam.course.gradeScale.id === scale.id
                    });
                };

                $scope.checkScaleDisabled = function (scale) {
                    if (!scale || !$scope.newExam.course || !$scope.newExam.course.gradeScale) {
                        return false;
                    }
                    return !$scope.gradeScaleSetting.overridable && $scope.newExam.course.gradeScale.id === scale.id;
                };

                $scope.checkType = function (type) {
                    if (!$scope.newExam.examType) return "";
                    return $scope.newExam.examType.type === type ? "btn-primary" : "";
                };

                $scope.setExamGradeScale = function (grading) {
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
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_section'));
                    dialog.result.then(function (btn) {
                        ExamRes.sections.remove({eid: $scope.newExam.id, sid: section.id}, function (id) {
                            toastr.info($translate.instant("sitnet_section_removed"));
                            $scope.newExam.examSections.splice($scope.newExam.examSections.indexOf(section), 1);
                            $scope.reindexNumbering();

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                $scope.renameSection = function (section) {

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
                        section = sec;
                        toastr.info($translate.instant("sitnet_section_updated"));
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };

                $scope.expandSection = function (section) {

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
                        section = sec;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.clearAllQuestions = function (section) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_all_questions'));
                    dialog.result.then(function (btn) {
                        ExamRes.clearsection.clear({sid: section.id}, function () {
                            section.sectionQuestions.splice(0, section.sectionQuestions.length);
                            toastr.info($translate.instant("sitnet_all_questions_removed"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                $scope.removeQuestion = function (section, sectionQuestion) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question'));
                    dialog.result.then(function (btn) {
                        ExamRes.questions.remove({
                            eid: $scope.newExam.id,
                            sid: section.id,
                            qid: sectionQuestion.question.id
                        }, function () {
                            section.sectionQuestions.splice(section.sectionQuestions.indexOf(sectionQuestion), 1);
                            toastr.info($translate.instant("sitnet_question_removed"));
                            if (section.sectionQuestions.length < 2 && section.lotteryOn) {
                                // turn off lottery
                                section.lotteryOn = false;
                                section.lotteryItemCount = 1;
                                ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section);
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
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
                        "grading": $scope.newExam.gradeScale ? $scope.newExam.gradeScale.id : undefined,
                        "expanded": $scope.newExam.expanded,
                        "trialCount": $scope.newExam.trialCount,
                        "objectVersion": $scope.newExam.objectVersion
                    };
                    for (var k in overrides) {
                        if (overrides.hasOwnProperty(k)) {
                            update[k] = overrides[k];
                        }
                    }
                    return update;
                };

                var onUpdate = function (exam) {
                    exam.hasEnrolmentsInEffect = $scope.newExam.hasEnrolmentsInEffect;
                    exam.examSections.forEach(function (es) {
                       es.sectionQuestions.sort(function (a, b) {
                           return a.sequenceNumber - b.sequenceNumber;
                       })
                    });
                    $scope.newExam = exam;
                    resetGradeScale(exam);
                    $scope.newExam.examLanguages.forEach(function (language) {
                        // Use front-end language names always to allow for i18n etc
                        language.name = getLanguageNativeName(language.code);
                    });
                };

                $scope.updateExam = function (newExam) {

                    var examToSave = getUpdate();

                    ExamRes.exams.update({id: $scope.newExam.id}, examToSave,
                        function (exam) {
                            toastr.info($translate.instant("sitnet_exam_saved"));
                            onUpdate(exam);
                        }, function (error) {
                            if (error.data) {
                                var msg = error.data.message || error.data;
                                toastr.error($translate.instant(msg));
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
                            toastr.info($translate.instant("sitnet_exam_saved"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    $location.url($location.path());
                    $location.path("/exams/preview/" + examId);
                };

                // Called when Save button is clicked
                $scope.saveExam = function () {
                    if ($scope.newExam.course == undefined) { // use == not ===
                        toastr.error($translate.instant('sitnet_course_missing'));
                        return;
                    }
                    if ($scope.newExam.examLanguages === undefined || $scope.newExam.examLanguages.length === 0) {
                        toastr.error($translate.instant('sitnet_error_exam_empty_exam_language'));
                        return;
                    }
                    var newState = $scope.newExam.state === 'PUBLISHED' ? 'PUBLISHED' : 'SAVED';

                    var examToSave = getUpdate({"state": newState});

                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function (exam) {
                            toastr.info($translate.instant("sitnet_exam_saved"));
                            onUpdate(exam);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                // TODO: how should this work when it comes to private exams?
                $scope.unpublishExam = function () {
                    ExamRes.examEnrolments.query({eid: $scope.newExam.id}, function (enrolments) {
                        if (enrolments && enrolments.length > 0) {
                            toastr.warning($translate.instant('sitnet_unpublish_not_possible'));
                        } else {
                            var modalInstance = $modal.open({
                                templateUrl: EXAM_CONF.TEMPLATES_PATH + 'exam/editor/exam_unpublish_dialog.html',
                                backdrop: 'static',
                                keyboard: true,
                                controller: "ModalInstanceCtrl"
                            });

                            modalInstance.result.then(function () {
                                var examToSave = getUpdate({"state": 'SAVED'});
                                ExamRes.exams.update({id: examToSave.id}, examToSave,
                                    function () {
                                        toastr.success($translate.instant("sitnet_exam_unpublished"));
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
                            templateUrl: EXAM_CONF.TEMPLATES_PATH + 'exam/editor/exam_publish_questions.html',
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
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'exam/editor/exam_publish_dialog.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "ModalInstanceCtrl"
                    });

                    modalInstance.result.then(function () {

                        // OK button clicked

                        var examToSave = getUpdate({"state": 'PUBLISHED'});

                        ExamRes.exams.update({id: examToSave.id}, examToSave,
                            function (exam) {
                                toastr.success($translate.instant("sitnet_exam_saved_and_published"));
                                $location.url($location.path());
                                $location.path("/exams");
                            }, function (error) {
                                toastr.error(error.data);
                            });

                    }, function (error) {
                        // Cancel button clicked
                    });

                };

                var countQuestions = function () {

                    var count = 0;
                    angular.forEach($scope.newExam.examSections, function (section) {
                        count += section.sectionQuestions.length;
                    });
                    return count;
                };

                $scope.publishSanityCheck = function (exam) {

                    var errors = {};

                    if (!exam.course) {
                        errors.course = $translate.instant("sitnet_course_missing");
                    }

                    if (!exam.name || exam.name.length < 2) {
                        errors.name = $translate.instant('sitnet_exam_name_missing_or_too_short');
                    }

                    if (!$scope.newExam.examLanguages || $scope.newExam.examLanguages.length === 0) {
                        errors.name = $translate.instant('sitnet_error_exam_empty_exam_language');
                    }

                    if (!$scope.newExam.examActiveStartDate) {
                        errors.examActiveStartDate = $translate.instant('sitnet_exam_start_date_missing');
                    }

                    if (!$scope.newExam.examActiveEndDate) {
                        errors.examActiveEndDate = $translate.instant('sitnet_exam_end_date_missing');
                    }

                    if (countQuestions() == 0) {
                        errors.questions = $translate.instant('sitnet_exam_has_no_questions');
                    }

                    if (!exam.duration) {
                        errors.duration = $translate.instant('sitnet_exam_duration_missing');
                    }

                    if (!$scope.newExam.gradeScale) {
                        errors.grading = $translate.instant('sitnet_exam_grade_scale_missing');
                    }

                    if (!exam.examType) {
                        errors.examType = $translate.instant('sitnet_exam_credit_type_missing');
                    }

                    var allSectionsNamed = exam.examSections.every(function (section) {
                        return section.name;
                    });
                    if (!allSectionsNamed) {
                        errors.sectionNames = $translate.instant('sitnet_exam_contains_unnamed_sections');
                    }
                    if (exam.executionType.type === 'PRIVATE' && exam.examEnrolments.length < 1) {
                        errors.participants = $translate.instant('sitnet_no_participants');
                    }

                    return errors;
                };

                $scope.copyExam = function (exam) {
                    ExamRes.exams.copy({id: exam.id}, function (copy) {
                        toastr.success($translate.instant('sitnet_exam_copied'));
                        $scope.exams.push(copy);
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.deleteExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate.instant('sitnet_exam_removed'));
                            $scope.exams.splice($scope.exams.indexOf(exam), 1);

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                $scope.cancelNewExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate.instant('sitnet_exam_removed'));
                            $location.path('/exams/');
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                $scope.moveQuestion = function (section, from, to) {
                    console.log("moving question #" + from + " to #" + to);
                    if (from >= 0 && to >= 0 && from != to) {
                        ExamRes.reordersection.update({
                            eid: $scope.newExam.id,
                            sid: section.id,
                            from: from,
                            to: to
                        }, function () {
                            console.log("moved");
                            toastr.info($translate.instant("sitnet_questions_reordered"));
                        });
                    }
                };

                var updateSection = function (section, preserveName) {
                    var index = -1;
                    $scope.newExam.examSections.some(function (s, i) {
                        if (s.id === section.id) {
                            index = i;
                            return true;
                        }
                    });
                    if (index >= 0) {
                        // This thing is needed atm because draggable question objects swallow the DOM change event
                        // preventing the uiChange directive from firing on section name input field.
                        var prev = $scope.newExam.examSections[index];
                        if (preserveName) {
                            var newName = section.name;
                            section.name = prev.name;
                            if (prev.name !== newName) {
                                $scope.renameSection({id: section.id, name: prev.name, expanded: true});
                            }
                        }
                        $scope.newExam.examSections[index] = section;
                    }

                };

                $scope.insertQuestion = function (section, object, to) {

                    if (object instanceof Array) {
                        var questions = angular.copy(object).reverse();

                        var sectionQuestions = questions.map(function (question) {
                            return question.id;
                        }).join(",");

                        ExamRes.sectionquestionsmultiple.insert({
                                eid: $scope.newExam.id,
                                sid: section.id,
                                seq: to,
                                questions: sectionQuestions
                            }, function (sec) {
                                toastr.info($translate.instant("sitnet_question_added"));
                                var promises = [];
                                promises.push(DragDropHandler.addObject(sectionQuestions, section.sectionQuestions, to));
                                $q.all(promises).then(function () {
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
                                toastr.info($translate.instant("sitnet_question_added"));
                                updateSection(sec, true); // needs manual update as the scope is somehow not automatically refreshed
                            }, function (error) {
                                toastr.error(error.data);
                                // remove broken objects
                                section.sectionQuestions = section.sectionQuestions.filter(function (sq) {
                                    return sq;
                                });
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
                        toastr.warning($translate.instant("sitnet_warn_lottery_count"));
                        section.lotteryItemCount = 1;
                    }
                    else {
                        ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, section, function (sec) {
                            section = sec;
                            toastr.info($translate.instant('sitnet_section_updated'))
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.longTextIfNotMath = function (text) {
                    return questionService.longTextIfNotMath(text);
                };

                $scope.range = function (min, max, step) {
                    step |= 1;
                    var input = [];
                    for (var i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

                $scope.checkTrialCount = function (x) {
                    return $scope.newExam.trialCount == x ? "btn-primary" : "";
                };

                $scope.truncate = function (content, offset) {
                    if (content) {
                        return $filter('truncate')(content, offset);
                    }
                };

                $scope.setTrialCount = function (x) {
                    $scope.newExam.trialCount = x;
                    $scope.updateExam();
                };

                $scope.selectFile = function () {

                    var exam = $scope.newExam;

                    var ctrl = ["$scope", "$modalInstance", function ($scope, $modalInstance) {

                        $scope.newExam = exam;
                        $scope.isTeacherModal = true;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });

                        $scope.submit = function () {
                            fileService.upload("attachment/exam", $scope.attachmentFile, {examId: $scope.newExam.id}, $scope.newExam, $modalInstance);
                        };

                        $scope.cancel = function () {
                            $modalInstance.dismiss("Cancelled");
                        };

                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
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

                $scope.shortText = function (text, limit) {
                    return questionService.shortText(text, limit);
                };

            }]);
}());
