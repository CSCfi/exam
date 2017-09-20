'use strict';
angular.module('app.question')
    .component('librarySearch', {
        templateUrl: '/assets/app/question/library/search/librarySearch.template.html',
        bindings: {
            onUpdate: '&'
        },
        controller: ['$q', 'Session', 'QuestionRes', 'questionService', 'ExamRes', 'CourseRes', 'TagRes',
            function ($q, Session, QuestionRes, questionService, ExamRes, CourseRes, TagRes) {

                var vm = this;

                vm.$onInit = function () {
                    vm.limitations = {};
                    vm.filter = {};
                    vm.user = Session.getUser();

                    var storedData = questionService.loadFilters('search');
                    if (storedData.filters) {
                        vm.exams = storedData.filters.exams || [];
                        vm.courses = storedData.filters.courses || [];
                        vm.tags = storedData.filters.tags || [];
                        vm.filter.text = storedData.filters.text;
                        query().then(function () {
                            if (vm.filter.text) {
                                vm.applyFreeSearchFilter();
                            } else {
                                vm.onUpdate({results: vm.questions});
                            }
                        });
                    } else {
                        vm.courses = [];
                        vm.exams = [];
                        vm.tags = [];
                        query().then(function () {
                            vm.onUpdate({results: vm.questions});
                        });
                    }
                };


                var htmlDecode = function (text) {
                    return $('<div/>').html(text).text();
                };

                vm.applyFreeSearchFilter = function () {
                    if (vm.filter.text) {
                        var filtered = vm.questions.filter(function (question) {
                            var re = new RegExp(vm.filter.text, 'i');

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
                        vm.onUpdate({results: filtered});
                    } else {
                        vm.onUpdate({results: vm.questions});
                    }
                    saveFilters();

                };

                vm.applyOwnerSearchFilter = function () {
                    if (vm.filter.owner) {
                        var filtered = vm.questions.filter(function (question) {
                            var re = new RegExp(vm.filter.owner, 'i');
                            var owner = question.creator.firstName + ' ' + question.creator.lastName;
                            return owner.match(re);
                        });
                        vm.onUpdate({results: filtered});
                    } else {
                        vm.onUpdate({results: vm.questions});
                    }
                };

                var saveFilters = function () {
                    var filters = {
                        exams: vm.exams,
                        courses: vm.courses,
                        tags: vm.tags,
                        text: vm.filter.text
                    };
                    questionService.storeFilters(filters, 'search');
                };

                var getCourseIds = function () {
                    return vm.courses.filter(function (course) {
                        return course && course.filtered;
                    }).map(function (course) {
                        return course.id;
                    });
                };

                var getExamIds = function () {
                    return vm.exams.filter(function (exam) {
                        return exam.filtered;
                    }).map(function (exam) {
                        return exam.id;
                    });
                };

                var getTagIds = function () {
                    return vm.tags.filter(function (tag) {
                        return !tag.isSectionTag && tag.filtered;
                    }).map(function (tag) {
                        return tag.id;
                    });
                };

                var getSectionIds = function () {
                    return vm.tags.filter(function (tag) {
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
                                case 'MultipleChoiceQuestion':
                                    item.icon = 'fa-list-ul';
                                    break;
                                case 'WeightedMultipleChoiceQuestion':
                                    item.icon = 'fa-balance-scale';
                                    break;
                                case 'EssayQuestion':
                                    item.icon = 'fa-edit';
                                    break;
                                case 'ClozeTestQuestion':
                                    item.icon = 'fa-commenting-o';
                                    break;
                            }
                            return item;
                        });
                        vm.questions = questionService.applyFilter(data);

                        vm.questions.forEach(function (q) {
                            if (q.defaultEvaluationType === 'Points' || q.type === 'ClozeTestQuestion' || q.type === 'MultipleChoiceQuestion') {
                                q.displayedMaxScore = q.defaultMaxScore;
                            } else if (q.defaultEvaluationType === 'Selection') {
                                q.displayedMaxScore = 'sitnet_evaluation_select';
                            } else if (q.type === 'WeightedMultipleChoiceQuestion') {
                                q.displayedMaxScore = calculateMaxPoints(q);
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
                        saveFilters();

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

                vm.listCourses = function () {
                    vm.courses = vm.courses.filter(function (course) {
                        return course.filtered;
                    });
                    var deferred = $q.defer();
                    CourseRes.userCourses.query({
                        examIds: getExamIds(),
                        tagIds: getTagIds(),
                        sectionIds: getSectionIds()
                    }, function (data) {
                        vm.courses = union(vm.courses, data);
                        deferred.resolve();
                    });
                    return deferred.promise;
                };

                vm.listExams = function () {
                    vm.exams = vm.exams.filter(function (exam) {
                        return exam.filtered;
                    });
                    var deferred = $q.defer();
                    ExamRes.examsearch.query({
                        courseIds: getCourseIds(),
                        sectionIds: getSectionIds(),
                        tagIds: getTagIds()
                    }, function (data) {
                        vm.exams = union(vm.exams, data);
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
                        vm.tags = union(vm.tags, data);
                        var examSections = [];
                        vm.exams.filter(function (e) {
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
                        vm.tags = vm.tags.concat(union(sections, examSections));
                        deferred.resolve();
                    });
                    return deferred.promise;
                };

                vm.listTags = function () {
                    vm.tags = vm.tags.filter(function (tag) {
                        return tag.filtered && !tag.isSectionTag;
                    });
                    var sections = vm.tags.filter(function (tag) {
                        return tag.filtered && tag.isSectionTag;
                    });
                    if (getExamIds().length === 0) {
                        vm.listExams().then(function () {
                            return doListTags(sections);
                        });
                    } else {
                        return doListTags(sections);
                    }
                };

                vm.getTags = function () {
                    var courses = vm.courses.filter(function (course) {
                        return course && course.filtered;
                    });
                    var exams = vm.exams.filter(function (exam) {
                        return exam.filtered;
                    });
                    var tags = vm.tags.filter(function (tag) {
                        return tag.filtered;
                    });
                    return courses.concat(exams).concat(tags);
                };

                vm.applyFilter = function (tag) {
                    tag.filtered = !tag.filtered;
                    query().then(function () {
                        vm.applyFreeSearchFilter();
                    });
                };

                var calculateMaxPoints = function (question) {
                    return questionService.calculateDefaultMaxPoints(question);
                };

            }
        ]
    });

