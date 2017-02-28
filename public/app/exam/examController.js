(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamController', ['dialogs', '$scope', '$timeout', '$filter', '$rootScope', '$q', '$sce', '$uibModal', 'sessionService', 'examService',
            '$routeParams', '$translate', '$http', '$location', 'EXAM_CONF', 'ExamRes', 'QuestionRes', 'UserRes', 'LanguageRes',
            'SoftwareResource', 'SettingsResource', 'fileService', 'questionService', 'EnrollRes', 'ExamSectionQuestionRes', 'limitToFilter',
            'enrolmentService',
            function (dialogs, $scope, $timeout, $filter, $rootScope, $q, $sce, $modal, sessionService, examService,
                      $routeParams, $translate, $http, $location, EXAM_CONF, ExamRes, QuestionRes, UserRes, LanguageRes,
                      SoftwareResource, SettingsResource, fileService, questionService, EnrollRes, ExamSectionQuestionRes,
                      limitToFilter, enrolmentService) {

                $scope.loader = {loading: true};
                $scope.createExamModel = {};
                $scope.sectionDisplay = {visible: true};
                $scope.autoevaluationDisplay = {visible: false};
                $scope.templates = {
                    basicInfo: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_basic_info.html",
                    section: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_section.html",
                    question: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_section_question.html",
                    library: EXAM_CONF.TEMPLATES_PATH + "question/library.html",
                    course: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_course.html",
                    sections: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_sections.html",
                    autoEvaluation: EXAM_CONF.TEMPLATES_PATH + "exam/editor/autoevaluation.html",
                    reviewListPath: EXAM_CONF.TEMPLATES_PATH + "review/review_list.html",
                    examBasicPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_basic_info.html",
                    examQuestionsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_questions.html",
                    examMaterialsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_materials.html",
                    examPublishSettingsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_publish_settings.html"
                };

                $scope.examTypes = [];
                $scope.gradeScaleSetting = {};
                $scope.autoevaluation = {
                    enabled: false, releaseTypes: [
                        {
                            name: 'IMMEDIATE',
                            translation: 'sitnet_autoevaluation_release_type_immediate',
                            filtered: true
                        },
                        {name: 'GIVEN_DATE', translation: 'sitnet_autoevaluation_release_type_given_date'},
                        {name: 'GIVEN_AMOUNT_DAYS', translation: 'sitnet_autoevaluation_release_type_given_days'},
                        {name: 'AFTER_EXAM_PERIOD', translation: 'sitnet_autoevaluation_release_type_period'},
                        {name: 'NEVER', translation: 'sitnet_autoevaluation_release_type_never'}
                    ]
                };


                $scope.fromDialog = false;
                $scope.user = sessionService.getUser();
                $scope.newExamName = '';

                $scope.tabs = [
                    { title:'perus', active: $routeParams.tab == 1 },
                    { title:'kysymys', active: $routeParams.tab == 2 },
                    { title:'julkaisu', active: $routeParams.tab == 3 },
                    { title:'suoritukset', active: $routeParams.tab == 4 }
                  ];

                var getReleaseTypeByName = function (name) {
                    var matches = $scope.autoevaluation.releaseTypes.filter(function (rt) {
                        return rt.name === name;
                    });
                    return matches.length > 0 ? matches[0] : null;
                };


                // Clear the question type filter when moving away
                $scope.$on('$locationChangeStart', function (event) {
                    questionService.setFilter(null);
                });

                SettingsResource.examDurations.get(function (data) {
                    $scope.examDurations = data.examDurations;
                });

                SettingsResource.gradeScale.get(function (data) {
                    $scope.gradeScaleSetting = data;
                });

                examService.listExecutionTypes().then(function (types) {
                    $scope.executionTypes = types;
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

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                    refreshGradeScales();
                });

                var initialLanguages;
                var initialSoftware;

                var prepareGradeScale = function (exam) {
                    // Set exam grade scale from course default if not specifically set for exam
                    if (exam.gradeScale) {
                        $scope.newExam.gradeScale.name = examService.getScaleDisplayName(exam.gradeScale);
                    }
                    else if (exam.course && exam.course.gradeScale) {
                        $scope.newExam.gradeScale = exam.course.gradeScale;
                        $scope.newExam.gradeScale.name = examService.getScaleDisplayName(
                            $scope.newExam.course.gradeScale);
                    }
                };

                var prepareAutoEvaluationConfig = function (overwrite) {
                    var exam = $scope.newExam;
                    $scope.autoevaluation.enabled = !!exam.autoEvaluationConfig;
                    if ((overwrite || !exam.autoEvaluationConfig) && $scope.newExam.gradeScale) {
                        exam.autoEvaluationConfig = {
                            releaseType: $scope.selectedReleaseType().name || $scope.autoevaluation.releaseTypes[0].name,
                            gradeEvaluations: $scope.newExam.gradeScale.grades.map(function (g) {
                                return {grade: angular.copy(g), percentage: 0};
                            })
                        };
                    }
                    if (exam.autoEvaluationConfig) {
                        exam.autoEvaluationConfig.gradeEvaluations.sort(function (a, b) {
                            return a.grade.id - b.grade.id;
                        });
                        $scope.applyFilter(getReleaseTypeByName(exam.autoEvaluationConfig.releaseType));
                    }
                };

                var getParticipations = function () {
                    // go through child exams and read in the enrolments
                    var x = [];
                    $scope.newExam.children.forEach(function (c) {
                        x = x.concat(c.examEnrolments);
                    });
                    return x;
                };

                $scope.createExam = function () {
                    if ($scope.createExamModel.type.type != "") {
                        $scope.typeSelected = true;
                        examService.createExam($scope.createExamModel.type.type);
                    }
                };

                var initializeExam = function (refresh) {

                    if ($routeParams.create == 1) {
                        // new exam about to be created
                        // need some user data before actually creating it
                        $scope.typeSelected = false;
                        $scope.loader.loading = false;
                        $scope.createNewExam = true;
                        $scope.newExamName = '';
                        initialLanguages = 0;
                    } else if ($location.path().match(/exams\/course\/\d+$/)) {
                        $scope.newExam = ExamRes.exams.get({id: $routeParams.id});
                        $scope.typeSelected = true;
                    } else {
                        // Parent scope deals with the actual exam fetching
                        $scope.initializeExam(refresh).then(function (exam) {

                            // route evaluators to 4th tab, don't show exam info
                            if(!filterOwners($scope.user.id, exam)) {
                               $scope.tabs[3].active=true;
                            }

                            $scope.typeSelected = true;
                            $scope.newExam = exam;
                            $scope.newExam.examLanguages.forEach(function (language) {
                                // Use front-end language names always to allow for i18n etc
                                language.name = getLanguageNativeName(language.code);
                            });
                            $scope.newExam.examSections.sort(function (a, b) {
                                return a.sequenceNumber - b.sequenceNumber;
                            });
                            recreateSectionIndices();
                            initialLanguages = exam.examLanguages.length;
                            initialSoftware = exam.softwares.length;
                            prepareGradeScale(exam);
                            prepareAutoEvaluationConfig();
                            getInspectors();
                            getExamOwners();
                            if (exam.examEnrolments.filter(function (ee) {
                                    return ee.reservation && ee.reservation.endAt > new Date().getTime();
                                }).length > 0) {
                                // Enrolments/reservations in effect
                                // TODO: this needs to check the enrolment also, not only reservations SIT-1714
                                $scope.newExam.hasEnrolmentsInEffect = true;
                            }
                            if ($scope.newExam.executionType.type !== 'PUBLIC') {
                                // Students that have taken this exam
                                $scope.newExam.participants = getParticipations();
                            }
                            if ($scope.newExam.executionType.type === 'MATURITY') {
                                // Show only essay questions in the question library
                                questionService.setFilter('EssayQuestion');

                                $scope.examTypes = $scope.examTypes.filter(function (t) {
                                    return t.type === 'FINAL';
                                });
                            }
                            $scope.createExamModel.type = $scope.newExam.executionType;
                            $scope.subjectToLanguageInspection = $scope.newExam.subjectToLanguageInspection;

                            if (exam.course && exam.course.code && exam.name) {
                                $scope.examInfo.title = exam.course.code + " " + exam.name;
                            }
                            else if (exam.course && exam.course.code) {
                                $scope.examInfo.title = exam.course.code + " " + $translate.instant("sitnet_no_name");
                            }
                            else {
                                $scope.examInfo.title = exam.name;
                            }
                            $scope.examInfo.examOwners = exam.examOwners;
                            $scope.examFull = exam;


                            $scope.loader.loading = false;
                        });
                    }
                };

                // Here's the party
                refreshExamTypes();
                refreshGradeScales();
                initializeExam();

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
                    if (initialSoftware && $scope.newExam.softwares.length !== initialSoftware) {
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

                    if (initialLanguages && $scope.newExam.examLanguages.length !== initialLanguages) {
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
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.addExamLanguages = function () {

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
                    }, function (error) {
                        toastr.error(error.data);
                    });
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


                $scope.newOwner = {
                    "user": {
                        "id": null,
                        "name": null
                    },
                    "exam": {
                        "id": $routeParams.id
                    }
                };
                $scope.newExaminationDate = {
                    "date": new Date()
                };

                $scope.addExaminationDate = function (data) {
                    var alreadyExists = $scope.newExam.examinationDates.map(function (ed) {
                        return moment(ed.date).format("L")
                    }).some(function (ed) {
                        return ed == moment(data.date).format("L")
                    });
                    if (!alreadyExists) {
                        ExamRes.examinationDate.create({eid: $scope.newExam.id, date: data.date}, function (data) {
                            $scope.newExam.examinationDates.push(data);
                        });
                    }
                };

                $scope.removeExaminationDate = function (date) {
                    ExamRes.examinationDate.delete({eid: $scope.newExam.id, edid: date.id}, function () {
                        var i = $scope.newExam.examinationDates.indexOf(date);
                        $scope.newExam.examinationDates.splice(i, 1);
                    });
                };

                $scope.setExamOwner = function ($item, $model, $label) {
                    $scope.newOwner.user.id = $item.id;
                };


                $scope.allExamOwners = function (filter, criteria) {

                    return UserRes.filterOwnersByExam.query({
                        role: 'TEACHER',
                        eid: $routeParams.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.addExamOwner = function () {
                    if ($scope.newOwner.user.id && $scope.newOwner.user.id > 0 && $scope.newOwner.exam.id && $scope.newOwner.exam.id > 0) {
                        ExamRes.examowner.insert({
                            eid: $scope.newOwner.exam.id,
                            uid: $scope.newOwner.user.id
                        }, $scope.newOwner, function (owner) {

                            // reload the list
                            getExamOwners();

                            // nullify input field
                            $scope.newOwner.user.name = null;
                            $scope.newOwner.user.id = null;

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    } else {
                        toastr.error($translate.instant('sitnet_teacher_not_found'));
                    }
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

                $scope.newInspection = {
                    "user": {
                        "id": null,
                        "name": null
                    },
                    "exam": {
                        "id": $routeParams.id
                    },
                    "comment": {
                        "comment": ""
                    }
                };

                $scope.examInspectors = function (filter, criteria) {
                    return UserRes.filterUsersByExam.query({
                        role: 'TEACHER',
                        eid: $routeParams.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.setExamInspector = function ($item, $model, $label) {
                    $scope.newInspection.user.id = $item.id;
                    $scope.newInspection.user.name = $item.name;
                };

                $scope.saveInspector = function () {
                    if ($scope.newInspection.user.id && $scope.newInspection.user.id > 0 && $scope.newInspection.exam.id && $scope.newInspection.exam.id > 0) {
                        ExamRes.inspection.insert({
                            eid: $scope.newInspection.exam.id,
                            uid: $scope.newInspection.user.id
                        }, $scope.newInspection, function (inspection) {

                            // reload the list
                            getInspectors();

                            // nullify input field
                            $scope.newInspection.user.name = null;
                            $scope.newInspection.user.id = null;

                        }, function (error) {
                            toastr.error(error.data);
                        });
                    } else {
                        toastr.error($translate.instant('sitnet_teacher_not_found'));
                    }
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

                $scope.newEnrolment = {
                    "user": {
                        "id": null,
                        "name": null
                    },
                    "exam": {
                        "id": $routeParams.id
                    }
                };

                $scope.students = function (filter, criteria) {
                    return UserRes.unenrolledStudents.query({eid: $routeParams.id, q: criteria}).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.setNewEnrolment = function (item) {
                    $scope.newEnrolment.user.id = item.id;
                };

                $scope.addEnrolment = function () {
                    if ($scope.newEnrolment.user.id) {
                        enrolmentService.enrollStudent($scope.newExam, $scope.newEnrolment.user).then(
                            function (enrolment) {

                                // push to the list
                                $scope.newExam.examEnrolments.push(enrolment);

                                // nullify input field
                                $scope.newEnrolment.user.name = null;
                                $scope.newEnrolment.user.id = null;

                            }, function (error) {
                                toastr.error(error.data);

                            });
                    }
                };


                $scope.getGradeDisplayName = function (grade) {
                    return examService.getExamGradeDisplayName(grade.name);
                };

                $scope.getExecutionTypeTranslation = function () {
                    return examService.getExecutionTypeTranslation($scope.newExam.executionType.type);
                };

                var recreateSectionIndices = function () {
                    // set sections and question numbering
                    angular.forEach($scope.newExam.examSections, function (section, index) {
                        section.index = index + 1;
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
                        recreateSectionIndices();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.continueToExam = function () {
                    $location.path("/exams/examTabs/" + $routeParams.id + "/1");
                };

                $scope.setExamDuration = function (duration) {
                    $scope.newExam.duration = duration;
                    $scope.updateExam();
                };

                $scope.checkDuration = function (duration) {
                    return $scope.newExam && $scope.newExam.duration === duration ? "btn-primary" : "";
                };

                $scope.checkGradeScale = function (scale) {
                    if (!$scope.newExam.gradeScale) {
                        return "";
                    }
                    return $scope.newExam.gradeScale.id === scale.id ? "btn-primary" : "";
                };

                $scope.getSelectableScales = function () {
                    if (!$scope.examGradings || !$scope.newExam || !$scope.newExam.course) {
                        return [];
                    }
                    return $scope.examGradings.filter(function (scale) {
                        return $scope.gradeScaleSetting.overridable || !$scope.newExam.course.gradeScale ||
                            $scope.newExam.course.gradeScale.id === scale.id;
                    });
                };

                $scope.checkScaleDisabled = function (scale) {
                    if (!scale || !$scope.newExam.course || !$scope.newExam.course.gradeScale) {
                        return false;
                    }
                    return !$scope.gradeScaleSetting.overridable && $scope.newExam.course.gradeScale.id === scale.id;
                };

                $scope.checkType = function (type) {
                    return $scope.newExam && $scope.newExam.examType.type === type ? "btn-primary" : "";
                };

                $scope.setExamGradeScale = function (grading) {
                    $scope.newExam.gradeScale = grading;
                    $scope.updateExam(true);
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
                            recreateSectionIndices();
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                $scope.renameSection = function (section) {

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, getSectionPayload(section),
                        function (sec) {
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
                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, getSectionPayload(section));
                };

                $scope.clearAllQuestions = function (section) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_all_questions'));
                    dialog.result.then(function (btn) {
                        ExamRes.clearsection.clear({eid: $scope.newExam.id, sid: section.id}, function () {
                            section.sectionQuestions.splice(0, section.sectionQuestions.length);
                            section.lotteryOn = false;
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
                                ExamRes.sections.update({
                                    eid: $scope.newExam.id,
                                    sid: section.id
                                }, getSectionPayload(section));
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                var getUpdate = function (overrides) {
                    var update = {
                        "id": $scope.newExam.id,
                        "name": $scope.newExam.name || "",
                        "examType": $scope.newExam.examType,
                        "instruction": $scope.newExam.instruction || "",
                        "enrollInstruction": $scope.newExam.enrollInstruction || "",
                        "state": $scope.newExam.state,
                        "shared": $scope.newExam.shared,
                        "examActiveStartDate": $scope.newExam.examActiveStartDate ?
                            new Date($scope.newExam.examActiveStartDate).getTime() : undefined,
                        "examActiveEndDate": $scope.newExam.examActiveEndDate ?
                            new Date($scope.newExam.examActiveEndDate).setHours(23, 59, 59, 999) : undefined,
                        "duration": $scope.newExam.duration,
                        "grading": $scope.newExam.gradeScale ? $scope.newExam.gradeScale.id : undefined,
                        "expanded": $scope.newExam.expanded,
                        "evaluationConfig": $scope.autoevaluation.enabled && $scope.canBeAutoEvaluated() ? {
                                releaseType: $scope.selectedReleaseType().name,
                                releaseDate: new Date($scope.newExam.autoEvaluationConfig.releaseDate).getTime(),
                                amountDays: $scope.newExam.autoEvaluationConfig.amountDays,
                                gradeEvaluations: $scope.newExam.autoEvaluationConfig.gradeEvaluations
                            } : null,
                        "trialCount": $scope.newExam.trialCount || undefined,
                        "subjectToLanguageInspection": $scope.newExam.subjectToLanguageInspection,
                        "internalRef": $scope.newExam.internalRef,
                        "objectVersion": $scope.newExam.objectVersion
                    };
                    for (var k in overrides) {
                        if (overrides.hasOwnProperty(k)) {
                            update[k] = overrides[k];
                        }
                    }
                    return update;
                };

                var onUpdate = function (exam, overrideEvaluations) {
                    exam.hasEnrolmentsInEffect = $scope.newExam.hasEnrolmentsInEffect;
                    exam.examSections.sort(function (a, b) {
                        return a.sequenceNumber - b.sequenceNumber;
                    });
                    exam.examSections.forEach(function (es) {
                        es.sectionQuestions.sort(function (a, b) {
                            return a.sequenceNumber - b.sequenceNumber;
                        });
                    });
                    $scope.newExam = exam;
                    prepareGradeScale(exam);
                    prepareAutoEvaluationConfig(overrideEvaluations);
                    recreateSectionIndices();
                    if ($scope.updateTitle) {
                        $scope.updateTitle($scope.newExam);
                    }
                    $scope.newExam.examLanguages.forEach(function (language) {
                        // Use front-end language names always to allow for i18n etc
                        language.name = getLanguageNativeName(language.code);
                    });
                };

                $scope.updateExam = function (overrideEvaluations, dontShowDialog) {

                    var examToSave = getUpdate();

                    if($scope.newExamName!='') { examToSave.name = $scope.newExamName}

                    ExamRes.exams.update({id: $scope.newExam.id}, examToSave,
                        function (exam) {
                            if (!dontShowDialog) {
                                toastr.info($translate.instant("sitnet_exam_saved"));
                            }
                            onUpdate(exam, overrideEvaluations);
                        }, function (error) {
                            if (error.data) {
                                var msg = error.data.message || error.data;
                                toastr.error($translate.instant(msg));
                            }
                        });
                };

                //Called when Preview Button is clicked
                $scope.previewExam = function (fromTab) {
                    //First save the exam, so that
                    //we have something to preview
                    // TODO: Is this really necessary anymore?
                    var examToSave = getUpdate();

                    ExamRes.exams.update({id: examToSave.id}, examToSave,
                        function () {
                            var resource = $scope.newExam.executionType.type === 'PRINTOUT' ? 'printout' : 'preview';
                            $location.path("/exams/" + resource + "/" + $routeParams.id + "/" + fromTab);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                // Called when Save button is clicked
                $scope.saveExam = function () {
                    if (!$scope.newExam.course) {
                        toastr.error($translate.instant('sitnet_course_missing'));
                        return;
                    }
                    if (!$scope.newExam.examLanguages || $scope.newExam.examLanguages.length === 0) {
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

                var isAllowedToUnpublishOrRemove = function (exam) {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !exam.hasEnrolmentsInEffect && exam.children.length === 0;
                };

                // TODO: how should this work when it comes to private exams?
                $scope.unpublishExam = function () {
                    if (isAllowedToUnpublishOrRemove($scope.newExam)) {
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
                    } else {
                        toastr.warning($translate.instant('sitnet_unpublish_not_possible'));
                    }
                };

                $scope.removeExam = function (canRemoveWithoutConfirmation) {
                    if (isAllowedToUnpublishOrRemove($scope.newExam)) {
                        var fn = function () {
                            ExamRes.exams.remove({id: $scope.newExam.id}, function (ex) {
                                toastr.success($translate.instant('sitnet_exam_removed'));
                                $location.path('/');
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        };
                        if (canRemoveWithoutConfirmation) {
                            fn();
                        } else {
                            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                            dialog.result.then(function () {
                                fn();
                            });
                        }
                    } else {
                        toastr.warning($translate.instant('sitnet_exam_removal_not_possible'));
                    }
                };


                // Called when Save and Publish button is clicked
                $scope.saveAndPublishExam = function () {

                    // update the exam for possible changes before saving
                    $scope.updateExam(false, true);
                    var err = readyForPublishing($scope.newExam);
                    $scope.errors = err;
                    if (Object.getOwnPropertyNames(err) && Object.getOwnPropertyNames(err).length !== 0) {

                        $modal.open({
                            templateUrl: EXAM_CONF.TEMPLATES_PATH + 'exam/editor/exam_publish_questions.html',
                            backdrop: 'static',
                            keyboard: true,
                            controller: function ($scope, $uibModalInstance, errors) {
                                $scope.errors = errors;
                                $scope.ok = function () {
                                    $uibModalInstance.dismiss();
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
                                $location.path("/");
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

                var readyForPublishing = function (exam) {

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

                    var isPrintout = $scope.newExam.executionType.type === 'PRINTOUT';
                    if (!isPrintout && !$scope.newExam.examActiveStartDate) {
                        errors.examActiveStartDate = $translate.instant('sitnet_exam_start_date_missing');
                    }

                    if (!isPrintout && !$scope.newExam.examActiveEndDate) {
                        errors.examActiveEndDate = $translate.instant('sitnet_exam_end_date_missing');
                    }
                    if (isPrintout && $scope.newExam.examinationDates.length == 0) {
                        errors.examinationDates = $translate.instant('sitnet_examination_date_missing');
                    }

                    if (countQuestions() === 0) {
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
                    if (['PRIVATE', 'MATURITY'].indexOf(exam.executionType.type) > -1 && exam.examEnrolments.length < 1) {
                        errors.participants = $translate.instant('sitnet_no_participants');
                    }
                    if (exam.executionType.type === 'MATURITY' && !_.isBoolean(exam.subjectToLanguageInspection)) {
                        errors.languageInspection = $translate.instant('sitnet_language_inspection_setting_not_chosen');
                    }

                    if ($scope.autoevaluation.enabled && hasDuplicatePercentages(exam)) {
                        errors.autoevaluation = $translate.instant('sitnet_autoevaluation_percentages_not_unique');
                    }

                    return errors;
                };

                $scope.calculateExamMaxScore = function (exam) {
                    return examService.getMaxScore(exam);
                };

                $scope.moveSection = function (section, from, to) {
                    if (from >= 0 && to >= 0 && from != to) {
                        ExamRes.sectionOrder.update({
                            eid: $scope.newExam.id,
                            from: from,
                            to: to
                        }, function () {
                            recreateSectionIndices();
                            toastr.info($translate.instant("sitnet_sections_reordered"));
                        });
                    }
                };

                $scope.moveQuestion = function (section, from, to) {
                    if (from >= 0 && to >= 0 && from != to) {
                        ExamRes.questionOrder.update({
                            eid: $scope.newExam.id,
                            sid: section.id,
                            from: from,
                            to: to
                        }, function () {
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
                    recreateSectionIndices();
                };

                $scope.toggleDisabled = function (section) {
                    return !section.sectionQuestions || section.sectionQuestions.length < 2;
                };

                function questionPointsMatch(section) {
                    if (!section || !section.sectionQuestions) {
                        return true;
                    }
                    var sectionQuestions = section.sectionQuestions;
                    if (sectionQuestions.length < 1) {
                        return true;
                    }
                    var score = getQuestionScore(sectionQuestions[0]);
                    return sectionQuestions.every(function (sectionQuestion) {
                        return score === getQuestionScore(sectionQuestion);
                    });
                }

                function getQuestionScore(question) {
                    var evaluationType = question.evaluationType;
                    var type = question.question.type;
                    if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
                        return question.maxScore;
                    }
                    if (type === 'WeightedMultipleChoiceQuestion') {
                        return questionService.calculateMaxPoints(question);
                    }
                    return null;
                }

                var getSectionPayload = function (section) {
                    return {
                        id: section.id,
                        name: section.name,
                        lotteryOn: section.lotteryOn,
                        lotteryItemCount: section.lotteryItemCount,
                        description: section.description,
                        expanded: section.expanded
                    };
                };

                $scope.toggleLottery = function (section) {
                    if ($scope.toggleDisabled(section)) {
                        section.lotteryOn = false;
                        return;
                    }

                    if (!questionPointsMatch(section)) {
                        toastr.error($translate.instant('sitnet_error_lottery_points_not_match'));
                        section.lotteryOn = false;
                        return;
                    }

                    ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, getSectionPayload(section),
                        function (sec) {
                            section = sec;
                            if (section.lotteryItemCount === undefined) {
                                section.lotteryItemCount = 1;
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.updateLotteryCount = function (section) {

                    if (!section.lotteryItemCount) {
                        toastr.warning($translate.instant("sitnet_warn_lottery_count"));
                        section.lotteryItemCount = 1;
                    }
                    else {
                        ExamRes.sections.update({eid: $scope.newExam.id, sid: section.id}, getSectionPayload(section),
                            function (sec) {
                                section = sec;
                                toastr.info($translate.instant('sitnet_section_updated'));
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
                    return $scope.newExam && $scope.newExam.trialCount == x ? "btn-primary" : "";
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

                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {

                        $scope.newExam = exam;
                        $scope.isTeacherModal = true;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });

                        $scope.submit = function () {
                            fileService.upload("/app/attachment/exam", $scope.attachmentFile, {examId: $scope.newExam.id}, $scope.newExam, $modalInstance);
                        };

                        $scope.cancel = function () {
                            $modalInstance.dismiss("Cancelled");
                        };

                        // Close modal if user clicked the back button
                        $scope.$on('$routeChangeStart', function () {
                            $modalInstance.dismiss();
                        })

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

                var getQuestionDistribution = function (sectionQuestion) {
                    var deferred = $q.defer();
                    ExamRes.questionDistribution.get({id: sectionQuestion.id}, function (data) {
                        deferred.resolve({distributed: data.distributed});
                    }, function (error) {
                        toastr.error(error.data);
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                var openExamQuestionEditor = function (section, sectionQuestion) {
                    getQuestionDistribution(sectionQuestion).then(function (data) {
                        if (!data.distributed) {
                            // If this is not distributed, treat it as a plain question (or at least trick the user to
                            // believe so)
                            openBaseQuestionEditor(section, sectionQuestion.question, sectionQuestion);
                        } else {
                            // Edit distributed question
                            var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {

                                $scope.lotteryOn = section.lotteryOn;
                                $scope.fromDialog = true;
                                $scope.addEditQuestion = {};
                                $scope.addEditQuestion.id = 0;
                                $scope.addEditQuestion.showForm = true;

                                // Copy so we won't mess up the scope in case user cancels out in the middle of editing
                                $scope.sectionQuestion = angular.copy(sectionQuestion);
                                $scope.addEditQuestion.id = $scope.sectionQuestion.question.id;
                                $scope.baseQuestionId = $scope.sectionQuestion.question.id;

                                $scope.submit = function (baseQuestion, examQuestion) {

                                    questionService.updateDistributedExamQuestion(baseQuestion, examQuestion).then(function (esq) {
                                        toastr.info($translate.instant("sitnet_question_saved"));
                                        $modalInstance.close(esq);
                                        window.onbeforeunload = null;
                                        $scope.addEditQuestion.id = null;
                                    });
                                };

                                $scope.cancelEdit = function () {
                                    $modalInstance.dismiss();
                                    $scope.addEditQuestion.id = null;
                                    window.onbeforeunload = null;
                                };

                                // Close modal if user clicked the back button and no changes made
                                $scope.$on('$routeChangeStart', function () {
                                    if (!window.onbeforeunload) {
                                        $modalInstance.dismiss();
                                    }
                                });

                            }];

                            var modalInstance = $modal.open({
                                templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/editor/dialog_edit_exam_question.html',
                                backdrop: 'static',
                                keyboard: true,
                                controller: ctrl,
                                windowClass: 'question-editor-modal'
                            });

                            modalInstance.result.then(function (data) {
                                if (data) {
                                    // apply changes back to scope
                                    angular.extend(sectionQuestion, data);
                                }
                                modalInstance.dismiss();
                            });
                        }
                    });
                };

                var insertExamQuestion = function (examId, sectionId, questionId, sequenceNumber, modal, silent) {
                    ExamRes.sectionquestions.insert({
                            eid: examId,
                            sid: sectionId,
                            seq: sequenceNumber,
                            qid: questionId
                        }, function (sec) {
                            if (!silent) {
                                toastr.info($translate.instant("sitnet_question_added"));
                            }
                            updateSection(sec, true); // needs manual update as the scope is somehow not automatically refreshed
                            modal.dismiss("done");
                            $rootScope.$emit('questionAdded'); // Emit event for question library.
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                var openBaseQuestionEditor = function (section, question, sectionQuestion, type) {
                    var examId = $scope.newExam.id;
                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                        $scope.lotteryOn = section.lotteryOn;
                        if (!question) {
                            // Create new base question
                            $scope.questionType = type;
                        } else {
                            // Edit base question
                            $scope.baseQuestionId = question.id;
                        }

                        $scope.fromDialog = true;
                        $scope.addEditQuestion = {};
                        $scope.addEditQuestion.id = 0;
                        $scope.addEditQuestion.showForm = true;

                        var saveQuestion = function (baseQuestion) {
                            var errFn = function (error) {
                                toastr.error(error.data);
                            };

                            if (!question) {
                                // Create new base question
                                questionService.createQuestion(baseQuestion).then(function (newQuestion) {
                                    // Now that new base question was created we make an exam section question out of it
                                    insertExamQuestion(examId, section.id, newQuestion.id,
                                        section.sectionQuestions.length, $modalInstance);
                                }, errFn);
                            } else {
                                // Edit undistributed base question
                                questionService.updateQuestion(baseQuestion, true).then(function (updatedQuestion) {
                                    // Reflect changes in base question to exam question as well
                                    ExamSectionQuestionRes.undistributed.update({id: sectionQuestion.id},
                                        function (esq) {
                                            angular.extend(sectionQuestion, esq);
                                            $modalInstance.dismiss("done");
                                            $rootScope.$emit('questionAdded'); // Emit event for question library.
                                        }, errFn);
                                }, errFn);
                            }
                        };

                        $scope.submit = function (baseQuestion) {
                            saveQuestion(baseQuestion);
                            $scope.addEditQuestion.id = null;
                        };

                        $scope.cancelEdit = function () {
                            // Well this is nice now :)
                            $scope.addEditQuestion.id = null;
                            $modalInstance.dismiss("Cancelled");
                        };

                        // Close modal if user clicked the back button and no changes made
                        $scope.$on('$routeChangeStart', function () {
                            if (!window.onbeforeunload) {
                                $modalInstance.dismiss();
                            }
                        });

                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/editor/dialog_new_question.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        windowClass: 'question-editor-modal'
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        modalInstance.dismiss();
                    });
                };


                $scope.openLibrary = function (section) {

                    if (section.lotteryOn) {
                        toastr.error($translate.instant("sitnet_error_drop_disabled_lottery_on"));
                        return;
                    }
                    var examId = $scope.newExam.id;
                    var sectionId = section.id;

                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {

                        $scope.addQuestions = function () {

                            // check that atleast one has been selected
                            var isEmpty = true,
                                boxes = angular.element(".questionToUpdate"),
                                ids = [];

                            var insertQuestion = function (sectionId, questionIds, to, examId) {

                                var sectionQuestions = questionIds.map(function (question) {
                                    return question;
                                }).join(",");

                                ExamRes.sectionquestionsmultiple.insert({
                                        eid: examId,
                                        sid: sectionId,
                                        seq: to,
                                        questions: sectionQuestions
                                    }, function (sec) {
                                        toastr.info($translate.instant("sitnet_question_added"));
                                        $modalInstance.close();
                                    }, function (error) {
                                        toastr.error(error.data);
                                        // remove broken objects
                                        section.sectionQuestions = section.sectionQuestions.filter(function (sq) {
                                            return sq;
                                        });
                                    }
                                );

                            };

                            // calculate the new order number for question sequence
                            // always add question to last spot, because dragndrop
                            // is not in use here
                            var to = (parseInt(section.sectionQuestions.length) + 1);

                            angular.forEach(boxes, function (input) {
                                if (angular.element(input).prop("checked")) {
                                    isEmpty = false;
                                    ids.push(angular.element(input).val());

                                }
                            });

                            if (isEmpty) {
                                toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                            }
                            else {
                                insertQuestion(sectionId, ids, to, examId);
                                //  $modalInstance.dismiss("Saved");
                            }
                        };

                        $scope.cancelEdit = function () {
                            // Well this is nice now :)
                            $modalInstance.dismiss("Cancelled");
                        };

                        // Close modal if user clicked the back button and no changes made
                        $scope.$on('$routeChangeStart', function () {
                            if (!window.onbeforeunload) {
                                $modalInstance.dismiss();
                            }
                        });
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/library.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        windowClass: 'question-editor-modal'
                    });

                    modalInstance.result.then(function () {
                        initializeExam(true);
                    });

                };

                $scope.addNewQuestion = function (section, type) {
                    if (section.lotteryOn) {
                        toastr.error($translate.instant("sitnet_error_drop_disabled_lottery_on"));
                        return;
                    }
                    openBaseQuestionEditor(section, null, null, type);
                };

                $scope.editQuestion = function (section, sectionQuestion) {
                    openExamQuestionEditor(section, sectionQuestion);
                };

                $scope.shortText = function (text, limit) {
                    return questionService.shortText(text, limit);
                };

                $scope.canBeAutoEvaluated = function () {
                    return examService.hasQuestions($scope.newExam) && !examService.hasEssayQuestions($scope.newExam) &&
                        $scope.newExam.gradeScale && $scope.newExam.executionType.type !== 'MATURITY';
                };

                $scope.calculatePointLimit = function (evaluation) {
                    var max = $scope.calculateExamMaxScore($scope.newExam);
                    if (evaluation.percentage === 0 || isNaN(evaluation.percentage)) {
                        return 0;
                    }
                    var ratio = max * evaluation.percentage;
                    return (ratio / 100).toFixed(2);
                };

                var hasDuplicatePercentages = function (exam) {
                    var percentages = exam.autoEvaluationConfig.gradeEvaluations.map(function (e) {
                        return e.percentage;
                    }).sort();
                    for (var i = 0; i < percentages.length - 1; ++i) {
                        if (percentages[i + 1] == percentages[i]) {
                            return true;
                        }
                    }
                    return false;
                };

                $scope.applyFilter = function (type) {
                    $scope.autoevaluation.releaseTypes.forEach(function (rt) {
                        rt.filtered = false;
                    });
                    type.filtered = !type.filtered;
                };

                $scope.selectedReleaseType = function () {
                    var type = null;
                    $scope.autoevaluation.releaseTypes.some(function (rt) {
                        if (rt.filtered) {
                            type = rt;
                            return true;
                        }
                    });
                    return type;
                };

                var filterOwners = function (userId, exam) {

                    var owner = exam.examOwners.filter(function (own) {
                        return (own.id === userId);
                    });
                    return owner.length > 0;
                };


            }]);
}());
