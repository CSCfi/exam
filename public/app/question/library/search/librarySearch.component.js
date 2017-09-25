'use strict';
angular.module('app.question')
    .component('librarySearch', {
        templateUrl: '/assets/app/question/library/search/librarySearch.template.html',
        bindings: {
            onUpdate: '&'
        },
        controller: ['$q', 'Library', 'Session',
            function ($q, Library, Session) {

                var vm = this;

                vm.$onInit = function () {
                    vm.limitations = {};
                    vm.filter = {};
                    vm.user = Session.getUser();

                    var storedData = Library.loadFilters('search');
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

                vm.applyFreeSearchFilter = function () {
                    var results = Library.applyFreeSearchFilter(vm.filter.text, vm.questions);
                    vm.onUpdate({results: results});
                    saveFilters();
                };

                vm.applyOwnerSearchFilter = function () {
                    var results = Library.applyOwnerSearchFilter(vm.filter.owner, vm.questions);
                    vm.onUpdate({results: results});
                };

                var saveFilters = function () {
                    var filters = {
                        exams: vm.exams,
                        courses: vm.courses,
                        tags: vm.tags,
                        text: vm.filter.text
                    };
                    Library.storeFilters(filters, 'search');
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
                    Library.search(getExamIds(), getCourseIds(), getTagIds(), getSectionIds())
                        .then(
                            function (questions) {
                                vm.questions = questions;
                                saveFilters();
                                deferred.resolve();
                            }
                        );
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
                    Library.courseApi.query({
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
                    Library.examApi.query({
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
                    var examIds = getExamIds();
                    var courseIds = getCourseIds();
                    Library.tagApi.query({
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
                    });
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

            }
        ]
    });

