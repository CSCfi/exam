'use strict';
angular.module('app.question')
    .controller('LibraryCtrl', ['dialogs', '$q', '$filter', '$sce', '$scope', '$rootScope', '$location',
        '$translate', 'Session', 'QuestionRes', 'questionService', 'ExamRes', 'CourseRes',
        'TagRes', 'UserRes', 'EXAM_CONF',
        function (dialogs, $q, $filter, $sce, $scope, $rootScope, $location,
                  $translate, Session, QuestionRes, questionService, ExamRes, CourseRes,
                  TagRes, UserRes, EXAM_CONF) {

            var step = 100;

            $scope.pageSize = 25;
            $scope.courses = [];
            $scope.exams = [];
            $scope.tags = [];
            $scope.filteredQuestions = [];
            $scope.visibleQuestions = [];
            $scope.maxVisible = step;
            $scope.limitations = {};
            $scope.filter = {};
            $scope.moreQuestions = false;
            $scope.addEditQuestion = {};
            $scope.addEditQuestion.showForm = false;
            $scope.libCtrl = {};
            $scope.libCtrl.from = true;

            $scope.templates = {
                newQuestion: EXAM_CONF.TEMPLATES_PATH + "question/editor/question.html",
                dialogQuestion: EXAM_CONF.TEMPLATES_PATH + "question/editor/dialog_question.html",
                librarySearch: EXAM_CONF.TEMPLATES_PATH + "question/library_search.html",
                libraryResults: EXAM_CONF.TEMPLATES_PATH + "question/library_results.html"
            };

            $scope.session = Session;

            $scope.user = Session.getUser();

            var htmlDecode = function (text) {
                return $('<div/>').html(text).text();
            };

            $scope.constructQuestion = function () {
                if (!$scope.addEditQuestion.showForm) {
                    $scope.addEditQuestion.showForm = true;
                    $scope.baseQuestionId = null;
                }
                else {
                    $scope.addEditQuestion.showForm = false;
                    $scope.baseQuestionId = null;
                }
                ;
            }

            $scope.setBaseQuestionId = function (questionId) {

                $scope.addEditQuestion.id = questionId;
                $scope.baseQuestionId = questionId;
                $scope.addEditQuestion.showForm = true
            }


            $scope.applyFreeSearchFilter = function () {
                if ($scope.filter.text) {
                    $scope.filteredQuestions = $scope.questions.filter(function (question) {
                        var re = new RegExp($scope.filter.text, 'i');

                        var isMatch = question.question && htmlDecode(question.question).match(re);
                        if (isMatch) {
                            return true;
                        }
                        // match course code
                        return question.examSectionQuestions.filter(function (esq) {
                                // Course can be empty in case of a copied exam
                                return esq.examSection.exam.course && esq.examSection.exam.course.code.match(re);
                            }).length > 0;
                    });
                } else {
                    $scope.filteredQuestions = $scope.questions;
                }
                limitQuestions();
            };


            $scope.applyOwnerSearchFilter = function () {
                if ($scope.filter.owner) {
                    $scope.filteredQuestions = $scope.questions.filter(function (question) {
                        var re = new RegExp($scope.filter.owner, 'i');
                        var owner = question.creator.firstName + " " + question.creator.lastName;
                        return owner.match(re);
                    });
                }
            };


            $scope.showMore = function () {
                $scope.maxVisible = $scope.maxVisible + step;
                limitQuestions();
            };

            var limitQuestions = function () {
                if ($scope.filteredQuestions && $scope.filteredQuestions.length > $scope.maxVisible) {
                    $scope.moreQuestions = true;
                    var i = 0;
                    $scope.visibleQuestions = $scope.filteredQuestions.filter(function (question) {
                        return ++i <= $scope.maxVisible;
                    });
                } else {
                    $scope.moreQuestions = false;
                    $scope.visibleQuestions = $scope.filteredQuestions;
                }
            };

            $scope.selectAll = function (selectAllCssClass, checkboxesCssClass) {
                var isSelected = angular.element("." + selectAllCssClass).prop("checked");
                angular.forEach(angular.element("." + checkboxesCssClass), function (input) {
                    angular.element(input).prop("checked", isSelected);
                });
            };

            $scope.countSelections = function () {
                $scope.total = 0;
                angular.forEach(angular.element(".questionToUpdate"), function (input) {
                    if (angular.element(input).prop("checked")) {
                        $scope.total += 1;
                    }

                });
            };

            $scope.onTeacherSelect = function ($item, $model, $label) {
                $scope.newTeacher = $item;
            };

            $scope.ownerProcess = false;
            $scope.addOwnerForSelected = function () {
                $scope.ownerProcess = true;

                // check that atleast one has been selected
                var isEmpty = true,
                    boxes = angular.element(".questionToUpdate"),
                    ids = [];

                angular.forEach(boxes, function (input) {
                    if (angular.element(input).prop("checked")) {
                        isEmpty = false;
                        ids.push(angular.element(input).val());
                    }
                });

                if (isEmpty) {
                    toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                    $scope.ownerProcess = false;
                    return;
                }
                if (!$scope.newTeacher) {
                    toastr.warning($translate.instant('sitnet_add_question_owner'));
                    $scope.ownerProcess = false;
                    return;
                }

                var data = {
                    "uid": $scope.newTeacher.id,
                    "questionIds": ids.toString()
                };

                QuestionRes.questionOwner.update(data,
                    function () {
                        toastr.info($translate.instant('sitnet_question_owner_added'));
                        query();
                    }, function () {
                        toastr.info($translate.instant('sitnet_update_failed'));
                    });
                $scope.ownerProcess = false;
            };

            $scope.getTags = function () {
                var courses = $scope.courses.filter(function (course) {
                    return course && course.filtered;
                });
                var exams = $scope.exams.filter(function (exam) {
                    return exam.filtered;
                });
                var tags = $scope.tags.filter(function (tag) {
                    return tag.filtered;
                });
                return courses.concat(exams).concat(tags);
            };

            $scope.teachers = UserRes.usersByRole.query({role: "TEACHER"});

            var getCourseIds = function () {
                return $scope.courses.filter(function (course) {
                    return course && course.filtered;
                }).map(function (course) {
                    return course.id;
                });
            };

            var getExamIds = function () {
                return $scope.exams.filter(function (exam) {
                    return exam.filtered;
                }).map(function (exam) {
                    return exam.id;
                });
            };

            var getTagIds = function () {
                return $scope.tags.filter(function (tag) {
                    return !tag.isSectionTag && tag.filtered;
                }).map(function (tag) {
                    return tag.id;
                });
            };

            var getSectionIds = function () {
                return $scope.tags.filter(function (tag) {
                    return tag.isSectionTag && tag.filtered;
                }).map(function (section) {
                    return section.id;
                });
            };

            var query = function () {
                var deferred = $q.defer();
                QuestionRes.questionlist.query({
                    exam: getExamIds(),
                    course: getCourseIds(),
                    tag: getTagIds(),
                    section: getSectionIds()
                }, function (data) {
                    data.map(function (item) {
                        switch (item.type) {
                            case "MultipleChoiceQuestion":
                                item.icon = "fa-list-ul";
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                item.icon = "fa-balance-scale";
                                break;
                            case "EssayQuestion":
                                item.icon = "fa-edit";
                                break;
                            case "ClozeTestQuestion":
                                item.icon = "fa-commenting-o";
                                break;
                        }
                        return item;
                    });
                    $scope.questions = $scope.filteredQuestions = questionService.applyFilter(data);

                    $scope.questions.forEach(function (q) {
                        if (q.defaultEvaluationType === "Points" || q.type === 'ClozeTestQuestion' || q.type === 'MultipleChoiceQuestion') {
                            q.displayedMaxScore = q.defaultMaxScore;
                        } else if (q.defaultEvaluationType === "Selection") {
                            q.displayedMaxScore = 'sitnet_evaluation_select';
                        } else if (q.type === "WeightedMultipleChoiceQuestion") {
                            q.displayedMaxScore = $scope.calculateMaxPoints(q);
                        }
                        q.typeOrd = ['EssayQuestion',
                            'ClozeTestQuestion',
                            'MultipleChoiceQuestion',
                            'WeightedMultipleChoiceQuestion'].indexOf(q.type);
                        q.ownerAggregate = q.creator.lastName + q.creator.firstName;
                        q.allowedToRemove = q.examSectionQuestions.filter(function (esq) {
                                var exam = esq.examSection.exam;
                                return exam.state === 'PUBLISHED' && exam.examActiveEndDate > new Date().getTime();
                            }).length === 0;
                    });
                    var filters = {
                        exams: $scope.exams,
                        courses: $scope.courses,
                        tags: $scope.tags
                    };
                    questionService.storeFilters(filters);
                    $scope.currentPage = 0;
                    limitQuestions();
                    deferred.resolve();
                });
                return deferred.promise;
            };

            var union = function (filtered, tags) {
                var filteredIds = filtered.map(function (tag) {
                    return tag.id;
                });
                return filtered.concat(tags.filter(function (tag) {
                    return filteredIds.indexOf(tag.id) === -1;
                }));
            };

            $scope.listCourses = function () {
                $scope.courses = $scope.courses.filter(function (course) {
                    return course.filtered;
                });
                var deferred = $q.defer();
                CourseRes.userCourses.query({
                    examIds: getExamIds(),
                    tagIds: getTagIds(),
                    sectionIds: getSectionIds()
                }, function (data) {
                    $scope.courses = union($scope.courses, data);
                    deferred.resolve();
                });
                return deferred.promise;
            };

            $scope.listExams = function () {
                $scope.exams = $scope.exams.filter(function (exam) {
                    return exam.filtered;
                });
                var deferred = $q.defer();
                ExamRes.examsearch.query({
                    courseIds: getCourseIds(),
                    sectionIds: getSectionIds(),
                    tagIds: getTagIds()
                }, function (data) {
                    $scope.exams = union($scope.exams, data);
                    deferred.resolve();
                });
                return deferred.promise;
            };

            var doListTags = function (sections) {
                var deferred = $q.defer();
                var examIds = getExamIds();
                var courseIds = getCourseIds();
                TagRes.tags.query({
                    examIds: examIds,
                    courseIds: courseIds,
                    sectionIds: getSectionIds()
                }, function (data) {
                    $scope.tags = union($scope.tags, data);
                    var examSections = [];
                    $scope.exams.filter(function (e) {
                        var examMatch = examIds.length === 0 || examIds.indexOf(e.id) > -1;
                        var courseMatch = courseIds.length === 0 || courseIds.indexOf(e.course.id) > -1;
                        return examMatch && courseMatch;
                    }).forEach(function (exam) {
                        examSections = examSections.concat(exam.examSections.filter(function (es) {
                            return es.name;
                        }).map(function (section) {
                            section.isSectionTag = true;
                            return section;
                        }));
                    });
                    $scope.tags = $scope.tags.concat(union(sections, examSections));
                    deferred.resolve();
                });
                return deferred.promise;
            };

            $scope.listTags = function () {
                $scope.tags = $scope.tags.filter(function (tag) {
                    return tag.filtered && !tag.isSectionTag;
                });
                var sections = $scope.tags.filter(function (tag) {
                    return tag.filtered && tag.isSectionTag;
                });
                if (getExamIds().length === 0) {
                    $scope.listExams().then(function () {
                        return doListTags(sections);
                    });
                } else {
                    return doListTags(sections);
                }
            };

            $scope.applyFilter = function (tag) {
                tag.filtered = !tag.filtered;
                query();
            };

            $scope.calculateMaxPoints = function (question) {
                return questionService.calculateDefaultMaxPoints(question);
            };

            $scope.stripHtml = function (text) {
                if (text && text.indexOf("math-tex") === -1) {
                    return String(text).replace(/<[^>]+>/gm, '');
                }
                return text;
            };

            $scope.shortText = function (text) {

                if (text && text.indexOf("math-tex") === -1) {
                    // remove HTML tags
                    var str = String(text).replace(/<[^>]+>/gm, '');

                    // shorten string
                    var maxLength = 40;
                    if (str.length > maxLength) {
                        str = String(str).substr(0, maxLength) + "...";
                    }
                    return str;
                }
                return text;
            };

            /**
             * if mathjax formula then no cut
             **/
            $scope.shortText = function (text, maxLength) {
                return questionService.shortText(text, maxLength);
            };

            $scope.longTextIfNotMath = function (text) {
                return questionService.longTextIfNotMath(text);
            };

            $scope.createQuestion = function (type) {
                $location.path("/questions/new/" + type);
            };

            $scope.deleteQuestion = function (question) {
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question_from_library_only'));
                dialog.result.then(function (btn) {
                    QuestionRes.questions.delete({id: question.id}, function () {
                        $scope.questions.splice($scope.questions.indexOf(question), 1);
                        $scope.applyFreeSearchFilter();
                        toastr.info($translate.instant('sitnet_question_removed'));
                    });
                });
            };

            $scope.copyQuestion = function (question, fromDialog) {
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_copy_question'));
                dialog.result.then(function (btn) {
                    QuestionRes.question.copy({id: question.id}, function (copy) {
                        toastr.info($translate.instant('sitnet_question_copied'));
                        if (fromDialog) {
                            $scope.setBaseQuestionId(copy.id);
                        }
                        else {
                            $location.path("/questions/" + copy.id);
                        }
                    });
                });
            };

            $scope.verticalText = function (textClass) {
                var text = "Add all";
                $scope.$watch(
                    function () {
                        text = $translate.instant('sitnet_add_all');
                        return text;
                    },
                    function (data) {
                        document.getElementsByClassName(textClass)[0].innerHTML =
                            '<span>' + text.split('').join('</span><span>') + '</span>';
                    }
                );

            };

            $scope.truncate = function (content, offset) {
                if (content) {
                    return $filter('truncate')(content, offset);
                }
            };

            $scope.trustAsHtml = function (content) {
                return $sce.trustAsHtml(content);
            };

            $rootScope.$on('questionAdded', query);
            $rootScope.$on('questionUpdated', query);

            var storedData = questionService.loadFilters();
            if (storedData.filters) {
                //$scope.questions = $scope.filteredQuestions = storedData.questions;
                $scope.exams = storedData.filters.exams || [];
                $scope.courses = storedData.filters.courses || [];
                $scope.tags = storedData.filters.tags || [];
                $scope.currentPage = 0;
                query().then(function () {
                    limitQuestions();
                });
            } else {
                query();
            }

        }
    ]);

