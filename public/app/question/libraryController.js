(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('LibraryCtrl', ['dialogs', '$q', '$scope', '$rootScope', '$location', '$translate', 'sessionService', 'QuestionRes',
            'questionService', 'ExamRes', 'CourseRes', 'TagRes', 'UserRes',
            function (dialogs, $q, $scope, $rootScope, $location, $translate, sessionService, QuestionRes, questionService, ExamRes, CourseRes, TagRes, UserRes) {

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

                $scope.session = sessionService;

                $scope.user = sessionService.getUser();

                var htmlDecode = function (text) {
                    return $('<div/>').html(text).text();
                };

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
                    QuestionRes.questionlist.query({
                        exam: getExamIds(),
                        course: getCourseIds(),
                        tag: getTagIds(),
                        section: getSectionIds()
                    }, function (data) {
                        data.map(function (item) {
                            var icon;
                            if (item.type === "MultipleChoiceQuestion") {
                                icon = "fa-list-ul";
                            } else if (item.type === "WeightedMultipleChoiceQuestion") {
                                icon = "fa-balance-scale";
                            } else {
                                icon = "fa-edit";
                            }
                            item.icon = icon;
                            return item;
                        });
                        $scope.questions = $scope.filteredQuestions = questionService.applyFilter(data);

                        $scope.questions.forEach(function (q) {
                            if (q.defaultEvaluationType === "Points" || q.type === 'MultipleChoiceQuestion') {
                                q.displayedMaxScore = q.defaultMaxScore;
                            } else if (q.defaultEvaluationType === "Selection") {
                                q.displayedMaxScore = 'sitnet_evaluation_select';
                            } else if (q.type === "WeightedMultipleChoiceQuestion") {
                                q.displayedMaxScore = $scope.calculateMaxPoints(q);
                            }
                            q.typeOrd = ['EssayQuestion',
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
                            tags: $scope.tags,
                            text: $scope.filter.text
                        };
                        questionService.storeQuestions($scope.questions, filters);
                        $scope.currentPage = 0;
                        limitQuestions();
                    });
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
                    questionService.createQuestion(type);
                };

                $scope.deleteQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question_from_library_only'));
                    dialog.result.then(function (btn) {
                        QuestionRes.questions.delete({id: question.id}, function () {
                            $scope.questions.splice($scope.questions.indexOf(question), 1);
                            toastr.info($translate.instant('sitnet_question_removed'));
                            // Clear cache to trigger a refresh now that there is a new entry
                            questionService.clearQuestions();
                        });
                    });
                };

                $scope.copyQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_copy_question'));
                    dialog.result.then(function (btn) {
                        QuestionRes.question.copy({id: question.id}, function (copy) {
                            toastr.info($translate.instant('sitnet_question_copied'));
                            $location.path("/questions/" + copy.id);
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
                            document.getElementsByClassName(textClass)[0].innerHTML = '<span>' + text.split('').join('</span><span>') + '</span>';
                        }
                    );

                };

                var refresh = function () {
                    questionService.clearQuestions();
                    query();
                };

                $rootScope.$on('questionAdded', refresh);
                $rootScope.$on('questionUpdated', refresh);

                var storedData = questionService.loadQuestions();
                if (storedData.questions) {
                    $scope.questions = $scope.filteredQuestions = storedData.questions;
                    $scope.exams = storedData.filters.exams;
                    $scope.courses = storedData.filters.courses;
                    $scope.tags = storedData.filters.tags;
                    $scope.filter.text = storedData.filters.text;
                    $scope.currentPage = 0;
                    limitQuestions();
                    $scope.applyFreeSearchFilter();
                } else {
                    query();
                }

            }
        ]);
}());
