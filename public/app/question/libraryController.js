(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LibraryCtrl', ['dialogs', '$scope', '$location', '$translate', 'sessionService', 'QuestionRes',
            'questionService', 'ExamRes', 'CourseRes', 'TagRes',
            function (dialogs, $scope, $location, $translate, sessionService, QuestionRes, questionService, ExamRes, CourseRes, TagRes) {

                $scope.pageSize = 25;
                $scope.courses = [];
                $scope.exams = [];
                $scope.tags = [];
                $scope.filteredQuestions = [];

                $scope.applyFreeSearchFilter = function (paginate) {
                    var lower = paginate ? $scope.currentPage * $scope.pageSize : 0;
                    var upper = paginate ? lower + $scope.pageSize : $scope.questions.length;
                    if ($scope.selected) {
                        $scope.filteredQuestions = $scope.questions.slice(lower, upper).filter(function(question) {
                            if (!question.question) return false;
                            var re = new RegExp($scope.selected, 'i');
                            return question.question.match(re);
                        })
                    } else {
                        $scope.filteredQuestions = $scope.questions;
                    }
                };

                $scope.getTags = function () {
                    var courses = $scope.courses.filter(function (course) {
                        return course.filtered;
                    });
                    var exams = $scope.exams.filter(function (exam) {
                        return exam.filtered;
                    });
                    var tags = $scope.tags.filter(function (tag) {
                        return tag.filtered;
                    });
                    return courses.concat(exams).concat(tags);
                };

                var query = function () {
                    var courseIds = $scope.courses.filter(function (course) {
                        return course.filtered;
                    }).map(function (course) {
                        return course.id;
                    });
                    var examIds = $scope.exams.filter(function (exam) {
                        return exam.filtered;
                    }).map(function (exam) {
                        return exam.id;
                    });
                    var tagIds = $scope.tags.filter(function (tag) {
                        return !tag.isSectionTag && tag.filtered;
                    }).map(function (tag) {
                        return tag.id;
                    });
                    var sectionIds = $scope.tags.filter(function (tag) {
                        return tag.isSectionTag && tag.filtered;
                    }).map(function (section) {
                        return section.id;
                    });
                    QuestionRes.questionlist.query({
                        exam: examIds,
                        course: courseIds,
                        tag: tagIds,
                        section: sectionIds
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

                query();

                $scope.removeTag = function (tag) {
                    tag.filtered = false;
                    query();
                };

                // First get exams, then get the tags and combine those with exam sections
                ExamRes.exams.query(function (data) {
                    $scope.exams = data;
                    TagRes.tags.query(function (data) {
                        $scope.tags = data;
                        $scope.exams.forEach(function (exam) {
                            $scope.tags = $scope.tags.concat(exam.examSections.map(function (section) {
                                section.isSectionTag = true;
                                return section;
                            }));
                        });
                    });
                });

                CourseRes.userCourses.query({id: sessionService.getUser().id}, function (data) {
                    $scope.courses = data;
                });

                $scope.setExamFilter = function (exam) {
                    exam.filtered = !exam.filtered;
                    query();
                };

                $scope.setCourseFilter = function (course) {
                    course.filtered = !course.filtered;
                    query();
                };

                $scope.setTagFilter = function (tag) {
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
                        // reomve HTML tags
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
            }]);
}());