(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('LibraryCtrl', ['dialogs', '$q', '$scope', '$location', '$translate', 'sessionService', 'QuestionRes',
            'questionService', 'ExamRes', 'CourseRes', 'TagRes', 'UserRes',
            function (dialogs, $q, $scope, $location, $translate, sessionService, QuestionRes, questionService, ExamRes, CourseRes, TagRes, UserRes) {

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
                            angular.forEach(question.children, function (child) {
                                if (child &&
                                    child.examSectionQuestion &&
                                    child.examSectionQuestion.examSection &&
                                    child.examSectionQuestion.examSection.exam &&
                                    child.examSectionQuestion.examSection.exam.course &&
                                    child.examSectionQuestion.examSection.exam.course.code &&
                                    child.examSectionQuestion.examSection.exam.course.code.match(re)) {
                                    isMatch = true;
                                }
                            });
                            return isMatch;
                        });
                    } else {
                        $scope.filteredQuestions = $scope.questions;
                    }
                    limitQuestions();
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

                //$scope.newTeacher = {};

                $scope.onTeacherSelect = function ($item, $model, $label) {
                    $scope.newTeacher = $item;
                };

                $scope.ownerProcess = false;
                $scope.moveSelected = function () {
                    $scope.ownerProcess = true;

                    // check that atleast one has been selected
                    var isEmpty = true,
                        boxes = angular.element(".questionToMove"),
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
                        toastr.warning($translate.instant('sitnet_select_teacher_to_move_the_questions_to'));
                        $scope.ownerProcess = false;
                        return;
                    }

                    // print to file
                    var questionToMove = {
                        "uid": $scope.newTeacher.id,
                        "questionIds": ids.toString()
                    };

                    QuestionRes.questionOwner.update(questionToMove,
                        function (result) {
                            toastr.info($translate.instant('sitnet_question_owner_changed'));
                            query();
                        }, function (error) {
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
                            } else {
                                icon = "fa-edit";
                            }
                            item.icon = icon;
                            return item;
                        });
                        $scope.questions = $scope.filteredQuestions = data;
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
                        id: sessionService.getUser().id,
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
                    TagRes.tags.query({
                        examIds: getExamIds(),
                        courseIds: getCourseIds(),
                        sectionIds: getSectionIds()
                    }, function (data) {
                        $scope.tags = union($scope.tags, data);
                        var examSections = [];
                        $scope.exams.forEach(function (exam) {
                            examSections = examSections.concat(exam.examSections.map(function (section) {
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
                    }
                    return doListTags(sections);
                };

                $scope.applyFilter = function (tag) {
                    tag.filtered = !tag.filtered;
                    query();
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
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
                        });
                    });
                };

                $scope.copyQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_copy_question'));
                    dialog.result.then(function (btn) {
                        QuestionRes.question.copy({id: question.id}, function (copy) {
                            $scope.questions.unshift(copy);
                            toastr.info($translate.instant('sitnet_question_copied'));
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

                query();

            }]);
}());