(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LibraryCtrl', ['dialogs', '$q', '$scope', '$location', '$translate', 'sessionService', 'QuestionRes',
            'questionService', 'ExamRes', 'CourseRes', 'TagRes',
            function (dialogs, $q, $scope, $location, $translate, sessionService, QuestionRes, questionService, ExamRes, CourseRes, TagRes) {

                $scope.pageSize = 25;
                $scope.courses = [];
                $scope.exams = [];
                $scope.tags = [];
                $scope.filteredQuestions = [];

                $scope.applyFreeSearchFilter = function () {
                    if ($scope.selected) {
                        $scope.filteredQuestions = $scope.questions.filter(function (question) {
                            var re = new RegExp($scope.selected, 'i');
                            return question.question && question.question.match(re);
                        })
                    } else {
                        $scope.filteredQuestions = $scope.questions;
                    }
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
                            switch (item.type) {
                                case "MultipleChoiceQuestion":
                                    icon = "fa-list-ul";
                                    break;
                                //case "EssayQuestion":
                                default:
                                    icon = "fa-edit";
                                    break;
                            }
                            item.icon = icon;
                            return item;
                        });
                        $scope.questions = $scope.filteredQuestions = data;
                        $scope.currentPage = 0;
                    });
                };

                var union = function (filtered, tags) {
                    var filteredIds = filtered.map(function(tag) {
                        return tag.id;
                    });
                    return filtered.concat(tags.filter(function(tag) {
                        return filteredIds.indexOf(tag.id) === -1;
                    }));
                };

                $scope.listCourses = function() {
                    $scope.courses = $scope.courses.filter(function(course) {
                       return course.filtered;
                    });
                    var deferred = $q.defer();
                    CourseRes.userCourses.query({id: sessionService.getUser().id, examIds: getExamIds(), tagIds : getTagIds(), sectionIds : getSectionIds()}, function(data) {
                        $scope.courses = union($scope.courses, data);
                        deferred.resolve();
                    });
                    return deferred.promise;
                };

                $scope.listExams = function() {
                    $scope.exams = $scope.exams.filter(function(exam) {
                        return exam.filtered;
                    });
                    var deferred = $q.defer();
                    ExamRes.examsearch.query({courseIds: getCourseIds(), sectionIds: getSectionIds(), tagIds: getTagIds()}, function(data) {
                        $scope.exams = union($scope.exams, data);
                        deferred.resolve();
                    });
                    return deferred.promise;
                };

                var handleTags = function(sections) {
                    $scope.tags = union($scope.tags, data);
                    var examSections = [];
                    $scope.exams.forEach(function (exam) {
                        examSections = examSections.concat(exam.examSections.map(function (section) {
                            section.isSectionTag = true;
                            return section;
                        }));
                    });
                    $scope.tags = $scope.tags.concat(union(sections, examSections));
                };

                var doListTags = function(sections) {
                    var deferred = $q.defer();
                    TagRes.tags.query({examIds: getExamIds(), courseIds : getCourseIds(), sectionIds : getSectionIds()}, function(data) {
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

                $scope.listTags = function() {
                    $scope.tags = $scope.tags.filter(function (tag) {
                        return tag.filtered && !tag.isSectionTag;
                    });
                    var sections = $scope.tags.filter(function (tag) {
                        return tag.filtered && tag.isSectionTag;
                    });
                    if (getExamIds().length === 0) {
                        $scope.listExams().then(function () {
                            return doListTags(sections);
                        })
                    }
                    return doListTags(sections);
                };

                $scope.applyFilter = function (tag) {
                    tag.filtered = !tag.filtered;
                    query();
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

                function decodeHtml(html) {
                    var txt = document.createElement("textarea");
                    txt.innerHTML = html;
                    return txt.value;
                }

                /**
                 * if mathjax formula then no cut
                 **/
                $scope.shortText = function (text, maxLength) {

                    if (text && text.length > 0 && text.indexOf("math-tex") === -1) {
                        // remove HTML tags
                        var str = String(text).replace(/<[^>]+>/gm, '');
                        // shorten string
                        str = decodeHtml(str);
                        return str.length + 3 > maxLength ? str.substr(0, maxLength) + "..." : str;
                    }
                    return text ? decodeHtml(text) : "";
                };

                $scope.longTextIfNotMath = function (text) {

                    if (text && text.length > 0 && text.indexOf("math-tex") === -1) {
                        // remove HTML tags
                        var str = String(text).replace(/<[^>]+>/gm, '');
                        // shorten string
                        return decodeHtml(str);
                    }
                    return "";
                };

                $scope.createQuestion = function (type) {
                    questionService.createQuestion(type);
                };

                $scope.deleteQuestion = function (question) {
                    var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate('sitnet_remove_question_from_library_only'));
                    dialog.result.then(function (btn) {
                        $scope.questions.splice($scope.questions.indexOf(question), 1);

                        QuestionRes.questions.delete({'id': question.id}, function () {
                            toastr.info($translate('sitnet_question_removed'));
                        });
                    });
                };

                $scope.verticalText = function (textClass) {
                    var text = "Add all";
                    $scope.$watch(
                        function () {
                            text = $translate('sitnet_add_all');
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