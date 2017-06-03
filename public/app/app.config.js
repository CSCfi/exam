'use strict';

angular.module('app').config(['$translateProvider', '$routeProvider', '$httpProvider', '$locationProvider',
    '$compileProvider', 'tmhDynamicLocaleProvider', 'EXAM_CONF',
    function ($translateProvider, $routeProvider, $httpProvider, $locationProvider, $compileProvider,
              tmhDynamicLocaleProvider, EXAM_CONF) {
        $compileProvider.debugInfoEnabled(false);
        $httpProvider.useApplyAsync(true);

        // IE caches each and every GET unless the following is applied:
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
        }
        $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.headers.get.Pragma = 'no-cache';

        var path = EXAM_CONF.LANGUAGES_PATH;
        $translateProvider.useStaticFilesLoader({
            prefix: path + 'locale-',
            suffix: '.json'
        });
        $translateProvider.useSanitizeValueStrategy(null);
        $translateProvider.preferredLanguage('en');

        tmhDynamicLocaleProvider.localeLocationPattern(
            '/webjars/angular-i18n/' + EXAM_CONF.NG_VERSION + '/angular-locale_{{locale}}.js');

        $locationProvider.html5Mode({enabled: true, requireBase: false});

        // ROUTING -->

        var tmpl = EXAM_CONF.TEMPLATES_PATH;

        /* Enrolment */
        $routeProvider.when('/enroll/:code/exam/:id', {
            templateUrl: tmpl + 'enrolment/enrollExam.html',
            controller: 'EnrollController'
        });

        /* main navigation */
        $routeProvider.when('/', {template: '<dashboard></dashboard>'});
        $routeProvider.when('/questions', {templateUrl: tmpl + 'question/questions.html', controller: 'LibraryCtrl'});
        $routeProvider.when('/exams', {templateUrl: tmpl + 'exam/exams.html', controller: 'ExamListingController'});

        // edit question
        $routeProvider.when('/questions/:id', {templateUrl: tmpl + 'question/editor/question.html'});
        // new question
        $routeProvider.when('/questions/new/:type', {templateUrl: tmpl + 'question/editor/question.html'});
        // new question, no type from here anymore
        $routeProvider.when('/questions/newQuestion/:create', {templateUrl: tmpl + 'question/editor/question.html'});
        $routeProvider.when('/questions/library', {templateUrl: tmpl + 'question/library.html'});

        /* exams */
        $routeProvider.when('/exams/:id', {templateUrl: tmpl + 'exam/editor/exam.html', controller: 'ExamController'});
        $routeProvider.when('/exams/course/:id', {
            templateUrl: tmpl + 'exam/editor/exam_new.html',
            controller: 'ExamController'
        });
        $routeProvider.when('/exams/course/newExam/:create', {
            templateUrl: tmpl + 'exam/editor/exam_new.html',
            controller: 'ExamController'
        });

        /* booking */
        $routeProvider.when('/calendar/:id', {templateUrl: tmpl + 'reservation/calendar.html'});
        $routeProvider.when('/iop/calendar/:id', {templateUrl: tmpl + 'reservation/iop/external_calendar.html'});

        $routeProvider.when('/invalid_session', {templateUrl: tmpl + 'common/invalid_session.html'});

        /* extra */
        $routeProvider.when('/logout', {template: '<logout></logout>'});
        $routeProvider.when('/softwares', {templateUrl: tmpl + 'facility/software.html', controller: 'RoomCtrl'});

        $routeProvider.when('/accessibility', {template: '<accessibility></accessibility>'});
        $routeProvider.when('/machines/:id', {template: '<machine></machine>'});

        $routeProvider.when('/softwares/update/:id/:name', {
            templateUrl: tmpl + 'facility/software.html',
            controller: 'RoomCtrl'
        });
        $routeProvider.when('/softwares/:id', {templateUrl: tmpl + 'facility/software.html', controller: 'RoomCtrl'});
        $routeProvider.when('/softwares/add/:name', {
            templateUrl: tmpl + 'facility/software.html',
            controller: 'RoomCtrl'
        });

        /* Student */
        $routeProvider.when('/student/exam/:hash', {
            templateUrl: tmpl + 'exam/student/exam.html',
            controller: 'StudentExamController'
        });
        $routeProvider.when('/feedback/exams/:id', {
            templateUrl: tmpl + 'enrolment/exam_feedback.html',
            controller: 'ExamFeedbackController'
        });
        $routeProvider.when('/student/waitingroom', {
            templateUrl: tmpl + 'enrolment/waitingroom.html',
            controller: 'WaitingRoomCtrl'
        });
        $routeProvider.when('/student/wrongmachine', {
            templateUrl: tmpl + 'enrolment/wrong_machine.html',
            controller: 'WrongMachineCtrl'
        });
        $routeProvider.when('/student/exams', {
            templateUrl: tmpl + 'exam/student/exam_search.html',
            controller: 'ExamSearchCtrl'
        });
        $routeProvider.when('/student/finishedexams', {
            templateUrl: tmpl + 'exam/student/finished_exams.html',
            controller: 'ExamFeedbackController'
        });
        $routeProvider.when('/student/logout/:reason?', {
            templateUrl: tmpl + 'exam/student/exam_logout.html',
            controller: 'ExamLogoutCtrl'
        });


        /* Teacher */
        $routeProvider.when('/exams/review/:id', {
            templateUrl: tmpl + 'review/review.html',
            controller: 'ExamReviewController'
        });
        $routeProvider.when('/exams/reviews/:id', {
            templateUrl: tmpl + 'review/review_list.html',
            controller: 'ReviewListingController'
        });
        $routeProvider.when('/exams/reviews/:id/speedreview', {
            templateUrl: tmpl + 'review/listings/speed_review.html',
            controller: 'SpeedReviewController',
            controllerAs: 'ctrl'
        });
        $routeProvider.when('/exams/preview/:id', {
            templateUrl: tmpl + 'exam/student/exam.html',
            controller: 'StudentExamController'
        });
        $routeProvider.when('/exams/preview/:id/:tab', {
            templateUrl: tmpl + 'exam/student/exam.html',
            controller: 'StudentExamController'
        });
        $routeProvider.when('/reservations', {template: '<reservations user-role="teacher"></reservations>'});
        $routeProvider.when('/reservations/:eid', {template: '<reservations user-role="teacher"></reservations>'});

        $routeProvider.when('/exams/examTabs/:id/:tab', {templateUrl: tmpl + 'exam/examTabs.html'});

        /* Admin */
        $routeProvider.when('/rooms', {templateUrl: tmpl + 'facility/rooms.html', controller: 'RoomCtrl'});
        $routeProvider.when('/rooms/:id', {templateUrl: tmpl + 'facility/room.html', controller: 'RoomCtrl'});
        $routeProvider.when('/rooms_edit/edit_multiple', {
            templateUrl: tmpl + 'facility/room.html',
            controller: 'RoomCtrl'
        });
        $routeProvider.when('/reports', {template: '<reports></reports>'});
        $routeProvider.when('/statistics', {template: '<statistics></statistics>'});
        $routeProvider.when('/settings', {template: '<settings></settings>'});
        $routeProvider.when('/users', {template: '<users></users>'});


        /* Print */
        $routeProvider.when('/print/exam/:id', {
            templateUrl: tmpl + 'review/print/fullReview.html',
            controller: 'ExamReviewController'
        });

        /* Printout exam */
        $routeProvider.when('/exams/printout/:id', {
            templateUrl: tmpl + 'exam/printout/printout.html',
            controller: 'PrintoutController',
            controllerAs: 'ctrl'
        });
        $routeProvider.when('/exams/printout/:id/:tab', {
            templateUrl: tmpl + 'exam/printout/printout.html',
            controller: 'PrintoutController',
            controllerAs: 'ctrl'
        });
        $routeProvider.when('/printouts', {
            templateUrl: tmpl + 'exam/printout/printouts.html',
            controller: 'PrintoutController',
            controllerAs: 'ctrl'
        });


        /* Language inspectors */
        $routeProvider.when('/inspections', {
            templateUrl: tmpl + 'maturity/dashboard.html',
            controller: 'LanguageInspectionCtrl'
        });
        $routeProvider.when('/inspections/reports', {
            templateUrl: tmpl + 'maturity/monthly_report.html',
            controller: 'LanguageInspectionCtrl'
        });

        $routeProvider.otherwise({redirectTo: '/'});
    }
]);
