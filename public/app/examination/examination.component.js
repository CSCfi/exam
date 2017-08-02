'use strict';
angular.module('app.examination')
    .component('examination', {
        templateUrl: '/assets/app/examination/examination.template.html',
        bindings: {
            isPreview: '<'
        },
        controller: ['$http', '$location', '$routeParams', '$translate', 'Examination',
            function ($http, $location, $routeParams, $translate, Examination) {

                var vm = this;

                vm.$onInit = function () {
                    if (!vm.isPreview) {
                        window.onbeforeunload = function () {
                            return $translate.instant('sitnet_unsaved_data_may_be_lost');
                        };
                    }
                    var url = '/app' + (
                            vm.isPreview ? '/exampreview/' + $routeParams.id : '/student/exam/' + $routeParams.hash
                        );
                    $http.get(url)
                        .success(function (data) {
                            if (data.cloned) {
                                // we came here with a reference to the parent exam so do not render page just yet,
                                // reload with reference to student exam that we just created
                                $location.path('/student/exam/' + data.hash);
                                return;
                            }
                            data.examSections.sort(function (a, b) {
                                return a.sequenceNumber - b.sequenceNumber;
                            });
                            // set section indices
                            angular.forEach(data.examSections, function (section, index) {
                                section.index = index + 1;
                            });

                            vm.exam = data;
                            setActiveSection({type: 'guide'});
                        })
                        .error(function () {
                            $location.path('/');
                        });
                };

                vm.selectNewPage = function (page) {
                    setActiveSection(page);
                };

                vm.timedOut = function () {
                    // Loop through all essay questions in the active section
                    if (vm.activeSection) {
                        Examination.saveAllTextualAnswersOfSection(vm.activeSection, vm.examHash, true).then(function () {
                            logout('sitnet_exam_time_is_up');
                        });
                    } else {
                        logout('sitnet_exam_time_is_up');
                    }
                };

                var findSection = function (sectionId) {
                    var i = vm.exam.examSections.map(function (es) {
                        return es.id;
                    }).indexOf(sectionId);
                    if (i >= 0) {
                        return vm.exam.examSections[i];
                    }
                };

                var setActiveSection = function (page) {
                    delete vm.activeSection;
                    if (page.type === 'section') {
                        vm.activeSection = findSection(page.id);
                    }
                    window.scrollTo(0, 0);
                };

                var logout = function (msg) {
                    Examination.logout(msg, vm.exam.hash);
                };

            }]
    });
