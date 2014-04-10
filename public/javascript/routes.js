(function () {
    'use strict';
    angular.module('sitnet')
        .config(['$routeProvider', 'SITNET_CONF', function ($routeProvider, SITNET_CONF) {

            var tmpl = SITNET_CONF.TEMPLATES_PATH;


            /* main navigation */
            $routeProvider.when('/home', { templateUrl: tmpl + 'home.html', controller: 'DashboardCtrl'});
            $routeProvider.when('/questions', { templateUrl: tmpl + 'questions.html'});
            $routeProvider.when('/questions/new', { templateUrl: tmpl + 'question-editor/question.html'});
            $routeProvider.when('/questions/:id', { templateUrl: tmpl + 'question-editor/question.html'});
            $routeProvider.when('/reports', { templateUrl: tmpl + 'reports.html'});
            $routeProvider.when('/exams', { templateUrl: tmpl + 'exams.html', controller: 'ExamController'});
            $routeProvider.when('/rooms', { templateUrl: tmpl + 'admin/rooms.html', controller: 'RoomCtrl'});
            $routeProvider.when('/exams/:id', { templateUrl: tmpl + 'exam-editor/exam.html', controller: 'ExamController'});
            $routeProvider.when('/calendar', { templateUrl: tmpl + 'calendar.html'});
            $routeProvider.when('/notifications', { templateUrl: tmpl + 'notifications.html'});
            $routeProvider.when('/messages', { templateUrl: tmpl + 'messages.html'});
            $routeProvider.when('/tools', { templateUrl: tmpl + 'tools.html'});

            /* extra */
            $routeProvider.when('/user', { templateUrl: tmpl + 'user.html', controller: 'UserCtrl'});
            $routeProvider.when('/users', { templateUrl: tmpl + 'users.html', controller: 'UserCtrl'});
            $routeProvider.when('/about', { templateUrl: tmpl + 'about.html', controller: 'TestCtrl' });
            $routeProvider.when('/login', { templateUrl: tmpl + 'login.html', controller: 'SessionCtrl' });
            $routeProvider.when('/logout', { templateUrl: tmpl + 'logout.html', controller: 'SessionCtrl' });
            $routeProvider.when('/courses', { templateUrl: tmpl + 'courses.html', controller: 'CourseCtrl'});
            $routeProvider.when('/questions', { templateUrl: tmpl + 'questions.html', controller: 'QuestionCtrl'});

            /* Student */
//            $routeProvider.when('/student/exams', { templateUrl: tmpl + 'exams.html', controller: 'StudentExamController'});
            $routeProvider.when('/student/doexam/:hash', { templateUrl: tmpl + 'student/exam.html', controller: 'StudentExamController'});

            /* Teacher */
            $routeProvider.when('/exams/review/:id', { templateUrl: tmpl + 'teacher/review.html'});

            $routeProvider.otherwise({redirectTo: '/home'});
        }]);
}());