/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative',
    ['app.administrative.reports', 'app.administrative.statistics', 'app.administrative.settings', 'app.administrative.users']
);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.reports', ['ui.select']);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.settings', []);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.statistics', []);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.users', []);

;'use strict';

angular.module('app', [
    'ngResource',
    'ngRoute',
    'ngStorage',
    'tmh.dynamicLocale',
    'app.session',
    'app.navigation',
    'app.enrolment',
    'app.dashboard',
    'app.administrative',
    'app.software'
]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.calendar', ['ui.calendar']);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.common', []);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.dashboard', ['app.dashboard.teacher', 'app.dashboard.student', 'app.maturity', 'ui.bootstrap']);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.dashboard.student', ['ngAnimate', 'app.calendar']);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.dashboard.teacher', ['app.exam', 'app.question', 'app.reservation', 'app.iop']);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.enrolment', []);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor', ['ui.bootstrap']);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam', ['app.exam.editor', 'app.facility', 'app.review', 'app.examination', 'ngAnimate']);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination', []);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.facility.accessibility', []);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.facility.address', []);;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.facility', ['app.facility.accessibility', 'app.facility.machines',
    'app.facility.rooms', 'app.facility.address', 'app.facility.schedule']);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.facility.machines', []);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.facility.rooms', ['app.facility.accessibility']);;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.facility.schedule', []);;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.iop', []);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.maturity', ['app.utility', 'dialogs.main']);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.navigation', []);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.question', []);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.reservation', ['ui.select2']);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review', []);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.session', ['app.common']);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.software', []);;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.utility', []);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.reports')
    .component('reports', {
        templateUrl: '/assets/app/administrative/reports/reports.template.html',
        controller: ['$translate', 'EXAM_CONF', 'Reports', 'Room', 'DateTime', '$filter', 'UserRes', 'Files', 'toast',
            function ($translate, EXAM_CONF, Reports, Room, DateTime, $filter, UserRes, Files, toast) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.csvExport = {};
                    ctrl.templates = {
                        examRoomReservations: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-room-reservations.html',
                        teacherExamsReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/teacher-exams.html',
                        reviewedExams: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/reviewed-exams.html',
                        examReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-report.html',
                        examReportJson: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-report-json.html',
                        examAnswers: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-answers.html',
                        examEnrollmentsReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-enrollments.html',
                        studentReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/student.html',
                        examRecordsCsv: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-records-csv.html'
                    };

                    ctrl.selectedFields = {
                        room: {name: $translate.instant('sitnet_choose')}
                    };

                    ctrl.rooms = Room.rooms.query();
                    ctrl.examNames = Reports.examNames.query();

                    ctrl.teachers = UserRes.usersByRole.query({role: 'TEACHER'});
                    ctrl.students = UserRes.usersByRole.query({role: 'STUDENT'});
                };


                ctrl.setRoom = function (room) {
                    ctrl.selectedFields.room = room;
                };


                ctrl.getExamEnrollments = function (exam) {
                    if (exam) {
                        Files.download('/app/statistics/examenrollments/' + exam.id, 'exam_enrolments.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getStudentReport = function (student) {
                    if (student) {
                        var f = $filter('date')(ctrl.studentStartDate || new Date(), 'dd.MM.yyyy');
                        var t = $filter('date')(ctrl.studentEndDate || new Date(), 'dd.MM.yyyy');
                        Files.download('/app/statistics/student/' + student.id + '/' + f + '/' + t, 'student_activity.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_student'));
                    }
                };

                ctrl.getExamAnswerReport = function () {
                    var f = $filter('date')(ctrl.answerStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.answerEndDate || new Date(), 'dd.MM.yyyy');
                    Files.download('/app/statistics/allexams/' + f + '/' + t, 'exam_answers_' + f + '_' + t + '.xlsx');
                };

                ctrl.getExamsXlsx = function (exam) {
                    if (exam) {
                        Files.download('/app/statistics/examnames/' + exam.id + '/xlsx', 'exams.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getExamsJson = function (exam) {
                    if (exam) {
                        Files.download('/app/statistics/examnames/' + exam.id + '/json', 'exams.json');
                    } else {
                        toast.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getReviewsByDate = function () {
                    var f = $filter('date')(ctrl.reviewStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.reviewEndDate || new Date(), 'dd.MM.yyyy');
                    Files.download('/app/statistics/reviewsbydate/' + f + '/' + t, 'reviews_' + f + '_' + t + '.xlsx');
                };

                ctrl.getTeacherExamsByDate = function (teacher) {
                    var f = $filter('date')(ctrl.teacherStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.teacherEndDate || new Date(), 'dd.MM.yyyy');
                    if (teacher) {
                        Files.download('/app/statistics/teacherexamsbydate/' + teacher.id + '/' + f + '/' + t,
                            'teacherexams_' + f + '_' + t + '.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_teacher'));
                    }
                };

                ctrl.getRoomReservationsByDate = function (rid) {
                    var f = $filter('date')(ctrl.reservationStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.reservationEndDate || new Date(), 'dd.MM.yyyy');
                    if (rid > 0) {
                        Files.download('/app/statistics/resbydate/' + rid + '/' + f + '/' + t, 'reservations_' + f + '_' + t + '.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_room'));
                    }
                };

                ctrl.getExamRecords = function () {
                    var start = ctrl.recordCsvStartDate ? new Date(ctrl.recordCsvStartDate).getTime() : new Date().getTime();
                    var end = ctrl.recordCsvEndDate
                        ? new Date(ctrl.recordCsvEndDate).getTime().setHours(23, 59, 59, 999)
                        : new Date().getTime().setHours(23, 59, 59, 999);
                    Files.download('/app/exam/record', 'examrecords.csv', {'startDate': start, 'endDate': end});
                };

                ctrl.answerStartDateChanged = function (date) {
                    ctrl.answerStartDate = date;
                };

                ctrl.answerEndDateChanged = function (date) {
                    ctrl.answerEndDate = date;
                };

                ctrl.recordCsvStartDateChanged = function (date) {
                    ctrl.recordCsvStartDate = date;
                };

                ctrl.recordCsvEndDateChanged = function (date) {
                    ctrl.recordCsvEndDate = date;
                };

                ctrl.reservationStartDateChanged = function (date) {
                    ctrl.reservationStartDate = date;
                };

                ctrl.reservationEndDateChanged = function (date) {
                    ctrl.reservationEndDate = date;
                };

                ctrl.reviewStartDateChanged = function (date) {
                    ctrl.reviewStartDate = date;
                };

                ctrl.reviewEndDateChanged = function (date) {
                    ctrl.reviewEndDate = date;
                };

                ctrl.studentStartDateChanged = function (date) {
                    ctrl.studentStartDate = date;
                };

                ctrl.studentEndDateChanged = function (date) {
                    ctrl.studentEndDate = date;
                };

                ctrl.teacherStartDateChanged = function (date) {
                    ctrl.teacherStartDate = date;
                };

                ctrl.teacherEndDateChanged = function (date) {
                    ctrl.teacherEndDate = date;
                };


            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular
    .module('app.administrative.reports')
    .factory('Reports', ['$resource',
        function ($resource) {
            return {examNames: $resource("/app/statistics/examnames")};
        }
    ]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.settings')
    .component('settings', {
        templateUrl: '/assets/app/administrative/settings/settings.template.html',
        controller: ['$translate', '$http', 'Settings', 'toast',
            function ($translate, $http, Settings, toast) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.settings = {};
                    ctrl.settings.eula = Settings.agreement.get();
                    Settings.deadline.get(function (deadline) {
                        deadline.value = parseInt(deadline.value);
                        ctrl.settings.deadline = deadline;
                    });
                    Settings.reservationWindow.get(function (window) {
                        window.value = parseInt(window.value);
                        ctrl.settings.reservationWindow = window;
                    });
                };

                ctrl.updateAgreement = function () {
                    Settings.agreement.update(ctrl.settings.eula,
                        function () {
                            toast.info($translate.instant("sitnet_user_agreement") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.updateDeadline = function () {
                    Settings.deadline.update(ctrl.settings.deadline,
                        function () {
                            toast.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.updateReservationWindow = function () {
                    Settings.reservationWindow.update(ctrl.settings.reservationWindow,
                        function () {
                            toast.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.showAttributes = function () {
                    $http.get('/attributes').success(function (attributes) {
                        ctrl.attributes = attributes;
                    });
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.administrative.settings')
    .factory('Settings', ['$resource',
        function ($resource) {
            return {
                agreement: $resource("/app/settings/agreement", {}, {'update': {method: 'PUT'}}),
                deadline: $resource("/app/settings/deadline", {}, {"update": {method: 'PUT'}}),
                reservationWindow: $resource("/app/settings/reservationWindow", {}, {"update": {method: 'PUT'}})
            };
        }
    ]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.statistics')
    .component('statistics', {
        templateUrl: '/assets/app/administrative/statistics/statistics.template.html',
        controller: ['$translate', 'EXAM_CONF', 'Statistics',
            function ($translate, EXAM_CONF, Statistics) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.templates = {
                        rooms: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/rooms.html",
                        exams: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/exams.html",
                        reservations: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/reservations.html",
                        responses: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/responses.html"
                    };
                    ctrl.departments = [];
                    ctrl.limitations = {};

                    ctrl.exams = [];
                    ctrl.participations = {};

                    Statistics.departments.get(function (data) {
                        data.departments.forEach(function (d) {
                            ctrl.departments.push({name: d});
                        });
                    });
                };

                var getQueryParams = function () {
                    var params = {};
                    if (ctrl.startDate) {
                        params.start = ctrl.startDate;
                    }
                    if (ctrl.endDate) {
                        params.end = ctrl.endDate;
                    }
                    var departments = ctrl.departments.filter(function (d) {
                        return d.filtered;
                    });
                    if (departments.length > 0) {
                        params.dept = departments.map(function (d) {
                            return d.name;
                        }).join();
                    }
                    return params;
                };

                ctrl.startDateChanged = function (date) {
                    ctrl.startDate = date;
                };

                ctrl.endDateChanged = function (date) {
                    ctrl.endDate = date;
                };

                ctrl.totalParticipations = function (month, room) {
                    var total = 0;

                    var isWithinBounds = function (p) {
                        var date = new Date(p.exam.created);
                        var current = new Date(month);
                        var min = new Date(current.getFullYear(), current.getMonth(), 1);
                        var max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                        return date > min && date < max;
                    };

                    for (var k in ctrl.participations) {
                        if (ctrl.participations.hasOwnProperty(k)) {
                            if (room && k !== room) {
                                continue;
                            }
                            if (month) {
                                total += ctrl.participations[k].filter(isWithinBounds).length;
                            } else {
                                total += ctrl.participations[k].length;
                            }
                        }
                    }
                    return total;
                };

                var isBefore = function (a, b) {
                    return a.getYear() < b.getYear() || (a.getYear() === b.getYear() && a.getMonth() < b.getMonth());
                };

                var groupByMonths = function () {
                    if (ctrl.participations.length === 0) {
                        return [];
                    }
                    var months = [];
                    months.push(ctrl.minDate);
                    var current = new Date(ctrl.minDate);
                    var next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    var last = new Date(ctrl.maxDate);
                    while (isBefore(next, last)) {
                        months.push(next.getTime());
                        current = next;
                        next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    }
                    months.push(ctrl.maxDate);
                    ctrl.months = months;
                };

                var setMinAndMaxDates = function () {
                    var dates = [];
                    for (var k in ctrl.participations) {
                        if (ctrl.participations.hasOwnProperty(k)) {
                            dates = dates.concat(ctrl.participations[k].map(function (p) {
                                return p.exam.created;
                            }));
                        }
                    }
                    ctrl.minDate = Math.min.apply(null, dates);
                    // Set max date to either now or requested end date (if any)
                    if (ctrl.endDate) {
                        dates.push(Date.parse(ctrl.endDate));
                    } else {
                        dates.push(new Date().getTime());
                    }
                    ctrl.maxDate = Math.max.apply(null, dates);
                };

                ctrl.listParticipations = function () {
                    Statistics.participations.find(getQueryParams()).$promise.then(function (participations) {
                        ctrl.participations = participations;
                        setMinAndMaxDates();
                        ctrl.rooms = Object.keys(participations);
                        groupByMonths();
                    });
                };

                ctrl.totalExams = function () {
                    return ctrl.exams.reduce(function (a, b) {
                        return a + b.participations;
                    }, 0);
                };

                ctrl.listExams = function () {
                    Statistics.exams.query(getQueryParams(), function (exams) {
                        ctrl.exams = exams;
                    });
                };

                ctrl.getRank = function (index, items) {
                    var prev = Math.max(0, index - 1);
                    if (items[prev].participations === items[index].participations) {
                        items[index].rank = items[prev].rank || 0;
                        return (items[prev].rank || 0) + 1;
                    }
                    items[index].rank = index;
                    return index + 1;
                };

                ctrl.listReservations = function () {
                    Statistics.reservations.query(getQueryParams(), function (reservations) {
                        ctrl.reservations = reservations.filter(function (r) {
                            return !r.noShow;
                        });
                        ctrl.noShows = reservations.filter(function (r) {
                            return r.noShow;
                        });
                    });
                };

                ctrl.listResponses = function () {
                    Statistics.responses.query(getQueryParams(), function (exams) {
                        ctrl.assessedExams = exams.filter(function (e) {
                            return ['GRADED', 'GRADED_LOGGED', 'ARCHIVED', 'REJECTED', 'DELETED'].indexOf(e.state) > -1;
                        });
                        ctrl.unassessedExams = exams.filter(function (e) {
                            return ['STUDENT_STARTED', 'REVIEW', 'REVIEW_STARTED'].indexOf(e.state) > -1;
                        });
                        ctrl.abortedExams = exams.filter(function (e) {
                            return e.state === 'ABORTED';
                        });
                    });
                };

            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.administrative.statistics')
    .factory('Statistics', ['$resource', function ($resource) {
        return {
            departments: $resource("/app/reports/departments"),
            exams: $resource("/app/reports/exams"),
            reservations: $resource("/app/reports/reservations"),
            responses: $resource("/app/reports/responses"),
            participations: $resource("/app/reports/participations", {}, {
                find: {
                    method: 'GET',
                    isArray: false,
                    interceptor: {
                        response: function (response) {
                            return response.data;
                        }
                    }
                }
            })
        };
    }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

angular.module('app.administrative.users')
    .component('users', {
        templateUrl: '/assets/app/administrative/users/users.template.html',
        controller: ['$timeout', '$translate', 'UserManagement', 'EXAM_CONF', 'Session', 'toast',
            function ($timeout, $translate, UserManagement, EXAM_CONF, Session, toast) {

                var updateEditOptions = function (user) {
                    user.availableRoles = [];
                    user.removableRoles = [];
                    ctrl.roles.forEach(function (role) {
                        if (user.roles.map(function (r) {
                                return r.name;
                            }).indexOf(role.type) === -1) {
                            user.availableRoles.push(angular.copy(role));
                        } else {
                            user.removableRoles.push(angular.copy(role));
                        }
                    });
                    user.availablePermissions = [];
                    user.removablePermissions = [];
                    ctrl.permissions.forEach(function (permission) {
                        if (user.permissions.map(function (p) {
                                return p.type;
                            }).indexOf(permission.type) === -1) {
                            user.availablePermissions.push(angular.copy(permission));
                        } else {
                            user.removablePermissions.push(angular.copy(permission));
                        }
                    });
                };

                var search = function () {
                    UserManagement.users.query({filter: ctrl.filter.text}, function (users) {
                        ctrl.users = users;
                        ctrl.users.forEach(function (user) {
                            updateEditOptions(user);
                        });
                        ctrl.loader.loading = false;
                    }, function (err) {
                        ctrl.loader.loading = false;
                        toast.error($translate.instant(err.data));
                    });
                };

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.filter = {};
                    ctrl.roles = [
                        {type: 'ADMIN', name: 'sitnet_admin', icon: 'fa-cog'},
                        {type: 'TEACHER', name: 'sitnet_teacher', icon: 'fa-university'},
                        {type: 'STUDENT', name: 'sitnet_student', icon: 'fa-graduation-cap'}
                    ];

                    UserManagement.permissions.query(function (permissions) {
                        permissions.forEach(function (p) {
                            if (p.type === 'CAN_INSPECT_LANGUAGE') {
                                p.name = 'sitnet_can_inspect_language';
                                p.icon = 'fa-pencil';
                            }
                        });
                        ctrl.permissions = permissions;
                    });


                    ctrl.loader = {
                        loading: false
                    };

                };

                ctrl.search = function () {
                    ctrl.loader.loading = true;
                    search();
                };

                ctrl.hasRole = function (user, role) {
                    return user.roles.some(function (r) {
                        return r.name === role;
                    });
                };

                ctrl.hasPermission = function (user, permission) {
                    return user.permissions.some(function (p) {
                        return p.type === permission;
                    });
                };

                ctrl.applyRoleFilter = function (role) {
                    ctrl.roles.forEach(function (r) {
                        r.filtered = r.type === role.type ? !r.filtered : false;
                    });
                };

                ctrl.applyPermissionFilter = function (permission) {
                    ctrl.permissions.forEach(function (p) {
                        p.filtered = p.type === permission.type ? !p.filtered : false;
                    });
                };

                ctrl.isUnfiltered = function (user) {
                    // Do not show logged in user in results
                    if (user.id === Session.getUser().id) {
                        return false;
                    }
                    var result = true;
                    ctrl.roles.filter(
                        function (role) {
                            return role.filtered;
                        }).forEach(function (role) {
                        if (!ctrl.hasRole(user, role.type)) {
                            result = false;
                        }
                    });
                    if (!result) {
                        return result;
                    }
                    ctrl.permissions.filter(
                        function (permission) {
                            return permission.filtered;
                        }).forEach(function (permission) {
                        if (!ctrl.hasPermission(user, permission.type)) {
                            result = false;
                        }
                    });
                    return result;
                };

                ctrl.addRole = function (user, role) {
                    UserManagement.roles.add({id: user.id, role: role.type}, function () {
                        user.roles.push({name: role.type});
                        updateEditOptions(user);
                    });
                };

                ctrl.addPermission = function (user, permission) {
                    UserManagement.permissions.add({id: user.id, permission: permission.type}, function () {
                        user.permissions.push({type: permission.type});
                        updateEditOptions(user);
                    });
                };

                ctrl.removeRole = function (user, role) {
                    UserManagement.roles.remove({id: user.id, role: role.type}, function () {
                        var i = user.roles.map(function (r) {
                            return r.name;
                        }).indexOf(role.type);
                        user.roles.splice(i, 1);
                        updateEditOptions(user);
                    });
                };

                ctrl.removePermission = function (user, permission) {
                    UserManagement.permissions.remove({id: user.id, permission: permission.type}, function () {
                        var i = user.permissions.map(function (p) {
                            return p.type;
                        }).indexOf(permission.type);
                        user.permissions.splice(i, 1);
                        updateEditOptions(user);
                    });
                };
            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.administrative.users')
    .factory('UserManagement', ['$resource',
        function ($resource) {
            return {
                users: $resource("/app/users"),
                permissions: $resource("/app/permissions", {}, {
                    "add": {method: "POST"},
                    "remove": {method: "DELETE"}
                }),
                roles: $resource("/app/users/:id/roles/:role", {
                        id: "@id", role: "@role"
                    },
                    {
                        "add": {method: "POST", params: {id: "@id", role: "@role"}},
                        "update": {method: "PUT", params: {id: "@id", role: "@role"}},
                        "remove": {method: "DELETE", params: {id: "@id", role: "@role"}}
                    })
            };
        }
    ]);
;'use strict';

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

        /* index */
        $routeProvider.when('/', {template: '<dashboard></dashboard>', reloadOnSearch: false});

        // questions
        $routeProvider.when('/questions', {template: '<library></library>'});
        $routeProvider.when('/questions/:id', {template: '<question new-question="false"></question>'});
        $routeProvider.when('/questions/newQuestion/:create', {template: '<question new-question="true"></question>'});

        /* exams */
        $routeProvider.when('/exams/new', {template: '<new-exam></new-exam>'});

        $routeProvider.when('/exams/:id/:tab', {template: '<exam-tabs></exam-tabs>'});
        $routeProvider.when('/exams/:id/select/course', {template: '<course-selection></course-selection>'});
        $routeProvider.when('/exams/:id/view/preview/:tab?', {template: '<examination is-preview="true"><examination>'});
        $routeProvider.when('/exams/:id/view/printout/:tab?', {template: '<printout></printout>'});
        $routeProvider.when('/printouts', {template: '<printout-listing></printout-listing>'});

        /* calendar */
        $routeProvider.when('/calendar/:id', {template: '<calendar is-external="false"></calendar>'});
        $routeProvider.when('/iop/calendar/:id', {template: '<calendar is-external="true"></calendar>'});

        /* logout */
        $routeProvider.when('/logout', {template: '<logout></logout>'});

        /* Student */
        $routeProvider.when('/student/exam/:hash', {template: '<examination is-preview="false"><examination>'});
        $routeProvider.when('/student/waiting-room/:id?', {template: '<waiting-room></waiting-room>'});
        $routeProvider.when('/student/wrong-room/:eid/:mid', {template: '<wrong-location cause="room"></wrong-location>'});
        $routeProvider.when('/student/wrong-machine/:eid/:mid', {template: '<wrong-location cause="machine"></wrong-location>'});

        $routeProvider.when('/student/exams', {template: '<exam-search></exam-search>'});
        $routeProvider.when('/student/participations', {template: '<exam-participations></exam-participations>'});
        $routeProvider.when('/student/logout/:reason?', {template: '<examination-logout></examination-logout>'});
        $routeProvider.when('/enroll/:code/exam/:id', {template: '<exam-enrolments></exam-enrolments>'});


        /* review */
        $routeProvider.when('/assessments/:id', {template: '<assessment></assessment>'});
        $routeProvider.when('/speedreview/:id', {template: '<speed-review></speed-review>'});
        $routeProvider.when('/print/exam/:id', {template: '<printed-assessment></printed-assessment>'});

        $routeProvider.when('/assessments/:id/questions', {template: '<question-assessment></question-assessment>'});


        /* reservations */
        $routeProvider.when('/reservations', {template: '<reservations user-role="teacher"></reservations>'});
        $routeProvider.when('/reservations/:eid', {template: '<reservations user-role="teacher"></reservations>'});

        /* Admin */
        $routeProvider.when('/exams', {template: '<exam-list></exam-list>'});
        $routeProvider.when('/rooms', {template: '<room-list></room-list>'});
        $routeProvider.when('/rooms/:id', {template: '<room></room>'});
        $routeProvider.when('/rooms_edit/edit_multiple', {template: '<multi-room></multi-room>'});

        $routeProvider.when('/softwares', {template: '<software></software>'});
        $routeProvider.when('/accessibility', {template: '<accessibility></accessibility>'});
        $routeProvider.when('/machines/:id', {template: '<machine></machine>'});

        $routeProvider.when('/reports', {template: '<reports></reports>'});
        $routeProvider.when('/statistics', {template: '<statistics></statistics>'});
        $routeProvider.when('/settings', {template: '<settings></settings>'});
        $routeProvider.when('/users', {template: '<users></users>'});

        /* Language inspectors */
        $routeProvider.when('/inspections', {template: '<language-inspections></language-inspections>'});
        $routeProvider.when('/inspections/reports', {template: '<maturity-reporting></maturity-reporting>'});

        $routeProvider.otherwise({redirectTo: '/'});


        // HTTP INTERCEPTOR
        $httpProvider.interceptors.push(['$q', '$rootScope', '$location', '$translate', 'WrongLocation', 'toast',
            function ($q, $rootScope, $location, $translate, WrongLocation, toast) {
                return {
                    'response': function (response) {

                        var b64_to_utf8 = function (data) {
                            return decodeURIComponent(escape(atob(data)));
                        };

                        var unknownMachine = response.headers()['x-exam-unknown-machine'];
                        var wrongRoom = response.headers()['x-exam-wrong-room'];
                        var wrongMachine = response.headers()['x-exam-wrong-machine'];
                        var hash = response.headers()['x-exam-start-exam'];

                        var enrolmentId = response.headers()['x-exam-upcoming-exam'];
                        var parts;
                        if (unknownMachine) {
                            var location = b64_to_utf8(unknownMachine).split(':::');
                            WrongLocation.display(location); // Show warning notice on screen
                        }
                        else if (wrongRoom) {
                            parts = b64_to_utf8(wrongRoom).split(':::');
                            $location.path('/student/wrong-room/' + parts[0] + '/' + parts[1]);
                            $rootScope.$broadcast('wrongLocation');
                        }
                        else if (wrongMachine) {
                            parts = b64_to_utf8(wrongMachine).split(':::');
                            $location.path('/student/wrong-machine/' + parts[0] + '/' + parts[1]);
                            $rootScope.$broadcast('wrongLocation');
                        }
                        else if (enrolmentId) { // Go to waiting room
                            var id = enrolmentId === 'none' ? '' : enrolmentId;
                            $location.path(enrolmentId === 'none' ?
                                '/student/waiting-room' : '/student/waiting-room/' + id);
                            $rootScope.$broadcast('upcomingExam');
                        }
                        else if (hash) { // Start/continue exam
                            $location.path('/student/exam/' + hash);
                            $rootScope.$broadcast('examStarted');
                        }
                        return response;
                    },
                    'responseError': function (response) {
                        if (response.status === -1) {
                            // connection failure
                            toast.error($translate.instant('sitnet_connection_refused'));
                        }
                        else if (typeof response.data === 'string' || response.data instanceof String) {
                            var deferred = $q.defer();
                            if (response.data.match(/^".*"$/g)) {
                                response.data = response.data.slice(1, response.data.length - 1);
                            }
                            var parts = response.data.split(' ');
                            $translate(parts).then(function (t) {
                                for (var i = 0; i < parts.length; i++) {
                                    if (parts[i].substring(0, 7) === 'sitnet_') {
                                        parts[i] = t[parts[i]];
                                    }
                                }
                                response.data = parts.join(' ');
                                return deferred.reject(response);
                            });
                            return deferred.promise;
                        }
                        return $q.reject(response);
                    }
                };
            }
        ]);

    }
]);
;'use strict';

angular.module('app').constant('EXAM_CONF', {
    AUTH_STORAGE_KEY: 'EXAM_USER',
    AUTH_HEADER: 'x-exam-authentication',
    CONTEXT_PATH: '/',
    LANGUAGES_PATH: '/assets/assets/languages/',
    TEMPLATES_PATH: '/assets/app/',
    NG_VERSION: '1.5.3'
});
;'use strict';
angular.module('app')

    .directive('dateValidator', function () {
        return {
            require: 'ngModel',
            link: function (scope, elem, attr, ngModel) {
                function validate(value) {
                    if (value) {
                        ngModel.$setValidity('badDate', true);
                        ngModel.$setValidity('date', true);
                        ngModel.$setValidity('required', true);
                        if (value instanceof Date) {
                            var d = Date.parse(value);
                            // it is a date
                            if (isNaN(d)) {
                                ngModel.$setValidity('badDate', false);
                            }
                        } else {
                            if (!moment(value, 'DD.MM.YYYY').isValid()) {
                                ngModel.$setValidity('badDate', false);
                            }
                        }
                    }
                }

                scope.$watch(function () {
                    return ngModel.$viewValue;
                }, validate);
            }
        };
    })

    .directive('draggableModal', function () {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                elem.draggable({
                    revert: false,
                    drag: function () {
                        elem.css('height', 'auto');
                    }
                });
            }
        };
    })

    .directive('uniqueValue', function () {
        return {
            require: 'ngModel',
            scope: {
                items: '=',
                property: '@property'
            },
            link: function (scope, elem, attrs, ngModel) {
                function validate(value) {
                    var values = !scope.items ? [] : scope.items.map(function (i) {
                        return i[scope.property];
                    }).filter(function (i) {
                        return i == value;
                    });
                    ngModel.$setValidity('uniqueness', values.length < 2);
                }

                scope.$watch('items', function (items) {
                    validate(ngModel.$viewValue);
                }, true);

            }
        };
    })

    .directive('datetimepicker', [
        function () {

            return {
                restrict: 'EA',
                require: 'ngModel',
                scope: {
                    ngModel: '=',
                    datepickerOptions: '=',
                    dateFormat: '=dateFormat',
                    hourStep: '=',
                    minuteStep: '=',
                    showMeridian: '=',
                    meredians: '=',
                    mousewheel: '=',
                    readonlyTime: '@'
                },
                template: function (elem, attrs) {
                    function dashCase(name, separator) {
                        return name.replace(/[A-Z]/g, function (letter, pos) {
                            return (pos ? '-' : '') + letter.toLowerCase();
                        });
                    }

                    function createAttr(innerAttr, dateTimeAttrOpt) {
                        var dateTimeAttr = angular.isDefined(dateTimeAttrOpt) ? dateTimeAttrOpt : innerAttr;
                        if (attrs[dateTimeAttr]) {
                            return dashCase(innerAttr) + '="' + dateTimeAttr + '" ';
                        } else {
                            return '';
                        }
                    }

                    function createEvalAttr(innerAttr, dateTimeAttrOpt) {
                        var dateTimeAttr = angular.isDefined(dateTimeAttrOpt) ? dateTimeAttrOpt : innerAttr;
                        if (attrs[dateTimeAttr]) {
                            return dashCase(innerAttr) + '="' + attrs[dateTimeAttr] + '" ';
                        } else {
                            return dashCase(innerAttr);
                        }
                    }

                    function createAttrConcat(previousAttrs, attr) {
                        return previousAttrs + createAttr.apply(null, attr);
                    }

                    var tmpl = '<div id="datetimepicker" class="datetimepicker-wrapper">' +
                        '<input type="text" class="form-control" uib-datepicker-popup="{{dateFormat}}" ng-click="open($event)" is-open="opened" ng-model="ngModel" ' +
                        'datepicker-options="datepickerOptions" close-text="{{\'sitnet_close\' | translate}}" ' +
                        'current-text="{{\'sitnet_today\' | translate}}" date-validator />\n' +
                        '</div>\n' +
                        '<div id="datetimepicker" class="datetimepicker-wrapper" ng-model="time" ng-change="timeChange()" style="display:inline-block">\n' +
                        '<div uib-timepicker ' + [
                            ['hourStep'],
                            ['minuteStep'],
                            ['showMeridian'],
                            ['meredians'],
                            ['mousewheel']
                        ].reduce(createAttrConcat, '') +
                        createEvalAttr('readonlyInput', 'readonlyTime') +
                        '></div>\n' +
                        '</div>';
                    return tmpl;
                },
                controller: ['$scope',
                    function ($scope) {
                        $scope.timeChange = function () {
                            if ($scope.ngModel && $scope.time) {
                                // convert from ISO format to Date
                                if (typeof $scope.ngModel === 'string') $scope.ngModel = new Date($scope.ngModel);
                                $scope.ngModel.setHours($scope.time.getHours(), $scope.time.getMinutes());
                            }
                        };
                        $scope.open = function ($event) {
                            $event.preventDefault();
                            $event.stopPropagation();
                            $scope.opened = true;
                        };
                    }
                ],
                link: function (scope, element) {
                    scope.$watch(function () {
                        return scope.ngModel;
                    }, function (ngModel) {
                        // if a time element is focused, updating its model will cause hours/minutes to be formatted by padding with leading zeros
                        if (!element[0].contains(document.activeElement)) {
                            scope.time = new Date(ngModel);
                        }
                    }, true);
                }
            };
        }])


    .directive('ckEditor', ['$rootScope', 'lodash', function ($rootScope, lodash) {
        return {
            require: 'ngModel',
            scope: {
                enableClozeTest: '=?'
            },
            link: function (scope, elm, attr, ngModel) {
                var tmp;

                var ck = CKEDITOR.replace(elm[0]);

                if (!ngModel) {
                    return;
                }

                ck.on('instanceReady', function () {
                    ck.setData(tmp);
                    if (!scope.enableClozeTest) {
                        ck.getCommand('insertCloze').disable();
                    }
                });

                scope.$watch('enableClozeTest', function (value) {
                    var cmd = ck.getCommand('insertCloze');
                    if (cmd) {
                        if (!value) {
                            cmd.disable();
                        } else {
                            cmd.enable();
                        }
                    }
                });

                function updateModel() {
                    lodash.defer(function () {
                        scope.$apply(function () {
                            ngModel.$setViewValue(ck.getData());
                        });
                    });
                }

                ck.on('change', lodash.debounce(updateModel, 100)); // This can bring down the UI if not scaled down
                ck.on('dataReady', updateModel);
                ck.on('key', lodash.debounce(updateModel, 100));
                ck.on('mode', updateModel); // Editing mode change

                ngModel.$render = function (value) {
                    tmp = ngModel.$modelValue;
                    ck.setData(ngModel.$viewValue);
                };
            }
        };
    }])

    .directive('fixedPrecision', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, elem, attrs, ngModel) {
                var toFixed = function (input) {
                    if (!input) {
                        input = 0;
                    }
                    var re = /^-?[0-9]+(\.[0-9]{1,2})?$/i;
                    if (!input.toString().match(re)) {
                        var fixed = parseFloat(input.toFixed(2));
                        ngModel.$setViewValue(fixed);
                        ngModel.$render();
                        return fixed;
                    }
                    return input;
                };
                ngModel.$parsers.push(toFixed);
            }
        };
    })

    .directive('clozeTest', ["$compile", function ($compile) {
        return {
            restrict: 'E',
            scope: {
                results: '=',
                content: '=',
                editable: '=?'
            },
            link: function (scope, element, attrs) {
                var editable = angular.isUndefined(scope.editable) || scope.editable; // defaults to true
                var replacement = angular.element(scope.content);
                var inputs = replacement.find('input');
                for (var i = 0; i < inputs.length; ++i) {
                    var input = inputs[i];
                    var id = input.attributes.id.value;
                    var answer = scope.results ? scope.results[input.id] : null;
                    if (answer) {
                        input.setAttribute('size', answer.length);
                    }
                    input.setAttribute('ng-model', 'results.' + id);
                    if (!editable) {
                        input.setAttribute('ng-disabled', 'true');
                    }
                }
                element.replaceWith(replacement);
                $compile(replacement)(scope);
            }
        };
    }])
    .directive('uiBlur', ['$parse', function ($parse) {
        return {
            restrict: 'A', // only activate on element attribute
            link: function (scope, elem, attrs) {
                var parser = $parse(attrs.uiBlur);
                elem.bind('blur', function () {
                    parser(scope);
                });
            }
        };
    }])

    .directive('uiChange', ['$parse', function ($parse) {
        return {
            restrict: 'A', // only activate on element attribute
            link: function (scope, elem, attrs) {
                var parser = $parse(attrs.uiChange);
                elem.bind('change', function () {
                    parser(scope);
                });
            }
        };
    }])

    .directive('fileModel', ['$parse', function ($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var model = $parse(attrs.fileModel);
                var modelSetter = model.assign;

                element.bind('change', function () {
                    scope.$apply(function () {
                        modelSetter(scope.$parent, element[0].files[0]);
                    });
                });
            }
        };
    }])

    .directive('fileSelector', [function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                element.bind('change', function () {
                    ngModel.$setViewValue(element[0].files[0]);
                });
            }
        };
    }])

    .directive('mathjax', function () {
        return {
            restrict: 'EA',
            link: function (scope, element, attrs) {
                scope.$watch(attrs.ngModel, function () {
                    MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.get(0)]);
                });
            }
        };
    })

    .directive('focusOn', function () {
        return function (scope, elem, attr) {
            scope.$on('focusOn', function (e, name) {
                if (name === attr.focusOn) {
                    elem[0].focus();
                }
            });
        };
    })

    .directive('lowercase', [function () {
        return {
            require: 'ngModel',
            link: function (scope, element, attrs, modelCtrl) {
                var toLowerCase = function (input) {
                    if (input === undefined) {
                        input = '';
                    }
                    var lc = input.toLowerCase();
                    if (lc !== input) {
                        modelCtrl.$setViewValue(lc);
                        modelCtrl.$render();
                    }
                    return lc;
                };
                modelCtrl.$parsers.push(toLowerCase);
            }
        };
    }])

    .directive('sort', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            template: '<span class="pointer"' +
            'ng-click="sort()"">{{ text | translate }}&nbsp;' +
            '<i class="fa" ng-class="getSortClass()"></i>' +
            '</span>',
            scope: {
                predicate: '=',
                by: '@by',
                text: '@text',
                reverse: '=',
                onSort: '&?'
            }, link: function (scope, element, attrs) {
                scope.sort = function () {
                    scope.predicate = scope.by;
                    scope.reverse = !scope.reverse;
                    if (scope.onSort) {
                        $timeout(scope.onSort);
                    }
                };
                scope.getSortClass = function () {
                    return scope.predicate === scope.by ?
                        (scope.reverse ? 'fa-caret-down' : 'fa-caret-up') : 'fa-sort';
                };
            }
        };
    }])
    .directive('teacherList', [function () {
        return {
            restrict: 'E',
            replace: false,
            transclude: false,
            template: '<div>' +
            '<span ng-repeat="owner in exam.examOwners">' +
            '<strong>{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}</strong>' +
            '</span>' +
            '<span ng-repeat="inspection in exam.examInspections">{{$first ? ", " : "";}}' +
            '{{inspection.user.firstName}} {{inspection.user.lastName}}{{$last ? "" : ", ";}}' +
            '</span></div>',
            scope: {
                exam: '=exam',
                addEnrolmentInformation: '&'
            }
        };
    }])
    .directive('assessmentTeacherList', [function () {
        return {
            restrict: 'E',
            replace: true,
            template: '<div>' +
            '<span ng-repeat="owner in exam.parent.examOwners">' +
            '<strong>{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}</strong>' +
            '</span><br />' +
            '<span ng-repeat="inspection in exam.examInspections">' +
            '{{inspection.user.firstName}} {{inspection.user.lastName}}{{$last ? "" : ", ";}}' +
            '</span></div>',
            scope: {
                exam: '=exam'
            }
        };
    }])
    .directive('paginator', function () {
        return {
            restrict: 'E',
            replace: true,
            template: '<ul class="pagination pagination-sm">' +
            '<li ng-class="previousPageDisabled()"><a href="" ng-click="previousPage()">&#60;</a></li>' +
            '<li ng-repeat="n in range()" ng-class="{active: isCurrent(n)}" ng-click="setPage(n)"><a href="">{{ printRange(n) }}</a></li>' +
            '<li ng-class="nextPageDisabled()"><a target="_blank" ng-click="nextPage()">&#62;</a></li>' +
            '</ul>',
            scope: {
                items: '=items',
                pageSize: '=pageSize',
                currentPage: '=currentPage'
            }, // We might want to wire this with the table this paginates upon. The question is: HOW :)
            link: function (scope, element, attrs) {
                var pageCount = 0;
                scope.currentPage = 0;
                scope.$watch('items', function (items) {
                    if (items) {
                        pageCount = Math.ceil(items.length / scope.pageSize) - 1;
                    }
                    // Go to first page always when the underlying collection gets modified
                    scope.currentPage = 0;
                });

                scope.printRange = function (n) {
                    if (scope.items) {
                        return n + 1;
                    }
                };

                scope.previousPage = function () {
                    if (scope.currentPage > 0) {
                        scope.currentPage--;
                    }
                };

                scope.isCurrent = function (n) {
                    return n === scope.currentPage;
                };

                scope.previousPageDisabled = function () {
                    return scope.currentPage === 0 ? 'disabled' : '';
                };


                scope.nextPage = function () {
                    if (scope.currentPage < pageCount) {
                        scope.currentPage++;
                    }
                };

                scope.nextPageDisabled = function () {
                    return scope.currentPage === pageCount ? 'disabled' : '';
                };

                scope.range = function () {
                    var ret = [];
                    for (var x = 0; x <= pageCount; ++x) {
                        ret.push(x);
                    }
                    return ret;
                };

                scope.setPage = function (n) {
                    scope.currentPage = n;
                };
            }
        };
    });

;(function () {
    'use strict';
    angular.module('app')
        .filter('newlines', ["text", function (text) {
            return text.replace(/\n/g, '');
        }])
        .filter('utc', function () {
            return function (val) {
                var date = new Date(val);
                return new Date(date.getUTCFullYear(),
                    date.getUTCMonth(),
                    date.getUTCDate(),
                    date.getUTCHours(),
                    date.getUTCMinutes(),
                    date.getUTCSeconds());
            };

        })
        .filter('truncate', function () {
            return function (text, after) {
                if (!text) return "";
                return truncate(text, after, {ellipsis: '...'});
            };
        })
        .filter('striphtml', function () {
            return function (html) {
                // test if mathjax formula
                if (html && html.indexOf("math-tex") === -1) {
                    var div = document.createElement("div");
                    div.innerHTML = html;
                    return div.textContent || div.innerText || "";
                }
                if (html === undefined) {
                    return "";
                }
                return html;
            };
        })
        .filter('charcount', function () {
            return function (text) {
                return text.replace(/(^"|"$|\\n)/g, "").replace(/\s+/g, ' ').trim().length;
            };
        })
        .filter('wordcount', function () {
            return function (text) {
                var words = text.replace(/(\S\.)(?!\s)/g, "$1 ").replace(/(^"|"$|\\n)/g, '').match(/\S+/g);
                return words ? words.length : 0;
            };
        })
        .filter('diffInMinutesTo', function () {
            var magicNumber = (1000 * 60);

            return function (fromDate, toDate) {
                if (toDate && fromDate) {
                    var diff = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / magicNumber;
                    return Math.round(diff);
                }
            };
        })
        .filter('diffInDaysToNow', function () {
            var magicNumber = (1000 * 60 * 60 * 24);

            return function (fromDate) {
                if (fromDate) {
                    var diff = (new Date(fromDate).getTime() - new Date().getTime()) / magicNumber;
                    if (diff < 0) {
                        return '<span class="sitnet-text-alarm">' + Math.floor(diff) + '</span>';
                    }
                    return '<span>' + Math.floor(diff) + '</span>';
                }
            };
        })
        .filter('offset', function () {
            return function (input, start) {
                if (!input) return [];
                start = parseInt(start);
                return input.slice(start);
            };
        })
        .filter('pagefill', function () {
            return function (input, total, current, pageSize) {
                total = parseInt(total, 10);
                current = parseInt(current, 10);
                pageSize = parseInt(pageSize, 10);
                var pages = Math.floor(total / pageSize);
                if (pages > 0 && current === pages) {
                    var amount = (pages + 1) * pageSize - total;
                    for (var i = 0; i < amount; ++i) input.push(i);
                }
                return input;
            };
        })
        .filter('zeropad', function () {
            return function (input) {
                input += '';
                return input.length > 1 ? input : '0' + input;
            };
        })
        .filter('adjustdst', function () {
            return function (date) {
                if (moment(date).isDST()) {
                    date = moment(date).add(-1, 'hour').format();
                }
                return date;
            };
        });
}());
;'use strict';

angular.module('app')
    // Lodash factory
    .factory('lodash', ['$window', function ($window) {
        return $window._;
    }])
    // Toastr factory
    .factory('toast', ['$window', function ($window) {
        var toast = $window.toastr;
        toast.options.preventDuplicates = true;
        return toast;
    }]);;'use strict';

angular.module('app').run(['$http', '$sessionStorage', 'Session', 'EXAM_CONF',
    function ($http, $sessionStorage, Session, EXAM_CONF) {
        var user = $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY];
        if (user) {
            if (!user.loginRole) {
                // This happens if user refreshes the tab before having selected a login role,
                // lets just throw him out.
                Session.logout();
            }
            var header = {};
            header[EXAM_CONF.AUTH_HEADER] = user.token;
            $http.defaults.headers.common = header;
            Session.setUser(user);
            Session.translate(user.lang);
            Session.restartSessionCheck();
        } else {
            Session.switchLanguage('en');
            Session.login('', '');
        }
    }
]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.calendar')
    .component('bookingCalendar', {
        template: '<div id="calendarBlock" style="display:none">\n' +
        '                <div class="col-md-12 calendar-no-paddings" id="calendar" config="$ctrl.calendarConfig"\n' +
        '                     ng-model="$ctrl.eventSources"\n' +
        '                     ui-calendar="$ctrl.calendarConfig" calendar="myCalendar">\n' +
        '               </div>\n' +
        '            </div>',
        bindings: {
            'onRefresh': '&',
            'onEventSelected': '&',
            'room': '<',
            'minDate': '<',
            'maxDate': '<'
        }, controller: ['$translate', 'Calendar',
            function ($translate, Calendar) {

                var vm = this;

                vm.$onInit = function () {
                    vm.eventSources = [];

                    var selectedEvent;
                    vm.calendarConfig = {
                        editable: false,
                        selectable: false,
                        selectHelper: false,
                        defaultView: 'agendaWeek',
                        allDaySlot: false,
                        weekNumbers: false,
                        firstDay: 1,
                        timeFormat: 'H:mm',
                        columnFormat: 'dd D.M',
                        titleFormat: 'D.M.YYYY',
                        slotLabelFormat: 'H:mm',
                        slotEventOverlap: false,
                        buttonText: {
                            today: $translate.instant('sitnet_today')
                        },
                        header: {
                            left: 'myCustomButton',
                            center: 'prev title next',
                            right: 'today'
                        },
                        customButtons: {
                            myCustomButton: {
                                text: moment().format('MMMM YYYY'),
                                click: function () {

                                }
                            }
                        },
                        events: function (start, end, timezone, callback) {
                            Calendar.renderCalendarTitle();
                            vm.onRefresh({start: start, callback: callback});
                        },
                        eventClick: function (event) {
                            //vm.validSelections = false;
                            if (event.availableMachines > 0) {
                                vm.onEventSelected({start: event.start, end: event.end});
                                if (selectedEvent) {
                                    $(selectedEvent).css('background-color', '#A6E9B2');
                                }
                                event.selected = !event.selected;
                                selectedEvent = $(this);
                                $(this).css('background-color', '#266B99');
                            }
                        },
                        eventMouseover: function (event, jsEvent, view) {
                            if (!event.selected && event.availableMachines > 0) {
                                $(this).css('cursor', 'pointer');
                                $(this).css('background-color', '#3CA34F');
                            }
                        },
                        eventMouseout: function (event, jsEvent, view) {
                            if (!event.selected && event.availableMachines > 0) {
                                $(this).css('background-color', '#A6E9B2');
                            }
                        },
                        eventRender: function (event, element, view) {
                            if (event.availableMachines > 0) {
                                element.attr('title', $translate.instant('sitnet_new_reservation') + ' ' +
                                    event.start.format('HH:mm') + ' - ' + event.end.format('HH:mm'));
                            }
                        },
                        eventAfterAllRender: function (view) {
                            // Disable next/prev buttons if date range is off limits
                            var prevButton = $('.fc-prev-button');
                            var nextButton = $('.fc-next-button');
                            var todayButton = $('.fc-today-button');

                            var today = moment();

                            if (vm.minDate >= view.start && vm.minDate <= view.end) {
                                prevButton.prop('disabled', true);
                                prevButton.addClass('fc-state-disabled');
                            }
                            else {
                                prevButton.removeClass('fc-state-disabled');
                                prevButton.prop('disabled', false);
                            }
                            if (vm.maxDate >= view.start && vm.maxDate <= view.end) {
                                nextButton.prop('disabled', true);
                                nextButton.addClass('fc-state-disabled');
                            } else {
                                nextButton.removeClass('fc-state-disabled');
                                nextButton.prop('disabled', false);
                            }
                            if (today < vm.minDate) {
                                todayButton.prop('disabled', true);
                                todayButton.addClass('fc-state-disabled');
                            } else {
                                todayButton.removeClass('fc-state-disabled');
                                todayButton.prop('disabled', false);
                            }
                        }
                    };
                };

                vm.$onChanges = function (props) {
                    if (props.room && props.room.currentValue) {
                        var room = props.room.currentValue;
                        var minTime = Calendar.getEarliestOpening(room);
                        var maxTime = Calendar.getLatestClosing(room);
                        var hiddenDays = Calendar.getClosedWeekdays(room);
                        $('#calendar').fullCalendar(
                            $.extend(vm.calendarConfig, {
                                timezone: room.localTimezone,
                                minTime: minTime,
                                maxTime: maxTime,
                                scrollTime: minTime,
                                hiddenDays: hiddenDays,
                                height: 'auto'
                            })
                        );
                    }
                };
            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.calendar')
    .component('calendar', {
        templateUrl: '/assets/app/calendar/calendar.template.html',
        bindings: {
            'isExternal': '<'
        }, controller: ['$http', '$scope', '$location', '$translate', '$routeParams', 'DateTime',
            'StudentExamRes', 'Calendar', 'SettingsResource', 'InteroperabilityResource',
            'uiCalendarConfig', 'toast',
            function ($http, $scope, $location, $translate, $routeParams, DateTime, StudentExamRes,
                      Calendar, SettingsResource, InteroperabilityResource, uiCalendarConfig, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.limitations = {};
                    vm.openingHours = [];
                    vm.exceptionHours = [];
                    vm.loader = {
                        loading: false
                    };
                    SettingsResource.iop.get(function (data) {
                        vm.isInteroperable = data.isInteroperable;
                        if (vm.isInteroperable && vm.isExternal) {
                            InteroperabilityResource.organisations.query(function (data) {
                                vm.organisations = data.filter(function (org) {
                                    return !org.homeOrg;
                                });
                            });
                        }
                    });

                    StudentExamRes.examInfo.get({eid: $routeParams.id}, function (info) {
                        vm.examInfo = info;
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('gotoDate', moment.max(moment(),
                            moment(vm.examInfo.examActiveStartDate))); // Not sure if this works now?
                        Calendar.reservationWindowApi.get(function (setting) {
                            vm.reservationWindowEndDate = moment().add(setting.value, 'days');
                            vm.minDate = moment.max(moment(), moment(vm.examInfo.examActiveStartDate));
                            vm.maxDate = moment.min(vm.reservationWindowEndDate, moment(vm.examInfo.examActiveEndDate));

                            vm.showReservationWindowInfo = function () {
                                return moment(vm.examInfo.examActiveEndDate) > vm.reservationWindowEndDate;
                            };
                            vm.getReservationWindowDescription = function () {
                                return $translate.instant('sitnet_description_reservation_window')
                                        .replace('{}', setting.value) + ' (' +
                                    vm.reservationWindowEndDate.format('DD.MM.YYYY') + ')';
                            };
                            $http.get('/app/accessibility').success(function (data) {
                                vm.accessibilities = data;
                                vm.selectedAccessibilities = function () {
                                    return vm.accessibilities.filter(function (a) {
                                        return a.filtered;
                                    });
                                };
                            });
                            $http.get('/app/rooms').then(function (reply) {
                                vm.rooms = reply.data;

                                vm.selectedRoom = function () {
                                    var room = null;
                                    vm.rooms.some(function (r) {
                                        if (r.filtered) {
                                            room = r;
                                            return true;
                                        }
                                    });
                                    return room;
                                };

                                vm.getRoomInstructions = function () {
                                    if (!vm.selectedRoom()) {
                                        return;
                                    }
                                    var info;
                                    switch ($translate.use()) {
                                        case 'fi':
                                            info = vm.selectedRoom().roomInstruction;
                                            break;
                                        case 'sv':
                                            info = vm.selectedRoom().roomInstructionSV;
                                            break;
                                        case 'en':
                                        /* falls through */
                                        default:
                                            info = vm.selectedRoom().roomInstructionEN;
                                            break;
                                    }
                                    return info;
                                };

                                vm.getRoomAccessibility = function () {
                                    if (!vm.selectedRoom()) {
                                        return;
                                    }
                                    return vm.selectedRoom().accessibility.map(function (a) {
                                        return a.name;
                                    }).join(', ');
                                };

                            });
                        });
                    }, function (err) {
                        toastr.error(err.data);
                    });
                };

                vm.makeExternalReservation = function () {
                    $location.path('/iop/calendar/' + $routeParams.id);
                };

                vm.makeInternalReservation = function () {
                    $location.path('/calendar/' + $routeParams.id);
                };

                var adjust = function (date, tz) {
                    date = moment.tz(date, tz);
                    var offset = date.isDST() ? -1 : 0;
                    return date.add(offset, 'hour').format();
                };

                var getTitle = function (slot) {
                    if (slot.availableMachines > 0) {
                        return $translate.instant('sitnet_slot_available') + ' (' + slot.availableMachines + ')';
                    }
                    if (slot.availableMachines < 0) {
                        return slot.conflictingExam || $translate.instant('sitnet_own_reservation');
                    }
                    return $translate.instant('sitnet_reserved');
                };

                var getColor = function (slot) {
                    if (slot.availableMachines < 0) {
                        return '#266B99';
                    }
                    if (slot.availableMachines > 0) {
                        return '#A6E9B2';
                    }
                    return '#D8D8D8';
                };

                var query = function (success, error, date, room, accessibility) {
                    if (vm.isExternal) {
                        InteroperabilityResource.slots.query({
                            examId: $routeParams.id,
                            roomRef: room._id,
                            org: vm.selectedOrganisation._id,
                            date: date
                        }, success, error);
                    } else {
                        Calendar.slotsApi.query({
                            eid: $routeParams.id,
                            rid: room.id,
                            day: date,
                            aids: accessibility
                        }, success, error);
                    }
                };

                vm.refresh = function (start, callback) {
                    var date = start.format();
                    var room = vm.selectedRoom();
                    var accessibility = vm.accessibilities.filter(function (item) {
                        return item.filtered;
                    }).map(function (item) {
                        return item.id;
                    });
                    if (room) {
                        vm.loader.loading = true;
                        var successFn = function (slots) {
                            var tz = room.localTimezone;
                            var events = slots.map(function (slot) {
                                return {
                                    title: getTitle(slot),
                                    color: getColor(slot),
                                    start: adjust(slot.start, tz),
                                    end: adjust(slot.end, tz),
                                    availableMachines: slot.availableMachines
                                };
                            });
                            callback(events);
                            vm.loader.loading = false;
                        };
                        var errorFn = function (error) {
                            vm.loader.loading = false;
                            if (error && error.status === 404) {
                                toast.error($translate.instant('sitnet_exam_not_active_now'));
                            } else if (error) {
                                toast.error(error.data.message);
                            } else {
                                toast.error($translate.instant('sitnet_no_suitable_enrolment_found'));
                            }
                        };
                        query(successFn, errorFn, date, room, accessibility);
                        vm.exceptionHours = Calendar.getExceptionHours();
                    }
                };

                $scope.$on('$localeChangeSuccess', function () {
                    vm.calendarConfig.buttonText.today = $translate.instant('sitnet_today');
                    vm.openingHours = Calendar.processOpeningHours(vm.selectedRoom());
                });

                var listExternalRooms = function () {
                    if (vm.selectedOrganisation) {
                        InteroperabilityResource.facilities.query({org: vm.selectedOrganisation._id}, function (data) {
                            vm.rooms = data;
                        });
                    }
                };


                vm.createReservation = function (start, end) {
                    vm.reservation = {
                        room: vm.selectedRoom().name,
                        time: start.format('DD.MM.YYYY HH:mm') + ' - ' + end.format('HH:mm'),
                        start: start,
                        end: end
                    };
                };

                vm.confirmReservation = function () {
                    if (vm.reservation) {
                        Calendar.reserve(
                            vm.reservation.start,
                            vm.reservation.end,
                            vm.selectedRoom(),
                            vm.accessibilities,
                            vm.selectedOrganisation);
                    }
                };

                vm.setOrganisation = function (org) {
                    vm.selectedOrganisation = org;
                    org.filtered = !org.filtered;
                    vm.rooms.forEach(function (r) {
                        delete r.filtered;
                    });
                    //uiCalendarConfig.calendars.externalCalendar.fullCalendar('refetchEvents');
                    listExternalRooms();
                };

                vm.selectAccessibility = function (accessibility) {
                    accessibility.filtered = !accessibility.filtered;
                    if (vm.selectedRoom()) {
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('refetchEvents');
                    }
                };

                vm.getDescription = function (room) {
                    if (room.outOfService) {
                        var status = room.statusComment ? ': ' + room.statusComment : '';
                        return $translate.instant('sitnet_room_out_of_service') + status;
                    }
                    return room.name;
                };

                vm.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                vm.selectRoom = function (room) {
                    if (!room.outOfService) {
                        vm.rooms.forEach(function (room) {
                            delete room.filtered;
                        });
                        room.filtered = true;
                        vm.openingHours = Calendar.processOpeningHours(room);
                    }
                };

            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.calendar')
    .service('Calendar', ['$resource', '$uibModal', '$http', '$routeParams', '$translate', '$location',
        'DateTime', 'Session', 'InteroperabilityResource', 'toast',
        function ($resource, $modal, $http, $routeParams, $translate, $location, DateTime, Session, InteroperabilityResource, toast) {

            var self = this;

            self.slotsApi = $resource('/app/calendar/:eid/:rid', {eid: '@eid', rid: '@rid'});
            self.reservationWindowApi = $resource('/app/settings/reservationWindow');

            var adjustBack = function (date, tz) {
                date = moment.tz(date, tz);
                var offset = date.isDST() ? 1 : 0;
                return moment.utc(date.add(offset, 'hour')).format();
            };

            self.reserve = function (start, end, room, accessibilities, org) {
                var tz = room.localTimezone;
                var slot = {};
                slot.start = adjustBack(start, tz);
                slot.end = adjustBack(end, tz);
                slot.examId = parseInt($routeParams.id);
                if (org) { // External reservation request
                    slot.roomId = room._id;
                    slot.orgId = org ? org._id : undefined;
                    InteroperabilityResource.reservations.create(slot, function () {
                        $location.path('/');
                    }, function (error) {
                        toast.error(error.data);
                    });
                } else {
                    slot.roomId = room.id;
                    slot.aids = accessibilities.filter(
                        function (item) {
                            return item.filtered;
                        })
                        .map(function (item) {
                            return item.id;
                        });
                    $http.post('/app/calendar/reservation', slot).then(function () {
                        $location.path('/');
                    }, function (error) {
                        toast.error(error.data);
                    });
                }

            };


            self.renderCalendarTitle = function () {
                // Fix date range format in title
                var selector = $('.fc-toolbar .fc-center > h2');
                var title = selector.text();
                var newTitle = '';
                var separator = ' — ';
                var endPart = title.split(separator)[1];
                var startFragments = title.split(separator)[0].split('.').filter(function (x) {
                    // ignore empty fragments (introduced if title already correctly formatted)
                    return x;
                });
                if (startFragments.length < 3) {
                    startFragments.forEach(function (f) {
                        newTitle += f;
                        if (f && f[f.length - 1] !== '.') {
                            newTitle += '.';
                        }
                    });
                    newTitle += separator + endPart;
                    selector.text(newTitle);
                }
            };

            var getWeekdayNames = function () {
                var lang = Session.getUser().lang;
                var locale = lang.toLowerCase() + '-' + lang.toUpperCase();
                var options = {weekday: 'short'};
                var weekday = DateTime.getDateForWeekday;
                return {
                    SUNDAY: {ord: 7, name: weekday(0).toLocaleDateString(locale, options)},
                    MONDAY: {ord: 1, name: weekday(1).toLocaleDateString(locale, options)},
                    TUESDAY: {ord: 2, name: weekday(2).toLocaleDateString(locale, options)},
                    WEDNESDAY: {ord: 3, name: weekday(3).toLocaleDateString(locale, options)},
                    THURSDAY: {ord: 4, name: weekday(4).toLocaleDateString(locale, options)},
                    FRIDAY: {ord: 5, name: weekday(5).toLocaleDateString(locale, options)},
                    SATURDAY: {ord: 6, name: weekday(6).toLocaleDateString(locale, options)}
                };
            };

            var findOpeningHours = function (obj, items) {
                var found = null;
                items.some(function (item) {
                    if (item.ref === obj.weekday) {
                        found = item;
                        return true;
                    }
                });
                return found;
            };

            self.processOpeningHours = function (room) {
                if (!room) {
                    return;
                }
                var weekdayNames = getWeekdayNames();
                var openingHours = [];
                var tz = room.localTimezone;

                room.defaultWorkingHours.forEach(function (dwh) {
                    if (!findOpeningHours(dwh, openingHours)) {
                        var obj = {
                            name: weekdayNames[dwh.weekday].name,
                            ref: dwh.weekday,
                            ord: weekdayNames[dwh.weekday].ord,
                            periods: []
                        };
                        openingHours.push(obj);
                    }
                    var hours = findOpeningHours(dwh, openingHours);
                    hours.periods.push(
                        moment.tz(dwh.startTime, tz).format('HH:mm') + ' - ' +
                        moment.tz(dwh.endTime, tz).format('HH:mm'));
                });
                openingHours.forEach(function (oh) {
                    oh.periods = oh.periods.sort().join(', ');
                });
                return openingHours.sort(function (a, b) {
                    return a.ord > b.ord;
                });
            };

            var formatExceptionEvent = function (event, tz) {
                var startDate = moment.tz(event.startDate, tz);
                var endDate = moment.tz(event.endDate, tz);
                var offset = moment.tz(tz).isDST() ? -1 : 0;
                startDate.add(offset, 'hour');
                endDate.add(offset, 'hour');
                event.start = startDate.format('DD.MM.YYYY HH:mm');
                event.end = endDate.format('DD.MM.YYYY HH:mm');
                event.description = event.outOfService ? 'sitnet_closed' : 'sitnet_open';
            };

            self.getExceptionHours = function (room) {
                if (!room) {
                    return;
                }
                var start = moment.max(moment(),
                    uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').start);
                var end = uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').end;
                var events = room.calendarExceptionEvents.filter(function (e) {
                    return (moment(e.startDate) > start && moment(e.endDate) < end);
                });
                events.forEach(formatExceptionEvent.call(this, room.localTimezone));
                return events;
            };

            self.getEarliestOpening = function (room) {
                var tz = room.localTimezone;
                var openings = room.defaultWorkingHours.map(function (dwh) {
                    var start = moment.tz(dwh.startTime, tz);
                    return moment().hours(start.hours()).minutes(start.minutes()).seconds(start.seconds());
                });
                return moment.min(openings);
            };

            self.getLatestClosing = function (room) {
                var tz = room.localTimezone;
                var closings = room.defaultWorkingHours.map(function (dwh) {
                    var end = moment.tz(dwh.endTime, tz);
                    return moment().hours(end.hours()).minutes(end.minutes()).seconds(end.seconds());
                });
                return moment.max(closings);
            };

            self.getClosedWeekdays = function (room) {
                var weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                var openedDays = room.defaultWorkingHours.map(function (dwh) {
                    return weekdays.indexOf(dwh.weekday);
                });
                return [0, 1, 2, 3, 4, 5, 6].filter(function (x) {
                    return openedDays.indexOf(x) === -1;
                });
            };

        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.common')
    .service('Language', ['$resource', function ($resource) {

        var self = this;

        self.languageApi = $resource('/app/languages');

        var isoLangs = {
            "ab":{
                "name":"Abkhaz",
                "nativeName":"аҧсуа"
            },
            "aa":{
                "name":"Afar",
                "nativeName":"Afaraf"
            },
            "af":{
                "name":"Afrikaans",
                "nativeName":"Afrikaans"
            },
            "ak":{
                "name":"Akan",
                "nativeName":"Akan"
            },
            "sq":{
                "name":"Albanian",
                "nativeName":"Shqip"
            },
            "am":{
                "name":"Amharic",
                "nativeName":"አማርኛ"
            },
            "ar":{
                "name":"Arabic",
                "nativeName":"العربية"
            },
            "an":{
                "name":"Aragonese",
                "nativeName":"Aragonés"
            },
            "hy":{
                "name":"Armenian",
                "nativeName":"Հայերեն"
            },
            "as":{
                "name":"Assamese",
                "nativeName":"অসমীয়া"
            },
            "av":{
                "name":"Avaric",
                "nativeName":"авар мацӀ, магӀарул мацӀ"
            },
            "ae":{
                "name":"Avestan",
                "nativeName":"avesta"
            },
            "ay":{
                "name":"Aymara",
                "nativeName":"aymar aru"
            },
            "az":{
                "name":"Azerbaijani",
                "nativeName":"azərbaycan dili"
            },
            "bm":{
                "name":"Bambara",
                "nativeName":"bamanankan"
            },
            "ba":{
                "name":"Bashkir",
                "nativeName":"башҡорт теле"
            },
            "eu":{
                "name":"Basque",
                "nativeName":"euskara, euskera"
            },
            "be":{
                "name":"Belarusian",
                "nativeName":"Беларуская"
            },
            "bn":{
                "name":"Bengali",
                "nativeName":"বাংলা"
            },
            "bh":{
                "name":"Bihari",
                "nativeName":"भोजपुरी"
            },
            "bi":{
                "name":"Bislama",
                "nativeName":"Bislama"
            },
            "bs":{
                "name":"Bosnian",
                "nativeName":"bosanski jezik"
            },
            "br":{
                "name":"Breton",
                "nativeName":"brezhoneg"
            },
            "bg":{
                "name":"Bulgarian",
                "nativeName":"български език"
            },
            "my":{
                "name":"Burmese",
                "nativeName":"ဗမာစာ"
            },
            "ca":{
                "name":"Catalan; Valencian",
                "nativeName":"Català"
            },
            "ch":{
                "name":"Chamorro",
                "nativeName":"Chamoru"
            },
            "ce":{
                "name":"Chechen",
                "nativeName":"нохчийн мотт"
            },
            "ny":{
                "name":"Chichewa; Chewa; Nyanja",
                "nativeName":"chiCheŵa, chinyanja"
            },
            "zh":{
                "name":"Chinese",
                "nativeName":"中文 (Zhōngwén), 汉语, 漢語"
            },
            "cv":{
                "name":"Chuvash",
                "nativeName":"чӑваш чӗлхи"
            },
            "kw":{
                "name":"Cornish",
                "nativeName":"Kernewek"
            },
            "co":{
                "name":"Corsican",
                "nativeName":"corsu, lingua corsa"
            },
            "cr":{
                "name":"Cree",
                "nativeName":"ᓀᐦᐃᔭᐍᐏᐣ"
            },
            "hr":{
                "name":"Croatian",
                "nativeName":"hrvatski"
            },
            "cs":{
                "name":"Czech",
                "nativeName":"česky, čeština"
            },
            "da":{
                "name":"Danish",
                "nativeName":"dansk"
            },
            "dv":{
                "name":"Divehi; Dhivehi; Maldivian;",
                "nativeName":"ދިވެހި"
            },
            "nl":{
                "name":"Dutch",
                "nativeName":"Nederlands, Vlaams"
            },
            "en":{
                "name":"English",
                "nativeName":"English"
            },
            "eo":{
                "name":"Esperanto",
                "nativeName":"Esperanto"
            },
            "et":{
                "name":"Estonian",
                "nativeName":"eesti, eesti keel"
            },
            "ee":{
                "name":"Ewe",
                "nativeName":"Eʋegbe"
            },
            "fo":{
                "name":"Faroese",
                "nativeName":"føroyskt"
            },
            "fj":{
                "name":"Fijian",
                "nativeName":"vosa Vakaviti"
            },
            "fi":{
                "name":"Finnish",
                "nativeName":"suomi"
            },
            "fr":{
                "name":"French",
                "nativeName":"français, langue française"
            },
            "ff":{
                "name":"Fula; Fulah; Pulaar; Pular",
                "nativeName":"Fulfulde, Pulaar, Pular"
            },
            "gl":{
                "name":"Galician",
                "nativeName":"Galego"
            },
            "ka":{
                "name":"Georgian",
                "nativeName":"ქართული"
            },
            "de":{
                "name":"German",
                "nativeName":"Deutsch"
            },
            "el":{
                "name":"Greek, Modern",
                "nativeName":"Ελληνικά"
            },
            "gn":{
                "name":"Guaraní",
                "nativeName":"Avañeẽ"
            },
            "gu":{
                "name":"Gujarati",
                "nativeName":"ગુજરાતી"
            },
            "ht":{
                "name":"Haitian; Haitian Creole",
                "nativeName":"Kreyòl ayisyen"
            },
            "ha":{
                "name":"Hausa",
                "nativeName":"Hausa, هَوُسَ"
            },
            "he":{
                "name":"Hebrew (modern)",
                "nativeName":"עברית"
            },
            "hz":{
                "name":"Herero",
                "nativeName":"Otjiherero"
            },
            "hi":{
                "name":"Hindi",
                "nativeName":"हिन्दी, हिंदी"
            },
            "ho":{
                "name":"Hiri Motu",
                "nativeName":"Hiri Motu"
            },
            "hu":{
                "name":"Hungarian",
                "nativeName":"Magyar"
            },
            "ia":{
                "name":"Interlingua",
                "nativeName":"Interlingua"
            },
            "id":{
                "name":"Indonesian",
                "nativeName":"Bahasa Indonesia"
            },
            "ie":{
                "name":"Interlingue",
                "nativeName":"Originally called Occidental; then Interlingue after WWII"
            },
            "ga":{
                "name":"Irish",
                "nativeName":"Gaeilge"
            },
            "ig":{
                "name":"Igbo",
                "nativeName":"Asụsụ Igbo"
            },
            "ik":{
                "name":"Inupiaq",
                "nativeName":"Iñupiaq, Iñupiatun"
            },
            "io":{
                "name":"Ido",
                "nativeName":"Ido"
            },
            "is":{
                "name":"Icelandic",
                "nativeName":"Íslenska"
            },
            "it":{
                "name":"Italian",
                "nativeName":"Italiano"
            },
            "iu":{
                "name":"Inuktitut",
                "nativeName":"ᐃᓄᒃᑎᑐᑦ"
            },
            "ja":{
                "name":"Japanese",
                "nativeName":"日本語 (にほんご／にっぽんご)"
            },
            "jv":{
                "name":"Javanese",
                "nativeName":"basa Jawa"
            },
            "kl":{
                "name":"Kalaallisut, Greenlandic",
                "nativeName":"kalaallisut, kalaallit oqaasii"
            },
            "kn":{
                "name":"Kannada",
                "nativeName":"ಕನ್ನಡ"
            },
            "kr":{
                "name":"Kanuri",
                "nativeName":"Kanuri"
            },
            "ks":{
                "name":"Kashmiri",
                "nativeName":"कश्मीरी, كشميري‎"
            },
            "kk":{
                "name":"Kazakh",
                "nativeName":"Қазақ тілі"
            },
            "km":{
                "name":"Khmer",
                "nativeName":"ភាសាខ្មែរ"
            },
            "ki":{
                "name":"Kikuyu, Gikuyu",
                "nativeName":"Gĩkũyũ"
            },
            "rw":{
                "name":"Kinyarwanda",
                "nativeName":"Ikinyarwanda"
            },
            "ky":{
                "name":"Kirghiz, Kyrgyz",
                "nativeName":"кыргыз тили"
            },
            "kv":{
                "name":"Komi",
                "nativeName":"коми кыв"
            },
            "kg":{
                "name":"Kongo",
                "nativeName":"KiKongo"
            },
            "ko":{
                "name":"Korean",
                "nativeName":"한국어 (韓國語), 조선말 (朝鮮語)"
            },
            "ku":{
                "name":"Kurdish",
                "nativeName":"Kurdî, كوردی‎"
            },
            "kj":{
                "name":"Kwanyama, Kuanyama",
                "nativeName":"Kuanyama"
            },
            "la":{
                "name":"Latin",
                "nativeName":"latine, lingua latina"
            },
            "lb":{
                "name":"Luxembourgish, Letzeburgesch",
                "nativeName":"Lëtzebuergesch"
            },
            "lg":{
                "name":"Luganda",
                "nativeName":"Luganda"
            },
            "li":{
                "name":"Limburgish, Limburgan, Limburger",
                "nativeName":"Limburgs"
            },
            "ln":{
                "name":"Lingala",
                "nativeName":"Lingála"
            },
            "lo":{
                "name":"Lao",
                "nativeName":"ພາສາລາວ"
            },
            "lt":{
                "name":"Lithuanian",
                "nativeName":"lietuvių kalba"
            },
            "lu":{
                "name":"Luba-Katanga",
                "nativeName":""
            },
            "lv":{
                "name":"Latvian",
                "nativeName":"latviešu valoda"
            },
            "gv":{
                "name":"Manx",
                "nativeName":"Gaelg, Gailck"
            },
            "mk":{
                "name":"Macedonian",
                "nativeName":"македонски јазик"
            },
            "mg":{
                "name":"Malagasy",
                "nativeName":"Malagasy fiteny"
            },
            "ms":{
                "name":"Malay",
                "nativeName":"bahasa Melayu, بهاس ملايو‎"
            },
            "ml":{
                "name":"Malayalam",
                "nativeName":"മലയാളം"
            },
            "mt":{
                "name":"Maltese",
                "nativeName":"Malti"
            },
            "mi":{
                "name":"Māori",
                "nativeName":"te reo Māori"
            },
            "mr":{
                "name":"Marathi (Marāṭhī)",
                "nativeName":"मराठी"
            },
            "mh":{
                "name":"Marshallese",
                "nativeName":"Kajin M̧ajeļ"
            },
            "mn":{
                "name":"Mongolian",
                "nativeName":"монгол"
            },
            "na":{
                "name":"Nauru",
                "nativeName":"Ekakairũ Naoero"
            },
            "nv":{
                "name":"Navajo, Navaho",
                "nativeName":"Diné bizaad, Dinékʼehǰí"
            },
            "nb":{
                "name":"Norwegian Bokmål",
                "nativeName":"Norsk bokmål"
            },
            "nd":{
                "name":"North Ndebele",
                "nativeName":"isiNdebele"
            },
            "ne":{
                "name":"Nepali",
                "nativeName":"नेपाली"
            },
            "ng":{
                "name":"Ndonga",
                "nativeName":"Owambo"
            },
            "nn":{
                "name":"Norwegian Nynorsk",
                "nativeName":"Norsk nynorsk"
            },
            "no":{
                "name":"Norwegian",
                "nativeName":"Norsk"
            },
            "ii":{
                "name":"Nuosu",
                "nativeName":"ꆈꌠ꒿ Nuosuhxop"
            },
            "nr":{
                "name":"South Ndebele",
                "nativeName":"isiNdebele"
            },
            "oc":{
                "name":"Occitan",
                "nativeName":"Occitan"
            },
            "oj":{
                "name":"Ojibwe, Ojibwa",
                "nativeName":"ᐊᓂᔑᓈᐯᒧᐎᓐ"
            },
            "cu":{
                "name":"Old Church Slavonic, Church Slavic, Church Slavonic, Old Bulgarian, Old Slavonic",
                "nativeName":"ѩзыкъ словѣньскъ"
            },
            "om":{
                "name":"Oromo",
                "nativeName":"Afaan Oromoo"
            },
            "or":{
                "name":"Oriya",
                "nativeName":"ଓଡ଼ିଆ"
            },
            "os":{
                "name":"Ossetian, Ossetic",
                "nativeName":"ирон æвзаг"
            },
            "pa":{
                "name":"Panjabi, Punjabi",
                "nativeName":"ਪੰਜਾਬੀ, پنجابی‎"
            },
            "pi":{
                "name":"Pāli",
                "nativeName":"पाऴि"
            },
            "fa":{
                "name":"Persian",
                "nativeName":"فارسی"
            },
            "pl":{
                "name":"Polish",
                "nativeName":"polski"
            },
            "ps":{
                "name":"Pashto, Pushto",
                "nativeName":"پښتو"
            },
            "pt":{
                "name":"Portuguese",
                "nativeName":"Português"
            },
            "qu":{
                "name":"Quechua",
                "nativeName":"Runa Simi, Kichwa"
            },
            "rm":{
                "name":"Romansh",
                "nativeName":"rumantsch grischun"
            },
            "rn":{
                "name":"Kirundi",
                "nativeName":"kiRundi"
            },
            "ro":{
                "name":"Romanian, Moldavian, Moldovan",
                "nativeName":"română"
            },
            "ru":{
                "name":"Russian",
                "nativeName":"русский язык"
            },
            "sa":{
                "name":"Sanskrit (Saṁskṛta)",
                "nativeName":"संस्कृतम्"
            },
            "sc":{
                "name":"Sardinian",
                "nativeName":"sardu"
            },
            "sd":{
                "name":"Sindhi",
                "nativeName":"सिन्धी, سنڌي، سندھی‎"
            },
            "se":{
                "name":"Northern Sami",
                "nativeName":"Davvisámegiella"
            },
            "sm":{
                "name":"Samoan",
                "nativeName":"gagana faa Samoa"
            },
            "sg":{
                "name":"Sango",
                "nativeName":"yângâ tî sängö"
            },
            "sr":{
                "name":"Serbian",
                "nativeName":"српски језик"
            },
            "gd":{
                "name":"Scottish Gaelic; Gaelic",
                "nativeName":"Gàidhlig"
            },
            "sn":{
                "name":"Shona",
                "nativeName":"chiShona"
            },
            "si":{
                "name":"Sinhala, Sinhalese",
                "nativeName":"සිංහල"
            },
            "sk":{
                "name":"Slovak",
                "nativeName":"slovenčina"
            },
            "sl":{
                "name":"Slovene",
                "nativeName":"slovenščina"
            },
            "so":{
                "name":"Somali",
                "nativeName":"Soomaaliga, af Soomaali"
            },
            "st":{
                "name":"Southern Sotho",
                "nativeName":"Sesotho"
            },
            "es":{
                "name":"Spanish; Castilian",
                "nativeName":"español, castellano"
            },
            "su":{
                "name":"Sundanese",
                "nativeName":"Basa Sunda"
            },
            "sw":{
                "name":"Swahili",
                "nativeName":"Kiswahili"
            },
            "ss":{
                "name":"Swati",
                "nativeName":"SiSwati"
            },
            "sv":{
                "name":"Swedish",
                "nativeName":"svenska"
            },
            "ta":{
                "name":"Tamil",
                "nativeName":"தமிழ்"
            },
            "te":{
                "name":"Telugu",
                "nativeName":"తెలుగు"
            },
            "tg":{
                "name":"Tajik",
                "nativeName":"тоҷикӣ, toğikī, تاجیکی‎"
            },
            "th":{
                "name":"Thai",
                "nativeName":"ไทย"
            },
            "ti":{
                "name":"Tigrinya",
                "nativeName":"ትግርኛ"
            },
            "bo":{
                "name":"Tibetan Standard, Tibetan, Central",
                "nativeName":"བོད་ཡིག"
            },
            "tk":{
                "name":"Turkmen",
                "nativeName":"Türkmen, Түркмен"
            },
            "tl":{
                "name":"Tagalog",
                "nativeName":"Wikang Tagalog, ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔"
            },
            "tn":{
                "name":"Tswana",
                "nativeName":"Setswana"
            },
            "to":{
                "name":"Tonga (Tonga Islands)",
                "nativeName":"faka Tonga"
            },
            "tr":{
                "name":"Turkish",
                "nativeName":"Türkçe"
            },
            "ts":{
                "name":"Tsonga",
                "nativeName":"Xitsonga"
            },
            "tt":{
                "name":"Tatar",
                "nativeName":"татарча, tatarça, تاتارچا‎"
            },
            "tw":{
                "name":"Twi",
                "nativeName":"Twi"
            },
            "ty":{
                "name":"Tahitian",
                "nativeName":"Reo Tahiti"
            },
            "ug":{
                "name":"Uighur, Uyghur",
                "nativeName":"Uyƣurqə, ئۇيغۇرچە‎"
            },
            "uk":{
                "name":"Ukrainian",
                "nativeName":"українська"
            },
            "ur":{
                "name":"Urdu",
                "nativeName":"اردو"
            },
            "uz":{
                "name":"Uzbek",
                "nativeName":"zbek, Ўзбек, أۇزبېك‎"
            },
            "ve":{
                "name":"Venda",
                "nativeName":"Tshivenḓa"
            },
            "vi":{
                "name":"Vietnamese",
                "nativeName":"Tiếng Việt"
            },
            "vo":{
                "name":"Volapük",
                "nativeName":"Volapük"
            },
            "wa":{
                "name":"Walloon",
                "nativeName":"Walon"
            },
            "cy":{
                "name":"Welsh",
                "nativeName":"Cymraeg"
            },
            "wo":{
                "name":"Wolof",
                "nativeName":"Wollof"
            },
            "fy":{
                "name":"Western Frisian",
                "nativeName":"Frysk"
            },
            "xh":{
                "name":"Xhosa",
                "nativeName":"isiXhosa"
            },
            "yi":{
                "name":"Yiddish",
                "nativeName":"ייִדיש"
            },
            "yo":{
                "name":"Yoruba",
                "nativeName":"Yorùbá"
            },
            "za":{
                "name":"Zhuang, Chuang",
                "nativeName":"Saɯ cueŋƅ, Saw cuengh"
            }
        };

        self.getLanguageName = function(key) {
            key = key.slice(0,2);
            var lang = isoLangs[key];
            return lang ? lang.name : undefined;
        };
        self.getLanguageNativeName = function(key) {
            key = key.slice(0,2);
            var lang = isoLangs[key];
            return lang ? lang.nativeName : undefined;
        };
        self.getLanguages = function() {
            var languages = [];
            for (var key in isoLangs) {
                if (isoLangs.hasOwnProperty(key)) {
                    languages.push(isoLangs[key]);
                }
            }
            return languages;
        };


    }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.common')
    .factory("SettingsResource", ['$resource',
        function ($resource) {
            return {
                hostname: $resource("/app/settings/hostname"),
                examDurations: $resource("/app/settings/durations"),
                gradeScale: $resource("/app/settings/gradescale"),
                enrolmentPermissions: $resource("/app/settings/enrolmentPermissionCheck"),
                environment: $resource("/app/settings/environment"),
                iop: $resource("/app/settings/iop"),
                maxFilesize: $resource("/app/settings/maxfilesize"),
                appVersion: $resource("/app/settings/appVersion"),
                maturityInstructions: $resource("/app/settings/maturityInstructions")
            };
        }
    ]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.common')
    .factory('UserRes', ['$resource', function ($resource) {
        return {
            userRoles: $resource("/app/users/:id/roles/:role", {
                    id: "@id", role: "@role"
                },
                {
                    "update": {method: "PUT", params: {id: "@id", role: "@role"}}
                }),
            usersByRole: $resource("/app/users/byrole/:role",
                {
                    role: "@role"
                }),

            filterUsers: $resource("/app/users/filter/:role",
                {
                    role: "@role"
                }),

            filterUsersByExam: $resource("/app/users/filter/:role/:eid",
                {
                    eid: "@eid",
                    role: "@role"
                }),

            filterOwnersByExam: $resource("/app/users/exam/owners/:role/:eid",
                {
                    eid: "@eid",
                    role: "@role"
                }),
            filterOwnersByQuestion: $resource("/app/users/question/owners/:role",
                {
                    role: "@role"
                }),

            updateAgreementAccepted: $resource("/app/users/agreement", {},
                {
                    "update": {method: "PUT"}
                }),
            unenrolledStudents: $resource("/app/students/:eid",
                {
                    eid: "@eid"
                })
        };
    }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.dashboard')
    .component('dashboard', {
        templateUrl: '/assets/app/dashboard/dashboard.template.html',
        controller: ['Session',
            function (Session) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.user = Session.getUser();
                    if (!ctrl.user) {
                        console.log('not logged in');
                    }
                };

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.dashboard.student')
    .component('studentDashboard', {
        templateUrl: '/assets/app/dashboard/student/studentDashboard.template.html',
        controller: ['StudentDashboard', 'Reservation', 'Room', 'DateTime', 'Enrolment', 'Session',
            function (StudentDashboard, Reservation, Room, DateTime, Enrolment, Session) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.showInst = 0;
                    ctrl.showGuide = 0;
                    StudentDashboard.listEnrolments().then(function (data) {
                        ctrl.userEnrolments = data.result;
                    });
                };

                ctrl.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                ctrl.removeReservation = function (enrolment) {
                    Reservation.removeReservation(enrolment);
                };

                ctrl.showInstructions = function (id) {
                    ctrl.showInst = ctrl.showInst === id ? 0 : id;
                };

                ctrl.showMaturityInstructions = function (enrolment) {
                    Enrolment.showMaturityInstructions(enrolment);
                };

                ctrl.addEnrolmentInformation = function (enrolment) {
                    Enrolment.addEnrolmentInformation(enrolment);
                };

                ctrl.getUsername = function () {
                    return Session.getUserName();
                };

                ctrl.enrolmentRemoved = function (data) {
                    ctrl.userEnrolments.splice(ctrl.userEnrolments.indexOf(data), 1);
                };

                ctrl.removeEnrolment = function (enrolment, enrolments) {
                    Enrolment.removeEnrolment(enrolment, enrolments);
                };


            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

angular.module('app.dashboard.student')
    .service('StudentDashboard', ['$q', '$resource',
        function ($q, $resource) {

            var self = this;

            var enrolmentApi = $resource('/app/enrolments');

            var setOccasion = function (reservation) {
                var machine = reservation.machine;
                var external = reservation.externalReservation;
                var tz = machine ? machine.room.localTimezone : external.roomTz;
                var start = moment.tz(reservation.startAt, tz);
                var end = moment.tz(reservation.endAt, tz);
                if (start.isDST()) {
                    start.add(-1, 'hour');
                }
                if (end.isDST()) {
                    end.add(-1, 'hour');
                }
                reservation.occasion = {
                    startAt: start.format('HH:mm'),
                    endAt: end.format('HH:mm')
                };
            };

            self.listEnrolments = function () {
                var deferred = $q.defer();

                enrolmentApi.query(function (enrolments) {
                        enrolments.forEach(function (e) {
                            if (e.reservation) {
                                setOccasion(e.reservation);
                            }
                        });
                        deferred.resolve({result: enrolments});
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                );
                return deferred.promise;
            };

        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.dashboard.teacher')
    .component('teacherDashboard', {
        templateUrl: '/assets/app/dashboard/teacher/teacherDashboard.template.html',
        controller: ['TeacherDashboard', 'Exam', 'DateTime', 'Session', 'EXAM_CONF', 'ExamRes',
            'dialogs', '$translate', '$location', '$filter', 'toast',
            function (TeacherDashboard, Exam, DateTime, Session, EXAM_CONF, ExamRes, dialogs,
                      $translate, $location, $filter, toast) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.activeTab = $location.search().tab ? parseInt($location.search().tab) : 1;
                    ctrl.userId = Session.getUser().id;
                    ctrl.templates = {
                        dashboardToolbarPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/toolbar.html',
                        dashboardActiveExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/active_exams.html',
                        dashboardFinishedExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/finished_exams.html',
                        dashboardArchivedExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/archived_exams.html',
                        dashboardDraftExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/draft_exams.html'
                    };
                    // Pagesize for showing finished exams
                    ctrl.pageSize = 10;
                    ctrl.filter = $location.search().filter ? {text: $location.search().filter} : {};
                    ctrl.reduceDraftCount = 0;

                    TeacherDashboard.populate(ctrl).then(function () {
                        ctrl.filteredFinished = ctrl.finishedExams;
                        ctrl.filteredActive = ctrl.activeExams;
                        ctrl.filteredArchived = ctrl.archivedExams;
                        ctrl.filteredDraft = ctrl.draftExams;
                        if (ctrl.filter.text) {
                            ctrl.search();
                        }
                    });
                };

                ctrl.changeTab = function (index) {
                    $location.search('tab', index);
                };

                ctrl.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                ctrl.getUsername = function () {
                    return Session.getUserName();
                };

                ctrl.getExecutionTypeTranslation = function (exam) {
                    return Exam.getExecutionTypeTranslation(exam.executionType.type);
                };

                ctrl.checkOwner = function (isOwner) {

                    if (isOwner) {
                        ctrl.reduceDraftCount += 1;
                        return true;
                    }

                    return false;
                };

                ctrl.search = function () {
                    $location.search('filter', ctrl.filter.text);
                    ctrl.reduceDraftCount = 0;

                    // Use same search parameter for all the 4 result tables
                    ctrl.filteredFinished = $filter('filter')(ctrl.finishedExams, ctrl.filter.text);
                    ctrl.filteredActive = $filter('filter')(ctrl.activeExams, ctrl.filter.text);
                    ctrl.filteredArchived = $filter('filter')(ctrl.archivedExams, ctrl.filter.text);
                    ctrl.filteredDraft = $filter('filter')(ctrl.draftExams, ctrl.filter.text);

                    // for drafts, display exams only for owners AM-1658
                    ctrl.filteredDraft = ctrl.filteredDraft.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === ctrl.userId);
                        });
                        if (owner.length > 0) {
                            return exam;
                        }
                        return false;
                    });

                    // for finished, display exams only for owners OR if exam has unassessed reviews AM-1658
                    ctrl.filteredFinished = ctrl.filteredFinished.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === ctrl.userId);
                        });
                        if (owner.length > 0 || (owner.length === 0 && exam.unassessedCount > 0)) {
                            return exam;
                        }
                        return false;
                    });

                    // for active, display exams only for owners OR if exam has unassessed reviews AM-1658
                    ctrl.filteredActive = ctrl.filteredActive.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === ctrl.userId);
                        });
                        if (owner.length > 0 || (owner.length === 0 && exam.unassessedCount > 0)) {
                            return exam;
                        }
                        return false;
                    });


                };

                ctrl.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toast.success($translate.instant('sitnet_exam_copied'));
                        $location.path('/exams/' + copy.id + '/1/');
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                ctrl.deleteExam = function (exam, listing) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toast.success($translate.instant('sitnet_exam_removed'));
                            if (listing === 'archived') {
                                ctrl.archivedExams.splice(ctrl.archivedExams.indexOf(exam), 1);
                            }
                            if (listing === 'finished') {
                                ctrl.finishedExams.splice(ctrl.finishedExams.indexOf(exam), 1);
                            }
                            if (listing === 'draft') {
                                ctrl.draftExams.splice(ctrl.draftExams.indexOf(exam), 1);
                            }
                            if (listing === 'active') {
                                ctrl.activeExams.splice(ctrl.activeExams.indexOf(exam), 1);
                            }


                        }, function (error) {
                            toast.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                ctrl.isOwner = function (exam) {
                    return exam.examOwners.some(function (eo) {
                        return eo.id === ctrl.userId;
                    });
                };

                ctrl.filterOwners = function (exam) {
                    if (!exam) return false;
                    var owner = exam.examOwners.filter(function (own) {
                        return (own.id === ctrl.userId);
                    });
                    return owner.length > 0;
                };
            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

angular.module('app.dashboard.teacher')
    .service('TeacherDashboard', ['$q', 'Exam', 'Reservation', 'ExamRes',
        function ($q, Exam, Reservation, ExamRes) {

            var self = this;

            // Exam is private and has unfinished participants
            var participationsInFuture = function (exam) {
                return exam.executionType.type === 'PUBLIC' || exam.examEnrolments.length > 0;
            };

            var hasUpcomingExaminationDates = function (exam) {
                return exam.examinationDates.some(function (ed) {
                    return Date.now() <= new Date(ed.date).setHours(23, 59, 59, 999);
                });
            };

            // Printout exams do not have an activity period but have examination dates.
            // Produce a fake period for information purposes by selecting first and last examination dates.
            var createFakeActivityPeriod = function (exam) {
                var dates = exam.examinationDates.map(function (es) {
                    return es.date;
                });
                exam.examActiveStartDate = Math.min.apply(Math, dates);
                exam.examActiveEndDate = Math.max.apply(Math, dates);
            };

            self.populate = function (scope) {
                var deferred = $q.defer();

                Exam.listExecutionTypes().then(function (types) {
                    scope.executionTypes = types;
                    ExamRes.reviewerExams.query(function (reviewerExams) {
                        scope.draftExams = reviewerExams.filter(function (review) {
                            return (review.state === 'DRAFT' || review.state === 'SAVED') && Exam.isOwner(review);
                        });
                        scope.draftExams.forEach(function (de) {
                            de.ownerAggregate = de.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                        });

                        scope.activeExams = reviewerExams.filter(function (review) {
                            if (review.state !== 'PUBLISHED') return false;
                            var periodOk = review.executionType.type !== 'PRINTOUT' &&
                                Date.now() <= new Date(review.examActiveEndDate) &&
                                participationsInFuture(review);
                            var examinationDatesOk = review.executionType.type === 'PRINTOUT' &&
                                hasUpcomingExaminationDates(review);
                            return periodOk || examinationDatesOk;
                        });
                        scope.activeExams.forEach(function (ae) {
                            if (ae.executionType.type === 'PRINTOUT') {
                                createFakeActivityPeriod(ae);
                            }
                            ae.unassessedCount = Exam.getReviewablesCount(ae);
                            ae.unfinishedCount = Exam.getGradedCount(ae);
                            ae.reservationCount = Reservation.getReservationCount(ae);
                            ae.ownerAggregate = ae.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                        });

                        scope.finishedExams = [];
                        scope.archivedExams = [];
                        var endedExams = reviewerExams.filter(function (review) {
                            if (review.state !== 'PUBLISHED') return false;
                            var periodOk = review.executionType.type !== 'PRINTOUT' &&
                                (Date.now() > new Date(review.examActiveEndDate) || !participationsInFuture(review));
                            var examinationDatesOk = review.executionType.type === 'PRINTOUT' && !hasUpcomingExaminationDates(review);
                            return periodOk || examinationDatesOk;
                        });
                        endedExams.forEach(function (ee) {
                            ee.ownerAggregate = ee.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                            var unassessedCount = Exam.getReviewablesCount(ee);
                            var unfinishedCount = Exam.getGradedCount(ee);
                            if (unassessedCount + unfinishedCount > 0 && ee.executionType.type !== 'PRINTOUT') {
                                ee.unassessedCount = unassessedCount;
                                ee.unfinishedCount = unfinishedCount;
                                scope.finishedExams.push(ee);
                            } else {
                                if (ee.executionType.type === 'PRINTOUT') {
                                    createFakeActivityPeriod(ee);
                                }
                                ee.assessedCount = Exam.getProcessedCount(ee);
                                scope.archivedExams.push(ee);
                            }
                        });
                        return deferred.resolve(scope);
                    }, function (error) {
                        return deferred.reject(error);
                    });
                });
                return deferred.promise;
            };


        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('activeEnrolment', {
        templateUrl: '/assets/app/enrolment/active/activeEnrolment.template.html',
        bindings: {
            enrolment: '<',
            onRemoval: '&'
        },
        controller: ['$translate', 'dialogs', 'Enrolment', 'Reservation', 'toast',
            function ($translate, dialogs, Enrolment, Reservation, toast) {

                var vm = this;

                vm.removeReservation = function () {
                    Reservation.removeReservation(vm.enrolment);
                };

                vm.removeEnrolment = function () {
                    if (vm.enrolment.reservation) {
                        toast.error($translate.instant('sitnet_cancel_reservation_first'));
                    } else {
                        dialogs.confirm($translate.instant('sitnet_confirm'),
                            $translate.instant('sitnet_are_you_sure')).result.then(
                            function () {
                                Enrolment.removeEnrolment(vm.enrolment).then(function () {
                                        vm.onRemoval({data: vm.enrolment});
                                    }
                                );
                            });
                    }

                };

                vm.addEnrolmentInformation = function () {
                    Enrolment.addEnrolmentInformation(vm.enrolment);
                };

                vm.getRoomInstruction = function () {
                    var reservation = vm.enrolment.reservation;
                    var o;
                    if (reservation.externalReservation) {
                        o = reservation.externalReservation;
                    } else if (reservation.machine){
                        o = reservation.machine.room;
                    }
                    return o['roomInstruction' + $translate.use().toUpperCase()] || o.roomInstruction;
                };

                vm.showMaturityInstructions = function () {
                    Enrolment.showMaturityInstructions(vm.enrolment);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

(function () {
    'use strict';
    angular.module('app.enrolment')
        .factory("EnrollRes", ['$resource', function ($resource) {
            return {
                list: $resource("/app/enroll/:code",
                    {
                        code: "@code"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {code: "@code"}}
                    }),
                enrolment: $resource("/app/enroll/:id", {id: "@id"}, {"remove": {method: "DELETE"}}),
                enroll: $resource("/app/enroll/:code/exam/:id",
                    {
                        code: "@code", id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: false, params: {code: "@code", id: "@id"}},
                        "create": {method: "POST", params: {code: "@code", id: "@id"}}
                    }),
                enrollStudent: $resource("/app/enroll/student/:eid",
                    {
                        eid: "@eid"
                    },
                    {
                        "create": {method: "POST", params: {eid: "@eid"}}
                    }),
                unenrollStudent: $resource("/app/enroll/student/:id", {id: "@id"}, {"remove": {method: "DELETE"}}),
                reservations: $resource("/app/machines/:id/reservations",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true}
                    }),
                enrolmentsByReservation: $resource("/app/enroll/reservation/:id",
                    {
                        code: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {code: "@code"}}
                    }),
                check: $resource("/app/enroll/exam/:id",
                    {
                        code: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {id: "@id"}}
                    }
                )
            };
        }]);
}());
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

(function () {
    'use strict';
    angular.module('app.enrolment')
        .service('Enrolment', ['$translate', '$q', '$http', '$location', '$uibModal', 'dialogs', 'Language',
            'EnrollRes', 'SettingsResource', 'StudentExamRes', 'EXAM_CONF', 'toast',
            function ($translate, $q, $http, $location, $modal, dialogs, Language, EnrollRes, SettingsResource,
                      StudentExamRes, EXAM_CONF, toast) {

                var self = this;

                var setMaturityInstructions = function (exam) {
                    var deferred = $q.defer();
                    if (exam.examLanguages.length !== 1) {
                        console.warn('Exam has no exam languages or it has several!');
                    }
                    var lang = exam.examLanguages.length > 0 ? exam.examLanguages[0].code : 'fi';
                    SettingsResource.maturityInstructions.get({lang: lang}, function (data) {
                        exam.maturityInstructions = data.value;
                        return deferred.resolve(exam);
                    });
                    return deferred.promise;
                };

                self.enroll = function (exam) {
                    var deferred = $q.defer();
                    EnrollRes.enroll.create({code: exam.course.code, id: exam.id},
                        function () {
                            toast.success($translate.instant('sitnet_you_have_enrolled_to_exam') + '<br/>' +
                                $translate.instant('sitnet_remember_exam_machine_reservation'));
                            $location.path('/calendar/' + exam.id);
                            deferred.resolve();
                        },
                        function (error) {
                            toast.error(error.data);
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                self.checkAndEnroll = function (exam) {
                    EnrollRes.check.get({id: exam.id}, function () {
                            // already enrolled
                            toast.error($translate.instant('sitnet_already_enrolled'));
                        }, function (err) {
                            if (err.status === 403) {
                                toast.error(err.data);
                            }
                            if (err.status === 404) {
                                self.enroll(exam);
                            }
                        }
                    );
                };

                self.enrollStudent = function (exam, student) {
                    var deferred = $q.defer();
                    var data = {eid: exam.id};
                    if (student.id) {
                        data.uid = student.id;
                    } else {
                        data.email = student.email;
                    }
                    EnrollRes.enrollStudent.create(data,
                        function (enrolment) {
                            toast.success($translate.instant('sitnet_student_enrolled_to_exam'));
                            deferred.resolve(enrolment);
                        },
                        function (error) {
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                self.getExamEnrolment = function (code, id) {
                    var deferred = $q.defer();
                    EnrollRes.enroll.get({code: code, id: id},
                        function (exam) {
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return Language.getLanguageNativeName(lang.code);
                            });
                            setMaturityInstructions(exam).then(function (data) {
                                exam = data;
                                EnrollRes.check.get({id: exam.id}, function (enrolments) {
                                    exam.alreadyEnrolled = true;
                                    exam.reservationMade = enrolments.some(function (e) {
                                        return e.reservation;
                                    });
                                    deferred.resolve(exam);
                                }, function (err) {
                                    exam.alreadyEnrolled = err.status !== 404;
                                    if (err.status === 403) {
                                        exam.noTrialsLeft = true;
                                    }
                                    exam.reservationMade = false;
                                    deferred.resolve(exam);
                                });
                            });
                        },
                        function (error) {
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                self.listEnrolments = function (code, id) {
                    var deferred = $q.defer();
                    EnrollRes.list.get({code: code},
                        function (data) {
                            // remove duplicate exam, already shown at the detailed info section.
                            var exams = data.filter(function (e) {
                                return e.id !== parseInt(id);
                            });
                            exams.forEach(function (e) {
                                e.languages = e.examLanguages.map(function (lang) {
                                    return Language.getLanguageNativeName(lang.code);
                                });
                                return e;
                            });
                            checkEnrolments(exams).then(function (data) {
                                deferred.resolve(data);
                            });
                        },
                        function (error) {
                            toast.error(error.data);
                            deferred.reject();
                        });
                    return deferred.promise;
                };

                var check = function (exam) {
                    var deferred = $q.defer();
                    EnrollRes.check.get({id: exam.id}, function (enrolments) {
                            // check if student has reserved aquarium
                            enrolments.forEach(function (enrolment) {
                                if (enrolment.reservation) {
                                    exam.reservationMade = true;
                                }
                            });
                            // enrolled to exam
                            exam.enrolled = true;
                            deferred.resolve(exam);
                        }, function (err) {
                            // not enrolled or made reservations
                            exam.enrolled = false;
                            exam.reservationMade = false;
                            deferred.resolve(exam);
                        }
                    );
                    return deferred.promise;
                };

                var checkEnrolments = function (exams) {
                    var deferred = $q.defer();
                    var promises = [];
                    exams.forEach(function (exam) {
                        promises.push(check(exam).then(function (data) {
                            angular.extend(exam, data);
                        }));
                    });
                    $q.all(promises).then(function () {
                        deferred.resolve(exams);
                    });
                    return deferred.promise;
                };

                self.removeEnrolment = function (enrolment) {
                    return EnrollRes.enrolment.remove({id: enrolment.id}).$promise;
                };

                self.addEnrolmentInformation = function (enrolment) {
                    var modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        $scope.enrolment = angular.copy(enrolment);
                        $scope.ok = function () {
                            $modalInstance.close('Accepted');
                            enrolment.information = $scope.enrolment.information;
                            StudentExamRes.enrolment.update({
                                eid: enrolment.id,
                                information: $scope.enrolment.information
                            }, function () {
                                toast.success($translate.instant('sitnet_saved'));
                            });
                        };

                        $scope.cancel = function () {
                            $modalInstance.close('Canceled');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'enrolment/active/dialogs/add_enrolment_information.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            enrolment: function () {
                                return enrolment;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log('closed');
                    });
                };

                self.getRoomInstructions = function (hash) {
                    return $http.get('/app/enroll/room/' + hash);
                };


                self.showInstructions = function (enrolment) {
                    var modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        $scope.title = 'sitnet_instruction';
                        $scope.instructions = enrolment.exam.enrollInstruction;
                        $scope.ok = function () {
                            $modalInstance.close('Accepted');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/show_instructions.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            instructions: function () {
                                return enrolment.exam.enrollInstruction;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log('closed');
                    });
                };

                self.showMaturityInstructions = function (enrolment) {
                    var modalController = ['$scope', '$uibModalInstance', 'SettingsResource', function ($scope, $modalInstance, SettingsResource) {
                        if (enrolment.exam.examLanguages.length !== 1) {
                            console.warn('Exam has no exam languages or it has several!');
                        }
                        var lang = enrolment.exam.examLanguages && enrolment.exam.examLanguages.length > 0
                            ? enrolment.exam.examLanguages[0].code : 'fi';
                        $scope.title = 'sitnet_maturity_instructions';
                        SettingsResource.maturityInstructions.get({lang: lang}, function (data) {
                            $scope.instructions = data.value;
                        });
                        $scope.ok = function () {
                            $modalInstance.close('Accepted');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/show_instructions.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            instructions: function () {
                                return enrolment.exam.enrollInstruction;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log('closed');
                    });
                };


            }]);
}());
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('enrolmentCandidate', {
        templateUrl: '/assets/app/enrolment/exams/examEnrolmentCandidate.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$location', 'Enrolment',
            function ($location, Enrolment) {

                var vm = this;

                vm.enrollForExam = function () {
                    Enrolment.checkAndEnroll(vm.exam);
                };

                vm.makeReservation = function () {
                    $location.path('/calendar/' + vm.exam.id);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('enrolmentDetails', {
        templateUrl: '/assets/app/enrolment/exams/examEnrolmentDetails.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['Exam', 'Enrolment', 'DateTime',
            function (Exam, Enrolment, DateTime) {

                var vm = this;

                vm.enrollForExam = function () {
                    Enrolment.checkAndEnroll(vm.exam);
                };

                vm.translateExamType = function () {
                    return Exam.getExamTypeDisplayName(vm.exam.examType.type);
                };

                vm.translateGradeScale = function () {
                    return Exam.getScaleDisplayName(vm.exam.gradeScale || vm.exam.course.gradeScale);
                };

                vm.printExamDuration = function () {
                    return DateTime.printExamDuration(vm.exam);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('examEnrolments', {
        template:
        '<div id="dashboard">\n' +
        '    <div class="main-row" ng-show="$ctrl.exam.noTrialsLeft">\n' +
        '        <div class="col-md-12 alert-danger">\n' +
        '            <h4>{{\'sitnet_no_trials_left\' | translate}}</h4>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '    <enrolment-details ng-if="$ctrl.exam" exam="$ctrl.exam"></enrolment-details>\n' +
        '    <div ng-show="$ctrl.exams.length > 0" class="student-details-title-wrap subtitle">\n' +
        '        <div class="student-exam-details-title subtitle">{{\'sitnet_student_exams\' | translate}}</div>\n' +
        '    </div>\n' +
        '    <div class="exams-list">\n' +
        '        <enrolment-candidate ng-repeat="exam in $ctrl.exams" exam="exam"></enrolment-candidate>\n' +
        '    </div>\n' +
        '</div>\n',
        controller: ['$routeParams', 'Enrolment', 'toast',
            function ($routeParams, Enrolment, toast) {

                var vm = this;

                vm.$onInit = function () {
                    Enrolment.getExamEnrolment($routeParams.code, $routeParams.id).then(function (data) {
                        vm.exam = data;
                    }, function (err) {
                        toast.error(err.data);
                    });
                    Enrolment.listEnrolments($routeParams.code, $routeParams.id).then(function (data) {
                        vm.exams = data;
                    });
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('examFeedback', {
        templateUrl: '/assets/app/enrolment/finished/examFeedback.template.html',
        bindings: {
            assessment: '<',
            scores: '<'
        },
        controller: ['Attachment',
            function (Attachment) {

                var vm = this;

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.assessment);
                };

                vm.downloadStatementAttachment = function () {
                    Attachment.downloadStatementAttachment(vm.assessment);
                }

            }

        ]
    });




;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('examParticipation', {
        templateUrl: '/assets/app/enrolment/finished/examParticipation.template.html',
        bindings: {
            participation: '<'
        },
        controller: ['$scope', '$translate', 'StudentExamRes', 'Exam',
            function ($scope, $translate, StudentExamRes, Exam) {

                var vm = this;

                vm.$onInit = function () {
                    var state = vm.participation.exam.state;
                    if (state === 'GRADED_LOGGED' || state === 'REJECTED' || state === 'ARCHIVED'
                        || (state === 'GRADED' && vm.participation.exam.autoEvaluationNotified)) {
                        loadReview();
                    }
                };

                var loadReview = function () {
                    StudentExamRes.feedback.get({eid: vm.participation.exam.id},
                        function (exam) {
                            if (!exam.grade) {
                                exam.grade = {name: 'NONE'};
                            }
                            if (exam.languageInspection) {
                                exam.grade.displayName = $translate.instant(
                                    exam.languageInspection.approved ? 'sitnet_approved' : 'sitnet_rejected');
                                exam.contentGrade = Exam.getExamGradeDisplayName(exam.grade.name);
                                exam.gradedTime = exam.languageInspection.finishedAt;
                            } else {
                                exam.grade.displayName = Exam.getExamGradeDisplayName(exam.grade.name);
                            }
                            Exam.setCredit(exam);
                            if (exam.creditType) {
                                exam.creditType.displayName = Exam.getExamTypeDisplayName(exam.creditType.type);
                            }
                            vm.participation.reviewedExam = exam;
                            StudentExamRes.scores.get({eid: vm.participation.exam.id},
                                function (data) {
                                    vm.participation.scores = {
                                        maxScore: data.maxScore,
                                        totalScore: data.totalScore,
                                        approvedAnswerCount: data.approvedAnswerCount,
                                        rejectedAnswerCount: data.rejectedAnswerCount,
                                        hasApprovedRejectedAnswers: data.approvedAnswerCount + data.rejectedAnswerCount > 0
                                    };
                                });
                        }
                    );
                };

                $scope.$on('$localeChangeSuccess', function () {
                    if (vm.participation.reviewedExam) {
                        vm.participation.reviewedExam.grade.displayName =
                            Exam.getExamGradeDisplayName(vm.participation.reviewedExam.grade.name);
                    }
                });

            }
        ]
    });




;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('examParticipations', {
        templateUrl: '/assets/app/enrolment/finished/examParticipations.template.html',
        controller: ['$scope', '$translate', 'StudentExamRes', 'toast',
            function ($scope, $translate, StudentExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.filter = {ordering: '-ended', text: null};
                    vm.pageSize = 10;
                    vm.search();
                };

                vm.search = function () {
                    StudentExamRes.finishedExams.query({filter: vm.filter.text},
                        function (data) {
                            data.filter(function (t) {
                                return !t.ended;
                            }).forEach(function (t) {
                                // no-shows, end time to reflect reservations end time
                                t.ended = t.reservation.endAt;
                            });
                            vm.participations = data;
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

            }
        ]
    });




;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('examSearch', {
        templateUrl: '/assets/app/enrolment/search/examSearch.template.html',
        controller: ['StudentExamRes', 'EnrollRes', 'SettingsResource', 'Language', 'toast',
            function (StudentExamRes, EnrollRes, SettingsResource, Language, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.filter = {};
                    vm.loader = {loading: false};
                    SettingsResource.enrolmentPermissions.get(function (setting) {
                        vm.permissionCheck = setting;
                        if (setting.active === true) {
                            vm.loader.loading = true;
                            search();
                        }
                    });
                };

                vm.search = function () {
                    if (vm.permissionCheck.active === false) {
                        if (vm.filter.text) {
                            vm.loader.loading = true;
                            search();
                        } else {
                            delete vm.exams;
                        }
                    }
                };

                var search = function () {
                    StudentExamRes.exams.query({filter: vm.filter.text}, function (exams) {
                        exams.forEach(function (exam) {
                            if (!exam.examLanguages) {
                                console.warn('No languages for exam #' + exam.id);
                                exam.examLanguages = [];
                            }
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return Language.getLanguageNativeName(lang.code);
                            });

                        });

                        vm.exams = exams;
                        checkEnrolment();
                        vm.loader.loading = false;
                    }, function (err) {
                        vm.loader.loading = false;
                        toast.error(err.data);
                    });

                };

                var checkEnrolment = function () {
                    vm.exams.forEach(function (exam) {
                        EnrollRes.check.get({id: exam.id}, function (enrolments) {
                                // check if student has reserved aquarium
                                enrolments.forEach(function (enrolment) {
                                    if (enrolment.reservation) {
                                        exam.reservationMade = true;
                                    }
                                });

                                // enrolled to exam
                                exam.enrolled = true;
                            }, function (err) {
                                // not enrolled or made reservations
                                exam.enrolled = false;
                                exam.reservationMade = false;
                            }
                        );

                    });

                };


            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('examSearchResult', {
        templateUrl: '/assets/app/enrolment/search/examSearchResult.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$location', 'Enrolment',
            function ($location, Enrolment) {

                var vm = this;

                vm.enrollForExam = function () {
                    Enrolment.checkAndEnroll(vm.exam);
                };

                vm.makeReservation = function () {
                    $location.path('/calendar/' + vm.exam.id);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('waitingRoom', {
        templateUrl: '/assets/app/enrolment/waiting-room/waitingRoom.template.html',
        controller: ['$http', '$routeParams', '$timeout', '$translate', '$location', 'StudentExamRes', 'toast',
            function ($http, $routeParams, $timeout, $translate, $location, StudentExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    if ($routeParams.id) {
                        vm.upcoming = true;
                        StudentExamRes.enrolment.get({eid: $routeParams.id},
                            function (enrolment) {
                                setOccasion(enrolment.reservation);
                                vm.enrolment = enrolment;
                                var offset = calculateOffset();
                                vm.timeout = $timeout(function () {
                                    $location.path('/student/exam/' + vm.enrolment.exam.hash);
                                }, offset);

                                var room = vm.enrolment.reservation.machine.room;
                                var code = $translate.use().toUpperCase();
                                vm.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    }
                };

                vm.$onDestroy = function () {
                    if (vm.timeout) {
                        $timeout.cancel(vm.timeout);
                    }
                };

                var calculateOffset = function () {
                    var startsAt = moment(vm.enrolment.reservation.startAt);
                    var now = moment();
                    if (now.isDST()) {
                        startsAt.add(-1, 'hour');
                    }
                    return Date.parse(startsAt.format()) - new Date().getTime();
                };

                var setOccasion = function (reservation) {
                    var tz = reservation.machine.room.localTimezone;
                    var start = moment.tz(reservation.startAt, tz);
                    var end = moment.tz(reservation.endAt, tz);
                    if (start.isDST()) {
                        start.add(-1, 'hour');
                    }
                    if (end.isDST()) {
                        end.add(-1, 'hour');
                    }
                    reservation.occasion = {
                        startAt: start.format('HH:mm'),
                        endAt: end.format('HH:mm')
                    };
                };

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .component('wrongLocation', {
        templateUrl: '/assets/app/enrolment/wrong-location/wrongLocation.template.html',
        bindings: {
            cause: '@'
        },
        controller: ['$http', '$routeParams', '$translate', 'Enrolment', 'StudentExamRes', 'DateTime', 'toast',
            function ($http, $routeParams, $translate, Enrolment, StudentExamRes, DateTime, toast) {

                var vm = this;

                vm.$onInit = function () {
                    if ($routeParams.eid) {
                        vm.upcoming = true;
                        StudentExamRes.enrolment.get({eid: $routeParams.eid},
                            function (enrolment) {
                                setOccasion(enrolment.reservation);
                                vm.enrolment = enrolment;
                                var room = vm.enrolment.reservation.machine.room;
                                var code = $translate.use().toUpperCase();
                                vm.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
                                $http.get('/app/machines/' + $routeParams.mid).success(function (machine) {
                                    vm.currentMachine = machine;
                                });
                                vm.printExamDuration = function () {
                                    return DateTime.printExamDuration(vm.enrolment.exam);
                                };
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    }
                };


                var setOccasion = function (reservation) {
                    var tz = reservation.machine.room.localTimezone;
                    var start = moment.tz(reservation.startAt, tz);
                    var end = moment.tz(reservation.endAt, tz);
                    if (start.isDST()) {
                        start.add(-1, 'hour');
                    }
                    if (end.isDST()) {
                        end.add(-1, 'hour');
                    }
                    reservation.occasion = {
                        startAt: start.format('HH:mm'),
                        endAt: end.format('HH:mm')
                    };
                };

                vm.showInstructions = function() {
                    Enrolment.showInstructions(vm.enrolment);
                };



            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.enrolment')
    .service('WrongLocation', ['$timeout', '$translate', 'toast', function ($timeout, $translate, toast) {

        var self = this;

        self.display = function (data) {

            var opts = {
                timeOut: 10000
            };
            var startsAt = moment(data[4]);
            var now = moment();
            if (now.isDST()) {
                startsAt.add(-1, 'hour');
            }
            var parts;
            if (startsAt.isAfter(now)) {
                parts = ['sitnet_your_exam_will_start_at', 'sitnet_at_location', 'sitnet_at_room', 'sitnet_at_machine'];
                $translate(parts).then(function (t) {
                    toast.warning(t.sitnet_your_exam_will_start_at + ' ' + startsAt.format('HH:mm') + ' ' +
                        t.sitnet_at_location + ': ' + data[0] + ', ' + data[1] + ' ' +
                        t.sitnet_at_room + ' ' + data[2] + ' ' +
                        t.sitnet_at_machine + ' ' + data[3], opts);
                });
            } else {
                parts = ['sitnet_you_have_ongoing_exam_at_location', 'sitnet_at_room', 'sitnet_at_machine'];
                $translate(parts).then(function (t) {
                    toast.error(t.sitnet_you_have_ongoing_exam_at_location + ': ' + data[0] + ', ' + data[1] + ' ' +
                        t.sitnet_at_room + ' ' + data[2] + ' ' +
                        t.sitnet_at_machine + ' ' + data[3], opts);
                });
            }
        };

    }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('basicExamInfo', {
        templateUrl: '/assets/app/exam/editor/basic/basicExamInfo.template.html',
        bindings: {
            exam: '<',
            onUpdate: '&',
            onNextTabSelected: '&'
        },
        controller: ['$location', '$scope', '$translate', '$uibModal', 'dialogs', 'Exam', 'ExamRes', 'SettingsResource', 'Attachment', 'Files', 'toast',
            function ($location, $scope, $translate, $modal, dialogs, Exam, ExamRes, SettingsResource, Attachment, Files, toast) {

                var vm = this;

                vm.$onInit = function () {
                    refreshExamTypes();
                    refreshGradeScales();
                    SettingsResource.gradeScale.get(function (data) {
                        vm.gradeScaleSetting = data;
                    });
                    initGradeScale();
                };

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                    refreshGradeScales();
                });

                vm.updateExam = function (resetAutoEvaluationConfig) {
                    Exam.updateExam(vm.exam).then(function () {
                        toast.info($translate.instant('sitnet_exam_saved'));
                        if (resetAutoEvaluationConfig) {
                            delete vm.exam.autoEvaluationConfig;
                        }
                        vm.onUpdate({props: {name: vm.exam.name, code: vm.exam.course.code}});
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                    });
                };

                vm.onCourseChange = function (course) {
                    vm.exam.course = course;
                    initGradeScale(); //  Grade scale might need changing based on new course
                    vm.onUpdate({props: {name: vm.exam.name, code: vm.exam.course.code}});
                };

                vm.getExecutionTypeTranslation = function () {
                    return !vm.exam || Exam.getExecutionTypeTranslation(vm.exam.executionType.type);
                };

                vm.checkExamType = function (type) {
                    return vm.exam.examType.type === type ? 'btn-primary' : '';
                };

                vm.setExamType = function (type) {
                    vm.exam.examType.type = type;
                    vm.updateExam();
                };

                vm.getSelectableScales = function () {
                    if (!vm.gradeScales || !vm.exam || !vm.exam.course || angular.isUndefined(vm.gradeScaleSetting)) {
                        return [];
                    }
                    return vm.gradeScales.filter(function (scale) {
                        return vm.gradeScaleSetting.overridable || !vm.exam.course.gradeScale ||
                            vm.exam.course.gradeScale.id === scale.id;
                    });
                };

                vm.checkScale = function (scale) {
                    if (!vm.exam.gradeScale) {
                        return '';
                    }
                    return vm.exam.gradeScale.id === scale.id ? 'btn-primary' : '';
                };

                vm.checkScaleDisabled = function (scale) {
                    if (!scale || !vm.exam.course || !vm.exam.course.gradeScale) {
                        return false;
                    }
                    return !vm.gradeScaleSetting.overridable && vm.exam.course.gradeScale.id === scale.id;
                };

                vm.setScale = function (grading) {
                    vm.exam.gradeScale = grading;
                    vm.updateExam(true);
                };

                vm.selectAttachmentFile = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {
                            isTeacherModal: function () {
                                return true;
                            }
                        }
                    }).result.then(function (data) {
                        Files.upload('/app/attachment/exam',
                            data.attachmentFile, {examId: vm.exam.id}, vm.exam);
                    });
                };

                vm.downloadExamAttachment = function () {
                    Attachment.downloadExamAttachment(vm.exam);
                };

                vm.removeExamAttachment = function () {
                    Attachment.removeExamAttachment(vm.exam);
                };

                vm.removeExam = function (canRemoveWithoutConfirmation) {
                    if (isAllowedToUnpublishOrRemove()) {
                        var fn = function () {
                            ExamRes.exams.remove({id: vm.exam.id}, function () {
                                toast.success($translate.instant('sitnet_exam_removed'));
                                $location.path('/');
                            }, function (error) {
                                toast.error(error.data);
                            });
                        };
                        if (canRemoveWithoutConfirmation) {
                            fn();
                        } else {
                            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                            dialog.result.then(function () {
                                fn();
                            });
                        }
                    } else {
                        toast.warning($translate.instant('sitnet_exam_removal_not_possible'));
                    }
                };

                vm.nextTab = function () {
                    vm.onNextTabSelected();
                };

                var isAllowedToUnpublishOrRemove = function () {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !vm.exam.hasEnrolmentsInEffect && vm.exam.children.length === 0;
                };

                var refreshExamTypes = function () {
                    Exam.refreshExamTypes().then(function (types) {
                        // Maturity can only have a FINAL type
                        if (vm.exam.executionType.type === 'MATURITY') {
                            types = types.filter(function (t) {
                                return t.type === 'FINAL';
                            });
                        }
                        vm.examTypes = types;
                    });
                };

                var refreshGradeScales = function () {
                    Exam.refreshGradeScales().then(function (scales) {
                        vm.gradeScales = scales;
                    });
                };

                var initGradeScale = function () {
                    // Set exam grade scale from course default if not specifically set for exam
                    if (!vm.exam.gradeScale && vm.exam.course && vm.exam.course.gradeScale) {
                        vm.exam.gradeScale = vm.exam.course.gradeScale;
                    }
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('examCourse', {
        templateUrl: '/assets/app/exam/editor/basic/examCourse.template.html',
        bindings: {
            exam: '<',
            onUpdate: '&'
        },
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.displayGradeScale = function () {
                    return !vm.exam.course || !vm.exam.course.gradeScale ? null :
                        Exam.getScaleDisplayName(vm.exam.course.gradeScale);
                };

                vm.setCourse = function (course) {
                    angular.extend(vm.exam.course, course);
                    vm.onUpdate({course: course});
                }
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('examInspectorSelector', {
        templateUrl: '/assets/app/exam/editor/basic/examInspectorSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'limitToFilter', 'ExamRes', 'UserRes', 'toast',
            function ($translate, limitToFilter, ExamRes, UserRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newInspector = {
                        id: null,
                        name: null,
                        sendMessage: false,
                        comment: ''
                    };
                    getInspectors();
                };

                vm.allInspectors = function (filter, criteria) {

                    return UserRes.filterUsersByExam.query({
                        role: 'TEACHER',
                        eid: vm.exam.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

                vm.setInspector = function ($item, $model, $label) {
                    vm.newInspector.id = $item.id;
                };

                vm.addInspector = function () {
                    if (vm.newInspector.id > 0) {
                        ExamRes.inspection.insert({
                            eid: vm.exam.id,
                            uid: vm.newInspector.id,
                            comment: vm.newInspector.comment || ''
                        }, function () {
                            // reload the list
                            getInspectors();
                            // clear input field
                            delete vm.newInspector;

                        }, function (error) {
                            toast.error(error.data);
                        });
                    } else {
                        toast.error($translate.instant('sitnet_teacher_not_found'));
                    }
                };

                vm.removeInspector = function (id) {
                    ExamRes.inspector.remove({id: id},
                        function () {
                            getInspectors();
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

                function getInspectors() {
                    ExamRes.inspections.get({id: vm.exam.id},
                        function (inspections) {
                            vm.examInspections = inspections;
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                }


            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('examOwnerSelector', {
        templateUrl: '/assets/app/exam/editor/basic/examOwnerSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'limitToFilter', 'ExamRes', 'UserRes', 'toast',
            function ($translate, limitToFilter, ExamRes, UserRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newOwner = {
                        "id": null,
                        "name": null
                    };
                    vm.examOwners = getExamOwners();
                };

                vm.allExamOwners = function (filter, criteria) {

                    return UserRes.filterOwnersByExam.query({
                        role: 'TEACHER',
                        eid: vm.exam.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.setExamOwner = function ($item, $model, $label) {
                    vm.newOwner.id = $item.id;
                };

                vm.addExamOwner = function () {
                    if (vm.newOwner.id > 0) {
                        ExamRes.examowner.insert({
                            eid: vm.exam.id,
                            uid: vm.newOwner.id
                        }, function () {
                            getExamOwners();
                            // clear input field
                            delete vm.newOwner.name;
                            delete vm.newOwner.id;
                        }, function (error) {
                            toast.error(error.data);
                        });
                    } else {
                        toast.error($translate.instant('sitnet_teacher_not_found'));
                    }
                };

                vm.removeOwner = function (id) {
                    ExamRes.examowner.remove({eid: vm.exam.id, uid: id},
                        function () {
                            getExamOwners();
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

                function getExamOwners() {
                    ExamRes.owners.query({id: vm.exam.id},
                        function (examOwners) {
                            vm.examOwners = examOwners;
                        },
                        function (error) {
                            toast.error(error.data);
                        });

                }


            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('softwareSelector', {
        templateUrl: '/assets/app/exam/editor/basic/softwareSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'SoftwareRes', 'ExamRes', 'toast',
            function ($translate, SoftwareRes, ExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.software = SoftwareRes.softwares.query();
                };

                vm.selectedSoftware = function () {
                    return vm.exam.softwares.length === 0 ? $translate.instant('sitnet_select') :
                        vm.exam.softwares.map(function (software) {
                            return software.name;
                        }).join(", ");
                };

                vm.isSelected = function (sw) {
                    return vm.exam.softwares.map(function (es) {
                            return es.id;
                        }).indexOf(sw.id) > -1;
                };

                vm.updateExamSoftware = function (sw) {
                    ExamRes.software.update({eid: vm.exam.id, sid: sw.id}, function (){
                        if (vm.isSelected(sw)) {
                            var index = vm.exam.softwares.map(function (es) {
                                return es.id;
                            }).indexOf(sw.id);
                            vm.exam.softwares.splice(index, 1);
                        } else {
                            vm.exam.softwares.push(sw);
                        }
                        toast.info($translate.instant('sitnet_exam_software_updated'));
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('coursePicker', {
        templateUrl: '/assets/app/exam/editor/common/coursePicker.template.html',
        bindings: {
            exam: '<',
            onUpdate: '&'
        },
        controller: ['$http', '$translate', 'Course', 'ExamRes', 'toast',
            function ($http, $translate, Course, ExamRes, toast) {

                var vm = this;

                vm.getCourses = function (filter, criteria) {
                    toggleLoadingIcon(filter, true);
                    var tmp = criteria;
                    if (vm.exam && vm.exam.course && vm.exam.course.id) {
                        var course = vm.exam.course;
                        vm.exam.course = undefined;
                        setInputValue(filter, tmp);

                        ExamRes.course.delete({eid: vm.exam.id, cid: course.id}, function (updated_exam) {
                            vm.exam = updated_exam;
                            setInputValue(filter, tmp);
                        });
                    }
                    return Course.courseApi.query({filter: filter, q: criteria}).$promise.then(
                        function (courses) {
                            toggleLoadingIcon(filter, false);

                            if (!courses || !courses.hasOwnProperty('length') || courses.length === 0) {
                                toast.error($translate.instant('sitnet_course_not_found') + ' ( ' + tmp + ' )');
                            }
                            return courses;
                        },
                        function () {
                            toggleLoadingIcon(filter, false);
                            vm.exam.course = undefined;
                            toast.error($translate.instant('sitnet_course_not_found') + ' ( ' + tmp + ' )');
                            return [];
                        }
                    );
                };

                vm.onCourseSelect = function ($item, $model, $label, exam) {
                    ExamRes.course.update({eid: exam.id, cid: $item.id}, function (course) {
                        toast.success($translate.instant('sitnet_exam_associated_with_course'));
                        vm.exam.course = course;
                        vm.onUpdate({course: course});
                    }, function () {
                        toast.error($translate.instant('sitnet_course_not_found'));
                    });
                    vm.exam.course = $item;
                };

                function toggleLoadingIcon(filter, isOn) {
                    if (filter && filter === 'code') {
                        vm.loadingCoursesByCode = isOn;
                    } else if (filter && filter === 'name') {
                        vm.loadingCoursesByName = isOn;
                    }
                }

                function setInputValue(filter, tmp) {
                    if (filter && filter === 'code') {
                        vm.exam.course = {code: tmp};
                    } else if (filter && filter === 'name') {
                        vm.exam.course = {name: tmp};
                    }
                }

            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam')
    .service('Course', ['$resource',
        function ($resource) {

            var self = this;

            self.courseApi = $resource('/app/courses');


        }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('languageSelector', {
        templateUrl: '/assets/app/exam/editor/common/languageSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$q', '$translate', 'Language', 'ExamRes', 'toast',
            function ($q, $translate, Language, ExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    Language.languageApi.query(function (languages) {
                        vm.examLanguages = languages.map(function (language) {
                            language.name = Language.getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                vm.selectedLanguages = function () {
                    return vm.exam.examLanguages.length === 0 ? $translate.instant('sitnet_select') :
                        vm.exam.examLanguages.map(function (language) {
                            return Language.getLanguageNativeName(language.code);
                        }).join(", ");
                };

                vm.isSelected = function (lang) {
                    return vm.exam.examLanguages.map(function (el) {
                            return el.code;
                        }).indexOf(lang.code) > -1;
                };

                vm.updateExamLanguage = function (lang) {
                    ExamRes.language.update({eid: vm.exam.id, code: lang.code}, function (){
                        if (vm.isSelected(lang)) {
                            var index = vm.exam.examLanguages.map(function (el) {
                                return el.code;
                            }).indexOf(lang.code);
                            vm.exam.examLanguages.splice(index, 1);
                        } else {
                            vm.exam.examLanguages.push(lang);
                        }
                        toast.info($translate.instant('sitnet_exam_language_updated'));
                    }, function (error) {
                        toast.error(error.data);
                    });
                }

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('courseSelection', {
        templateUrl: '/assets/app/exam/editor/creation/courseSelection.template.html',
        controller: ['$translate', '$q', '$location', '$routeParams', 'ExamRes', 'Exam', 'toast',
            function ($translate, $q, $location, $routeParams, ExamRes, Exam, toast) {

                var vm = this;

                vm.$onInit = function () {
                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.exam = exam;
                    });
                };

                vm.getExecutionTypeTranslation = function () {
                    return !vm.exam || Exam.getExecutionTypeTranslation(vm.exam.executionType.type);
                };

                vm.updateExamName = function () {
                    Exam.updateExam(vm.exam).then(function () {
                        toast.info($translate.instant("sitnet_exam_saved"));
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                    });
                };

                vm.cancelNewExam = function () {
                    ExamRes.exams.remove({id: vm.exam.id}, function () {
                        toast.success($translate.instant('sitnet_exam_removed'));
                        $location.path('/');
                    });
                };

                vm.continueToExam = function () {
                    $location.path("/exams/" + vm.exam.id + "/1");
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('newExam', {
        templateUrl: '/assets/app/exam/editor/creation/newExam.template.html',
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.$onInit = function  () {
                    Exam.listExecutionTypes().then(function (types) {
                        vm.executionTypes = types;
                    });
                };

                vm.createExam = function () {
                    if (vm.type) {
                        Exam.createExam(vm.type.type);
                    }
                }
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

(function () { /* TBD: refactor away */
    'use strict';
    angular.module('app.exam')
        .factory("ExamRes", ['$resource', function ($resource) {
            return {
                exams: $resource("/app/exams/:id",
                    {
                        id: "@id"
                    },
                    {
                        "copy": {method: "POST"},
                        "update": {method: "PUT"},
                        "remove": {method: "DELETE"}
                    }),
                examsearch: $resource("/app/examsearch"),
                examowner: $resource("/app/exam/:eid/owner/:uid",
                    {
                        eid: "@eid", uid: "@uid"
                    },
                    {
                        "insert": {method: "PUT"},
                        "remove": {method: "DELETE"}
                    }),

                questions: $resource("/app/exams/:eid/section/:sid/question/:qid",
                    {
                        eid: "@eid", sid: "@sid", qid: "@qid"
                    },
                    {
                        "remove": {method: "DELETE", params: {eid: "@eid", sid: "@sid", qid: "@qid"}}
                    }),
                sections: $resource("/app/exams/:eid/section/:sid",
                    {
                        eid: "@eid", sid: "@sid"
                    },
                    {
                        "insert": {method: "POST", params: {eid: "@eid", sid: "@sid"}},
                        "remove": {method: "DELETE", params: {eid: "@eid", sid: "@sid"}},
                        "update": {method: "PUT", params: {eid: "@eid", sid: "@sid"}}

                    }),
                questionDistribution: $resource("/app/exams/question/:id/distribution", {id: "@id"}),
                sectionquestions: $resource("/app/exams/:eid/section/:sid/:seq/question/:qid",
                    {
                        eid: "@eid", sid: "@sid", seq: "@seq", qid: "@qid"
                    },
                    {
                        "insert": {method: "POST", params: {eid: "@eid", sid: "@sid", seq: "@seq", qid: "@qid"}}

                    }),
                sectionquestionsmultiple: $resource("/app/exams/:eid/section/:sid/:seq/questions",
                    {
                        eid: "@eid", sid: "@sid", seq: "@seq", questions: "@questions"
                    },
                    {
                        "insert": {
                            method: "POST",
                            params: {eid: "@eid", sid: "@sid", seq: "@seq", questions: "@questions"}
                        }

                    }),
                questionOrder: $resource("/app/exams/:eid/section/:sid/reorder",
                    {
                        eid: "@eid", sid: "@sid"
                    },
                    {
                        "update": {method: "PUT", params: {eid: "@eid", sid: "@sid"}}
                    }),
                sectionOrder: $resource("/app/exams/:eid/reorder",
                    {
                        eid: "@eid"
                    },
                    {
                        "update": {method: "PUT", params: {eid: "@eid"}}
                    }),

                clearsection: $resource("/app/exams/:eid/section/:sid/clear",
                    {
                        eid: "@eid", sid: "@sid"
                    },
                    {
                        "clear": {method: "DELETE", params: {eid: "@eid", sid: "@sid"}}
                    }),

                course: $resource("/app/exams/:eid/course/:cid",
                    {
                        eid: "@eid", sid: "@cid"
                    },
                    {
                        "update": {method: "PUT", params: {eid: "@eid", cid: "@cid"}},
                        "delete": {method: "DELETE", params: {eid: "@eid", cid: "@cid"}}
                    }),
                reviewerExams: $resource("/app/reviewerexams"),
                reviewerExam: $resource("/app/review/:eid", {eid: "@eid"}),
                draft: $resource("/app/exams", null, {"create": {method: "POST"}}),
                review: $resource("/app/review/:id", {id: "@id"}, {"update": {method: "PUT"}}),
                inspectionComment: $resource("/app/review/:id/inspection", {id: "@id"}, {"create": {method: "POST"}}),
                examReviews: $resource("/app/reviews/:eid", {eid: "@eid"},
                    {
                        "get": {method: "GET", params: {eid: "@eid"}}
                    }),
                noShows: $resource("/app/noshows/:eid", {eid: "@eid"}),
                archive: $resource("/app/reviews/archive", {}, {"update": {method: "PUT"}}),
                comment: $resource("/app/review/:eid/comment/:cid",
                    {
                        id: "@eid", cid: "@cid"
                    },
                    {
                        "insert": {method: "POST", params: {eid: "@eid"}},
                        "update": {method: "PUT", params: {eid: "@eid", sid: "@cid"}}
                    }),
                inspections: $resource("/app/exam/:id/inspections",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {id: "@id"}}
                    }),

                owners: $resource("/app/exam/:id/owners",
                    {
                        id: "@id"
                    }),
                inspection: $resource("/app/exams/:eid/inspector/:uid",
                    {
                        eid: "@eid", uid: "@uid"
                    },
                    {
                        "insert": {method: "POST", params: {eid: "@eid", uid: "@uid"}}
                    }),

                inspectionReady: $resource("/app/exams/inspection/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT", params: {id: "@id"}}
                    }),

                inspector: $resource("/app/exams/inspector/:id",
                    {
                        id: "@id"
                    },
                    {
                        "remove": {method: "DELETE", params: {id: "@id"}}
                    }),

                examEnrolments: $resource("/app/examenrolments/:eid",
                    {
                        eid: "@eid"
                    },
                    {
                        "get": {method: "GET", params: {eid: "@eid"}}
                    }),

                examParticipations: $resource("/app/examparticipations/:eid",
                    {
                        eid: "@eid"
                    },
                    {
                        "get": {method: "GET", params: {eid: "@eid"}}
                    }),
                examParticipationsOfUser: $resource("/app/examparticipations/:eid/:uid",
                    {
                        eid: "@eid",
                        uid: "@uid"
                    },
                    {
                        "get": {method: "GET", params: {eid: "@eid", uid: "@uid"}}
                    }),
                studentInfo: $resource("/app/review/info/:id",
                    {
                        id: "@id"
                    }),
                email: $resource("/app/email/inspection/:eid",
                    {
                        eid: "@eid"
                    },
                    {
                        inspection: {method: "POST", params: {eid: "@eid"}}
                    }),

                saveRecord: $resource("/app/exam/record", null,
                    {
                        "add": {method: "POST"}
                    }),
                register: $resource("/app/exam/register", null,
                    {
                        "add": {method: "POST"}
                    }),
                record: $resource("/app/exam/record/export/:id",
                    {
                        id: "@id"
                    },
                    {
                        "export": {method: "GET", params: {id: "@id"}}
                    }),
                language: $resource("/app/exam/:eid/language/:code",
                    {
                        eid: "@eid",
                        code: "@code"
                    },
                    {
                        "update": {method: "PUT"}
                    }),
                languages: $resource("/app/exam/:eid/languages",
                    {
                        eid: "@eid"
                    },
                    {
                        "reset": {method: "DELETE"}
                    }),
                examTypes: $resource("/app/examtypes"),
                executionTypes: $resource("/app/executiontypes"),
                gradeScales: $resource("/app/gradescales"),
                software: $resource("/app/exam/:eid/software/:sid",
                    {
                        eid: "@eid",
                        sid: "@sid"
                    },
                    {
                        "update": {method: "PUT"}
                    }),
                reservation: $resource("/app/reservations/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"}
                    }),
                reservationInfo: $resource("/app/exams/:eid/reservation", {eid: "@eid"}),
                examinationDate: $resource("/app/exam/:eid/examinationdate/:edid", {eid: "@eid", edid: "@edid"},
                    {
                        "create": {method: "POST", params: {eid: "@eid"}},
                        "delete": {method: "DELETE"}
                    })
            };
        }]);
}());
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('examTabs', {
        templateUrl: '/assets/app/exam/editor/examTabs.template.html',
        controller: ['$routeParams', '$translate', 'ExamRes', 'Session', '$window',
            function ($routeParams, $translate, ExamRes, Session, $window) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.examInfo = {};
                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.exam = exam;
                        vm.updateTitle(!exam.course ? undefined : exam.course.code, exam.name);
                    });
                    vm.activeTab = parseInt($routeParams.tab);
                };

                vm.reload = function () {
                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.exam = exam;
                    });
                };

                vm.updateTitle = function (code, name) {
                    if (code && name) {
                        vm.examInfo.title = code + ' ' + name;
                    }
                    else if (code) {
                        vm.examInfo.title = code + ' ' + $translate.instant('sitnet_no_name');
                    }
                    else {
                        vm.examInfo.title = name;
                    }
                };

                vm.isOwner = function () {
                    return vm.exam.examOwners.some(function (eo) {
                        return eo.id === vm.user.id;
                    });
                };

                vm.switchToBasicInfo = function () {
                    vm.activeTab = 1;
                };

                vm.switchToQuestions = function () {
                    vm.activeTab = 2;
                };

                vm.switchToPublishSettings = function () {
                    vm.activeTab = 3;
                };

                vm.titleUpdated = function (props) {
                    vm.updateTitle(props.code, props.name);
                };

                vm.goBack = function (event) {
                    event.preventDefault();
                    $window.history.back();
                }

            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('autoEvaluation', {
        templateUrl: '/assets/app/exam/editor/publication/autoEvaluation.template.html',
        bindings: {
            exam: '<',
            onEnabled: '&',
            onDisabled: '&',
            onUpdate: '&'
        },
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.$onInit = function () {
                    vm.autoevaluation = {
                        releaseTypes: [
                            {
                                name: 'IMMEDIATE',
                                translation: 'sitnet_autoevaluation_release_type_immediate',
                                filtered: true
                            },
                            {name: 'GIVEN_DATE', translation: 'sitnet_autoevaluation_release_type_given_date'},
                            {name: 'GIVEN_AMOUNT_DAYS', translation: 'sitnet_autoevaluation_release_type_given_days'},
                            {name: 'AFTER_EXAM_PERIOD', translation: 'sitnet_autoevaluation_release_type_period'},
                            {name: 'NEVER', translation: 'sitnet_autoevaluation_release_type_never'}
                        ]
                    };
                    vm.autoevaluationDisplay = {visible: false};
                    prepareAutoEvaluationConfig();
                };

                var getReleaseTypeByName = function (name) {
                    var matches = vm.autoevaluation.releaseTypes.filter(function (rt) {
                        return rt.name === name;
                    });
                    return matches.length > 0 ? matches[0] : null;
                };


                var prepareAutoEvaluationConfig = function () {
                    vm.autoevaluation.enabled = !!vm.exam.autoEvaluationConfig;
                    if (!vm.exam.autoEvaluationConfig && vm.exam.gradeScale) {
                        vm.exam.autoEvaluationConfig = {
                            releaseType: vm.selectedReleaseType().name || vm.autoevaluation.releaseTypes[0].name,
                            releaseDate: null,
                            gradeEvaluations: vm.exam.gradeScale.grades.map(function (g) {
                                return {grade: angular.copy(g), percentage: 0};
                            })
                        };
                    }
                    if (vm.exam.autoEvaluationConfig) {
                        vm.exam.autoEvaluationConfig.gradeEvaluations.sort(function (a, b) {
                            return a.grade.id - b.grade.id;
                        });
                        vm.applyFilter(getReleaseTypeByName(vm.exam.autoEvaluationConfig.releaseType));
                    }
                };

                vm.calculateExamMaxScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getGradeDisplayName = function (grade) {
                    return Exam.getExamGradeDisplayName(grade.name);
                };

                vm.calculatePointLimit = function (evaluation) {
                    var max = vm.calculateExamMaxScore();
                    if (evaluation.percentage === 0 || isNaN(evaluation.percentage)) {
                        return 0;
                    }
                    var ratio = max * evaluation.percentage;
                    return (ratio / 100).toFixed(2);
                };

                vm.selectedReleaseType = function () {
                    var type = null;
                    vm.autoevaluation.releaseTypes.some(function (rt) {
                        if (rt.filtered) {
                            type = rt;
                            return true;
                        }
                    });
                    return type;
                };

                vm.applyFilter = function (type) {
                    vm.autoevaluation.releaseTypes.forEach(function (rt) {
                        rt.filtered = false;
                    });
                    type.filtered = !type.filtered;
                    vm.exam.autoEvaluationConfig.releaseType = vm.selectedReleaseType();
                    vm.onUpdate({config: vm.exam.autoEvaluationConfig});
                };

                vm.releaseDateChanged = function (date) {
                    vm.exam.autoEvaluationConfig.releaseDate = date;
                    vm.onUpdate({config: vm.exam.autoEvaluationConfig});
                };

                vm.propertyChanged = function () {
                    vm.onUpdate({config: vm.exam.autoEvaluationConfig});
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('examParticipantSelector', {
        templateUrl: '/assets/app/exam/editor/publication/examParticipantSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'limitToFilter', 'UserRes', 'Enrolment', 'EnrollRes', 'toast',
            function ($translate, limitToFilter, UserRes, Enrolment, EnrollRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newParticipant = {
                        "id": null,
                        "name": null
                    };
                    // go through child exams and read in the enrolments
                    var x = [];
                    vm.exam.children.forEach(function (c) {
                        x = x.concat(c.examEnrolments);
                    });
                    vm.exam.participants = x;
                };

                vm.allStudents = function (filter, criteria) {

                    return UserRes.unenrolledStudents.query({eid: vm.exam.id, q: criteria}).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.setExamParticipant = function (item, $model, $label) {
                    vm.newParticipant.id = item.id;
                };

                vm.addParticipant = function () {
                    Enrolment.enrollStudent(vm.exam, vm.newParticipant).then(
                        function (enrolment) {

                            // push to the list
                            vm.exam.examEnrolments.push(enrolment);

                            // nullify input field
                            delete vm.newParticipant.name ;
                            delete vm.newParticipant.id;

                        }, function (error) {
                            toast.error(error.data);

                        });

                };

                vm.removeParticipant = function (id) {
                    EnrollRes.unenrollStudent.remove({id: id}, function () {
                        vm.exam.examEnrolments = vm.exam.examEnrolments.filter(function (ee) {
                            return ee.id !== id;
                        });
                        toast.info($translate.instant('sitnet_participant_removed'));
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.isActualEnrolment = function (enrolment) {
                    return !enrolment.preEnrolledUserEmail;
                }

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .component('examPreParticipantSelector', {
        templateUrl: '/assets/app/exam/editor/publication/examPreParticipantSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'Enrolment', 'EnrollRes', 'toast',
            function ($translate, Enrolment, EnrollRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newPreParticipant = {
                        'email': null
                    };
                };

                vm.addPreParticipant = function () {
                    var exists = vm.exam.examEnrolments.map(function (e) {
                        return e.preEnrolledUserEmail;
                    }).indexOf(vm.newPreParticipant.email) > -1;
                    if (!exists) {
                        Enrolment.enrollStudent(vm.exam, vm.newPreParticipant).then(
                            function (enrolment) {
                                vm.exam.examEnrolments.push(enrolment);
                                delete vm.newPreParticipant.email;
                            }, function (error) {
                                toast.error(error.data);

                            });
                    }
                };

                vm.removeParticipant = function (id) {
                    EnrollRes.unenrollStudent.remove({id: id}, function () {
                        vm.exam.examEnrolments = vm.exam.examEnrolments.filter(function (ee) {
                            return ee.id !== id;
                        });
                        toast.info($translate.instant('sitnet_participant_removed'));
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.isPreEnrolment = function (enrolment) {
                    return enrolment.preEnrolledUserEmail;
                };

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('examPublication', {
        templateUrl: '/assets/app/exam/editor/publication/examPublication.template.html',
        bindings: {
            exam: '<',
            onPreviousTabSelected: '&',
            onNextTabSelected: '&?'
        },
        controller: ['$q', '$translate', '$location', '$uibModal', 'Session', 'Exam', 'ExamRes', 'SettingsResource', 'EXAM_CONF', 'lodash', 'toast',
            function ($q, $translate, $location, $modal, Session, Exam, ExamRes, SettingsResource, EXAM_CONF, lodash, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newExaminationDate = {
                        'date': new Date()
                    };
                    SettingsResource.examDurations.get(function (data) {
                        vm.examDurations = data.examDurations;
                    });
                    vm.user = Session.getUser();
                    vm.hostName = window.location.origin;
                    vm.autoevaluation = {
                        enabled: !!vm.exam.autoEvaluationConfig
                    };
                };

                vm.examinationDateChanged = function (date) {
                    vm.newExaminationDate.date = date;
                };

                vm.addExaminationDate = function (date) {
                    var alreadyExists = vm.exam.examinationDates.map(function (ed) {
                        return moment(ed.date).format('L');
                    }).some(function (ed) {
                        return ed === moment(date).format('L');
                    });
                    if (!alreadyExists) {
                        ExamRes.examinationDate.create({eid: vm.exam.id, date: date}, function (data) {
                            vm.exam.examinationDates.push(data);
                        });
                    }
                };

                vm.removeExaminationDate = function (date) {
                    ExamRes.examinationDate.delete({eid: vm.exam.id, edid: date.id}, function () {
                        var i = vm.exam.examinationDates.indexOf(date);
                        vm.exam.examinationDates.splice(i, 1);
                    });
                };

                vm.startDateChanged = function (date) {
                    vm.exam.examActiveStartDate = date;
                };

                vm.endDateChanged = function (date) {
                    vm.exam.examActiveEndDate = date;
                };

                vm.autoEvaluationConfigChanged = function (config) {
                    angular.extend(vm.exam.autoEvaluationConfig, config);
                };

                vm.updateExam = function (silent, overrides) {
                    var deferred = $q.defer();
                    var config = {
                        'evaluationConfig': vm.autoevaluation.enabled && vm.canBeAutoEvaluated() ? {
                            releaseType: vm.exam.autoEvaluationConfig.releaseType.name,
                            releaseDate: new Date(vm.exam.autoEvaluationConfig.releaseDate).getTime(),
                            amountDays: vm.exam.autoEvaluationConfig.amountDays,
                            gradeEvaluations: vm.exam.autoEvaluationConfig.gradeEvaluations
                        } : null
                    };
                    angular.extend(config, overrides);
                    Exam.updateExam(vm.exam, config).then(function () {
                        if (!silent) {
                            toast.info($translate.instant('sitnet_exam_saved'));
                        }
                        deferred.resolve();
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                vm.setExamDuration = function (duration) {
                    vm.exam.duration = duration;
                    vm.updateExam();
                };

                vm.checkDuration = function (duration) {
                    return vm.exam.duration === duration ? 'btn-primary' : '';
                };

                vm.range = function (min, max, step) {
                    step |= 1;
                    var input = [];
                    for (var i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

                vm.checkTrialCount = function (x) {
                    return vm.exam.trialCount === x ? 'btn-primary' : '';
                };

                vm.setTrialCount = function (x) {
                    vm.exam.trialCount = x;
                    vm.updateExam();
                };

                vm.canBeAutoEvaluated = function () {
                    return Exam.hasQuestions(vm.exam) && !Exam.hasEssayQuestions(vm.exam) &&
                        vm.exam.gradeScale && vm.exam.executionType.type !== 'MATURITY';
                };

                vm.previewExam = function (fromTab) {
                    var resource = vm.exam.executionType.type === 'PRINTOUT' ? 'printout' : 'preview';
                    $location.path('/exams/' + vm.exam.id + '/view/' + resource + '/' + fromTab);
                };

                vm.nextTab = function () {
                    vm.onNextTabSelected();
                };

                vm.previousTab = function () {
                    vm.onPreviousTabSelected();
                };

                vm.saveAndPublishExam = function () {

                    var err = readyForPublishing();

                    if (Object.getOwnPropertyNames(err) && Object.getOwnPropertyNames(err).length > 0) {

                        $modal.open({
                            templateUrl: EXAM_CONF.TEMPLATES_PATH + 'exam/editor/publication/publication_error_dialog.html',
                            backdrop: 'static',
                            keyboard: true,
                            controller: ["$scope", "$uibModalInstance", function ($scope, $uibModalInstance) {
                                $scope.errors = err;
                                $scope.ok = function () {
                                    $uibModalInstance.dismiss();
                                };
                            }],
                            resolve: {
                                errors: function () {
                                    return err;
                                }
                            }
                        });
                    } else {
                        $modal.open({
                            templateUrl: EXAM_CONF.TEMPLATES_PATH + 'exam/editor/publication/publication_dialog.html',
                            backdrop: 'static',
                            keyboard: true,
                            controller: ["$scope", "$uibModalInstance", function ($scope, $uibModalInstance) {
                                $scope.getConfirmationText = function () {
                                    var confirmation = $translate.instant('sitnet_publish_exam_confirm');
                                    if (vm.exam.executionType.type !== 'PRINTOUT') {
                                        confirmation += ' ' + $translate.instant('sitnet_publish_exam_confirm_enroll');
                                    }
                                    return confirmation;
                                };
                                $scope.ok = function () {
                                    $uibModalInstance.close();
                                };
                                $scope.cancel = function () {
                                    $uibModalInstance.dismiss();
                                };
                            }]
                        }).result.then(function () {
                            // OK button clicked
                            vm.updateExam(true, {'state': 'PUBLISHED'}).then(function () {
                                toast.success($translate.instant('sitnet_exam_saved_and_published'));
                                $location.path('/');
                            });
                        });
                    }
                };


                // TODO: how should this work when it comes to private exams?
                vm.unpublishExam = function () {
                    if (isAllowedToUnpublishOrRemove()) {
                        $modal.open({
                            templateUrl: EXAM_CONF.TEMPLATES_PATH + 'exam/editor/publication/publication_revoke_dialog.html',
                            backdrop: 'static',
                            keyboard: true,
                            controller: ["$scope", "$uibModalInstance", function ($scope, $uibModalInstance) {
                                $scope.ok = function () {
                                    $uibModalInstance.close();
                                };
                                $scope.cancel = function () {
                                    $uibModalInstance.dismiss();
                                };
                            }]
                        }).result.then(function () {
                            vm.updateExam(true, {'state': 'SAVED'}).then(function () {
                                toast.success($translate.instant('sitnet_exam_unpublished'));
                                vm.exam.state = 'SAVED';
                            });
                        }, function (error) {
                            // Cancel button clicked
                        });
                    } else {
                        toast.warning($translate.instant('sitnet_unpublish_not_possible'));
                    }
                };

                vm.autoEvaluationDisabled = function () {
                    vm.autoevaluation.enabled = false;
                };

                vm.autoEvaluationEnabled = function () {
                    vm.autoevaluation.enabled = true;
                };

                var isAllowedToUnpublishOrRemove = function () {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !vm.exam.hasEnrolmentsInEffect && vm.exam.children.length === 0;
                };


                var countQuestions = function () {
                    return vm.exam.examSections.reduce(function (a, b) {
                        return a + b.sectionQuestions.length;
                    }, 0);
                };

                var hasDuplicatePercentages = function () {
                    var percentages = vm.exam.autoEvaluationConfig.gradeEvaluations.map(function (e) {
                        return e.percentage;
                    }).sort();
                    for (var i = 0; i < percentages.length - 1; ++i) {
                        if (percentages[i + 1] === percentages[i]) {
                            return true;
                        }
                    }
                    return false;
                };


                var readyForPublishing = function () {

                    var errors = {};

                    if (!vm.exam.course) {
                        errors.course = $translate.instant('sitnet_course_missing');
                    }

                    if (!vm.exam.name || vm.exam.name.length < 2) {
                        errors.name = $translate.instant('sitnet_exam_name_missing_or_too_short');
                    }

                    if (vm.exam.examLanguages.length === 0) {
                        errors.name = $translate.instant('sitnet_error_exam_empty_exam_language');
                    }

                    var isPrintout = vm.exam.executionType.type === 'PRINTOUT';
                    if (!isPrintout && !vm.exam.examActiveStartDate) {
                        errors.examActiveStartDate = $translate.instant('sitnet_exam_start_date_missing');
                    }

                    if (!isPrintout && !vm.exam.examActiveEndDate) {
                        errors.examActiveEndDate = $translate.instant('sitnet_exam_end_date_missing');
                    }
                    if (isPrintout && vm.exam.examinationDates.length === 0) {
                        errors.examinationDates = $translate.instant('sitnet_examination_date_missing');
                    }

                    if (countQuestions() === 0) {
                        errors.questions = $translate.instant('sitnet_exam_has_no_questions');
                    }

                    if (!vm.exam.duration) {
                        errors.duration = $translate.instant('sitnet_exam_duration_missing');
                    }

                    if (!vm.exam.gradeScale) {
                        errors.grading = $translate.instant('sitnet_exam_grade_scale_missing');
                    }

                    if (!vm.exam.examType) {
                        errors.examType = $translate.instant('sitnet_exam_credit_type_missing');
                    }

                    var allSectionsNamed = vm.exam.examSections.every(function (section) {
                        return section.name;
                    });
                    if (!allSectionsNamed) {
                        errors.sectionNames = $translate.instant('sitnet_exam_contains_unnamed_sections');
                    }
                    if (['PRIVATE', 'MATURITY'].indexOf(vm.exam.executionType.type) > -1 && vm.exam.examEnrolments.length < 1) {
                        errors.participants = $translate.instant('sitnet_no_participants');
                    }
                    if (vm.exam.executionType.type === 'MATURITY' && !lodash.isBoolean(vm.exam.subjectToLanguageInspection)) {
                        errors.languageInspection = $translate.instant('sitnet_language_inspection_setting_not_chosen');
                    }

                    if (vm.autoevaluation.enabled && hasDuplicatePercentages(exam)) {
                        errors.autoevaluation = $translate.instant('sitnet_autoevaluation_percentages_not_unique');
                    }

                    return errors;
                };


            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('section', {
        templateUrl: '/assets/app/exam/editor/sections/section.template.html',
        bindings: {
            section: '<',
            examId: '<',
            onDelete: '&',
            onReloadRequired: '&' // TODO: try to live without this callback?
        },
        controller: ['$translate', '$uibModal', 'dialogs', 'ExamRes', 'Question', 'toast',
            function ($translate, $modal, dialogs, ExamRes, Question, toast) {

                var vm = this;

                vm.clearAllQuestions = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_all_questions'));
                    dialog.result.then(function () {
                        ExamRes.clearsection.clear({eid: vm.examId, sid: vm.section.id}, function () {
                            vm.section.sectionQuestions.splice(0, vm.section.sectionQuestions.length);
                            vm.section.lotteryOn = false;
                            toast.info($translate.instant('sitnet_all_questions_removed'));
                        }, function (error) {
                            toast.error(error.data);
                        });
                    });
                };

                vm.removeSection = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_section'));
                    dialog.result.then(function () {
                        vm.onDelete({section: vm.section});
                    });
                };

                vm.renameSection = function () {
                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                        function (sec) {
                            //vm.section = sec;
                            toast.info($translate.instant('sitnet_section_updated'));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.toggleLottery = function () {
                    if (vm.toggleDisabled()) {
                        vm.section.lotteryOn = false;
                        return;
                    }

                    if (!questionPointsMatch()) {
                        toast.error($translate.instant('sitnet_error_lottery_points_not_match'));
                        vm.section.lotteryOn = false;
                        return;
                    }

                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                        function (sec) {
                            //vm.section = sec;
                            if (angular.isUndefined(vm.section.lotteryItemCount)) {
                                vm.section.lotteryItemCount = 1;
                            }
                            toast.info($translate.instant('sitnet_section_updated'));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.toggleDisabled = function () {
                    return !vm.section.sectionQuestions || vm.section.sectionQuestions.length < 2;
                };

                vm.updateLotteryCount = function () {
                    if (!vm.section.lotteryItemCount) {
                        toast.warning($translate.instant('sitnet_warn_lottery_count'));
                        vm.section.lotteryItemCount = 1;
                    }
                    else {
                        ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                            function (sec) {
                                //vm.section = sec;
                                toast.info($translate.instant('sitnet_section_updated'));
                            }, function (error) {
                                toast.error(error.data);
                            });
                    }
                };

                vm.expandSection = function () {
                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section));
                };

                vm.moveQuestion = function (from, to) {
                    if (from >= 0 && to >= 0 && from !== to) {
                        ExamRes.questionOrder.update({
                            eid: vm.examId,
                            sid: vm.section.id,
                            from: from,
                            to: to
                        }, function () {
                            toast.info($translate.instant('sitnet_questions_reordered'));
                        });
                    }
                };

                vm.addNewQuestion = function () {
                    if (vm.section.lotteryOn) {
                        toast.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                        return;
                    }
                    openBaseQuestionEditor();
                };

                vm.removeQuestion = function (sectionQuestion) {
                    ExamRes.questions.remove({
                        eid: vm.examId,
                        sid: vm.section.id,
                        qid: sectionQuestion.question.id
                    }, function () {
                        // CHECK THE SPLICING
                        vm.section.sectionQuestions.splice(vm.section.sectionQuestions.indexOf(sectionQuestion), 1);
                        toast.info($translate.instant('sitnet_question_removed'));
                        if (vm.section.sectionQuestions.length < 2 && vm.section.lotteryOn) {
                            // turn off lottery
                            vm.section.lotteryOn = false;
                            vm.section.lotteryItemCount = 1;
                            ExamRes.sections.update({
                                eid: vm.examId,
                                sid: vm.section.id
                            }, getSectionPayload(vm.section));
                        }
                    }, function (error) {
                        toast.error(error.data);
                    });
                };


                vm.openLibrary = function () {

                    if (vm.section.lotteryOn) {
                        toast.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                        return;
                    }
                    $modal.open({
                        component: 'questionSelector',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {
                            examId: vm.examId,
                            sectionId: vm.section.id,
                            questionCount: vm.section.sectionQuestions.length
                        }
                    }).result.then(function (data) {
                        // TODO: see if we could live without reloading the whole exam from back?
                        vm.onReloadRequired();
                    });

                };


                function questionPointsMatch() {
                    if (!vm.section.sectionQuestions) {
                        return true;
                    }
                    var sectionQuestions = vm.section.sectionQuestions;
                    if (sectionQuestions.length < 1) {
                        return true;
                    }
                    var score = getQuestionScore(sectionQuestions[0]);
                    return sectionQuestions.every(function (sectionQuestion) {
                        return score === getQuestionScore(sectionQuestion);
                    });
                }

                function getQuestionScore(question) {
                    var evaluationType = question.evaluationType;
                    var type = question.question.type;
                    if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
                        return question.maxScore;
                    }
                    if (type === 'WeightedMultipleChoiceQuestion') {
                        return Question.calculateMaxPoints(question);
                    }
                    return null;
                }

                var getSectionPayload = function (section) {
                    return {
                        id: section.id,
                        name: section.name,
                        lotteryOn: section.lotteryOn,
                        lotteryItemCount: section.lotteryItemCount,
                        description: section.description,
                        expanded: section.expanded
                    };
                };

                var insertExamQuestion = function (examId, sectionId, questionId, sequenceNumber) {
                    ExamRes.sectionquestions.insert({
                            eid: examId,
                            sid: sectionId,
                            seq: sequenceNumber,
                            qid: questionId
                        }, function () {
                            vm.onReloadRequired(); // TODO: see if we could live without reloading the whole exam from back?
                        }, function (error) {
                            toast.error(error.data);
                        }
                    );
                };


                var openBaseQuestionEditor = function () {

                    $modal.open({
                        component: 'baseQuestionEditor',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {newQuestion: true}
                    }).result.then(function (data) {
                        // Now that new base question was created we make an exam section question out of it
                        insertExamQuestion(vm.examId, vm.section.id, data.question.id, vm.section.sectionQuestions.length);
                    });
                };


            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('sectionQuestion', {
        templateUrl: '/assets/app/exam/editor/sections/sectionQuestion.template.html',
        bindings: {
            sectionQuestion: '<',
            lotteryOn: '<',
            onDelete: '&'
        },
        controller: ['$sce', '$q', '$uibModal', '$translate', 'dialogs', 'Question', 'ExamQuestion', 'ExamRes', 'Attachment', 'toast',
            function ($sce, $q, $modal, $translate, dialogs, Question, ExamQuestion, ExamRes, Attachment, toast) {

                var vm = this;

                vm.calculateMaxPoints = function () {
                    return Question.calculateMaxPoints(vm.sectionQuestion);
                };

                vm.sanitizeQuestion = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.editQuestion = function () {
                    openExamQuestionEditor();
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };

                vm.removeQuestion = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question'));
                    dialog.result.then(function () {
                        vm.onDelete({sectionQuestion: vm.sectionQuestion});
                    });
                };

                var getQuestionDistribution = function () {
                    var deferred = $q.defer();
                    ExamRes.questionDistribution.get({id: vm.sectionQuestion.id}, function (data) {
                        deferred.resolve({distributed: data.distributed});
                    }, function (error) {
                        toast.error(error.data);
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                var openExamQuestionEditor = function () {
                    getQuestionDistribution().then(function (data) {
                        if (!data.distributed) {
                            // If this is not distributed, treat it as a plain question (or at least trick the user to
                            // believe so)
                            openBaseQuestionEditor();
                        } else {
                            openDistributedQuestionEditor();
                        }
                    });
                };

                var openBaseQuestionEditor = function () {
                    $modal.open({
                        component: 'baseQuestionEditor',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {lotteryOn: vm.lotteryOn, questionId: vm.sectionQuestion.question.id}
                    }).result.then(function (data) {
                        ExamQuestion.undistributionApi.update({id: vm.sectionQuestion.id},
                            function (esq) {
                                angular.extend(vm.sectionQuestion, esq);
                            }, function (error) {
                                toast.error(error.data);
                            });
                    });
                };

                var openDistributedQuestionEditor = function () {
                    $modal.open({
                        component: 'examQuestionEditor',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {
                            examQuestion: angular.copy(vm.sectionQuestion),
                            lotteryOn: vm.lotteryOn
                        }
                    }).result.then(function (data) {
                        Question.updateDistributedExamQuestion(data.question, data.examQuestion).then(
                            function (esq) {
                                toast.info($translate.instant('sitnet_question_saved'));
                                // apply changes back to scope
                                angular.extend(vm.sectionQuestion, esq);
                            });

                    });
                }


            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.exam.editor')
    .component('sections', {
        templateUrl: '/assets/app/exam/editor/sections/sectionsList.template.html',
        bindings: {
            exam: '<',
            onNextTabSelected: '&',
            onPreviousTabSelected: '&',
            onNewLibraryQuestion: '&'
        },
        controller: ['$q', '$translate', '$location', 'dialogs', 'ExamRes', 'Exam', 'toast',
            function ($q, $translate, $location, dialogs, ExamRes, Exam, toast) {

                var vm = this;

                var init = function () {
                    vm.exam.examSections.sort(function (a, b) {
                        return a.sequenceNumber - b.sequenceNumber;
                    });
                    updateSectionIndices();
                };

                vm.$onInit = function () {
                    init();
                };

                vm.$onChanges = function (changes) {
                    if (changes.exam) {
                        init();
                    }
                };

                vm.moveSection = function (section, from, to) {
                    if (from >= 0 && to >= 0 && from !== to) {
                        ExamRes.sectionOrder.update({
                            eid: vm.exam.id,
                            from: from,
                            to: to
                        }, function () {
                            updateSectionIndices();
                            toast.info($translate.instant('sitnet_sections_reordered'));
                        });
                    }
                };

                vm.addNewSection = function () {
                    var newSection = {
                        expanded: true,
                        questions: []
                    };

                    ExamRes.sections.insert({eid: vm.exam.id}, newSection, function (section) {
                        toast.success($translate.instant('sitnet_section_added'));
                        vm.exam.examSections.push(section);
                        updateSectionIndices();
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.updateExam = function (silent) {
                    var deferred = $q.defer();
                    Exam.updateExam(vm.exam).then(function () {
                        if (!silent) {
                            toast.info($translate.instant('sitnet_exam_saved'));
                        }
                        deferred.resolve();
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toast.error($translate.instant(msg));
                        }
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                vm.previewExam = function (fromTab) {
                    var resource = vm.exam.executionType.type === 'PRINTOUT' ? 'printout' : 'preview';
                    $location.path('/exams/' + vm.exam.id + '/view/' + resource + '/' + fromTab);
                };

                vm.removeExam = function () {
                    if (isAllowedToUnpublishOrRemove()) {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                        dialog.result.then(function () {
                            ExamRes.exams.remove({id: vm.exam.id}, function () {
                                toast.success($translate.instant('sitnet_exam_removed'));
                                $location.path('/');
                            }, function (error) {
                                toast.error(error.data);
                            });
                        });
                    } else {
                        toast.warning($translate.instant('sitnet_exam_removal_not_possible'));
                    }
                };

                vm.removeSection = function (section) {
                    ExamRes.sections.remove({eid: vm.exam.id, sid: section.id}, function (id) {
                        toast.info($translate.instant('sitnet_section_removed'));
                        vm.exam.examSections.splice(vm.exam.examSections.indexOf(section), 1);
                        updateSectionIndices();
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.calculateExamMaxScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.nextTab = function () {
                    vm.onNextTabSelected();
                };

                vm.previousTab = function () {
                    vm.onPreviousTabSelected();
                };

                vm.onReloadRequired = function () {
                    vm.onNewLibraryQuestion();
                };

                var isAllowedToUnpublishOrRemove = function () {
                    // allowed if no upcoming reservations and if no one has taken this yet
                    return !vm.exam.hasEnrolmentsInEffect && vm.exam.children.length === 0;
                };

                var updateSectionIndices = function () {
                    // set sections and question numbering
                    angular.forEach(vm.exam.examSections, function (section, index) {
                        section.index = index + 1;
                    });
                };

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam')
    .service('Exam', ['$translate', '$q', '$location', 'ExamRes', 'Question', 'Session', 'toast',
        function ($translate, $q, $location, ExamRes, Question, Session, toast) {

            var self = this;

            self.getReviewablesCount = function (exam) {
                return exam.children.filter(function (child) {
                    return child.state === 'REVIEW' || child.state === 'REVIEW_STARTED';
                }).length;
            };

            self.getGradedCount = function (exam) {
                return exam.children.filter(function (child) {
                    return child.state === 'GRADED';
                }).length;
            };

            self.getProcessedCount = function (exam) {
                return exam.children.filter(function (child) {
                    return ['REVIEW', 'REVIEW_STARTED', 'GRADED'].indexOf(child.state) === -1;
                }).length;
            };

            self.createExam = function (executionType) {
                ExamRes.draft.create({executionType: executionType},
                    function (response) {
                        toast.info($translate.instant('sitnet_exam_added'));
                        //return response.id;
                        $location.path('/exams/' + response.id + '/select/course');
                    }, function (error) {
                        toast.error(error.data);
                    });
            };

            self.updateExam = function (exam, overrides) {
                var data = {
                    'id': exam.id,
                    'name': exam.name || '',
                    'examType': exam.examType,
                    'instruction': exam.instruction || '',
                    'enrollInstruction': exam.enrollInstruction || '',
                    'state': exam.state,
                    'shared': exam.shared,
                    'examActiveStartDate': exam.examActiveStartDate ?
                        new Date(exam.examActiveStartDate).getTime() : undefined,
                    'examActiveEndDate': exam.examActiveEndDate ?
                        new Date(exam.examActiveEndDate).setHours(23, 59, 59, 999) : undefined,
                    'duration': exam.duration,
                    'grading': exam.gradeScale ? exam.gradeScale.id : undefined,
                    'expanded': exam.expanded,
                    'trialCount': exam.trialCount || undefined,
                    'subjectToLanguageInspection': exam.subjectToLanguageInspection,
                    'internalRef': exam.internalRef,
                    'objectVersion': exam.objectVersion
                };
                for (var k in overrides) {
                    if (overrides.hasOwnProperty(k)) {
                        data[k] = overrides[k];
                    }
                }
                var deferred = $q.defer();
                ExamRes.exams.update(data,
                    function (exam) {
                        deferred.resolve(exam);
                    }, function (error) {
                        deferred.reject(error);
                    });
                return deferred.promise;
            };


            self.getExamTypeDisplayName = function (type) {
                var name;
                switch (type) {
                    case 'PARTIAL':
                        name = $translate.instant('sitnet_exam_credit_type_partial');
                        break;
                    case 'FINAL':
                        name = $translate.instant('sitnet_exam_credit_type_final');
                        break;
                    default:
                        break;
                }
                return name;
            };

            self.getExamGradeDisplayName = function (grade) {
                var name;
                switch (grade) {
                    case 'NONE':
                        name = $translate.instant('sitnet_no_grading');
                        break;
                    case 'I':
                        name = 'Improbatur';
                        break;
                    case 'A':
                        name = 'Approbatur';
                        break;
                    case 'B':
                        name = 'Lubenter approbatur';
                        break;
                    case 'N':
                        name = 'Non sine laude approbatur';
                        break;
                    case 'C':
                        name = 'Cum laude approbatur';
                        break;
                    case 'M':
                        name = 'Magna cum laude approbtur';
                        break;
                    case 'E':
                        name = 'Eximia cum laude approbatur';
                        break;
                    case 'L':
                        name = 'Laudatur approbatur';
                        break;
                    case 'REJECTED':
                        name = $translate.instant('sitnet_rejected');
                        break;
                    case 'APPROVED':
                        name = $translate.instant('sitnet_approved');
                        break;
                    default:
                        name = grade;
                        break;
                }
                return name;
            };

            self.refreshExamTypes = function () {
                var deferred = $q.defer();
                ExamRes.examTypes.query(function (examTypes) {
                    return deferred.resolve(examTypes.map(function (examType) {
                        examType.name = self.getExamTypeDisplayName(examType.type);
                        return examType;
                    }));
                });
                return deferred.promise;
            };

            self.getScaleDisplayName = function (type) {
                var name;
                var description = type.description || type;
                switch (description) {
                    case 'ZERO_TO_FIVE':
                        name = '0-5';
                        break;
                    case 'LATIN':
                        name = 'Improbatur-Laudatur';
                        break;
                    case 'APPROVED_REJECTED':
                        name = $translate.instant('sitnet_evaluation_select');
                        break;
                    case 'OTHER':
                        name = type.displayName || type;
                }
                return name;
            };

            self.refreshGradeScales = function () {
                var deferred = $q.defer();
                ExamRes.gradeScales.query(function (scales) {
                    return deferred.resolve(scales.map(function (scale) {
                        scale.name = self.getScaleDisplayName(scale);
                        return scale;
                    }));
                });
                return deferred.promise;
            };

            self.setCredit = function (exam) {
                if (exam.customCredit !== undefined && exam.customCredit) {
                    exam.credit = exam.customCredit;
                } else {
                    exam.credit = exam.course && exam.course.credits ? exam.course.credits : 0;
                }
            };

            self.listExecutionTypes = function () {
                var deferred = $q.defer();
                ExamRes.executionTypes.query(function (types) {
                    types.forEach(function (t) {
                        if (t.type === 'PUBLIC') {
                            t.name = 'sitnet_public_exam';
                        }
                        if (t.type === 'PRIVATE') {
                            t.name = 'sitnet_private_exam';
                        }
                        if (t.type === 'MATURITY') {
                            t.name = 'sitnet_maturity';
                        }
                        if (t.type === 'PRINTOUT') {
                            t.name = 'sitnet_printout_exam';
                        }

                    });
                    return deferred.resolve(types);
                });
                return deferred.promise;
            };

            self.getExecutionTypeTranslation = function (type) {
                var translation;
                if (type === 'PUBLIC') {
                    translation = 'sitnet_public_exam';
                }
                if (type === 'PRIVATE') {
                    translation = 'sitnet_private_exam';
                }
                if (type === 'MATURITY') {
                    translation = 'sitnet_maturity';
                }
                if (type === 'PRINTOUT') {
                    translation = 'sitnet_printout_exam';
                }
                return translation;
            };

            self.getSectionTotalScore = function (section) {
                var score = 0;

                section.sectionQuestions.forEach(function (sq) {
                    switch (sq.question.type) {
                        case 'MultipleChoiceQuestion':
                            score += Question.scoreMultipleChoiceAnswer(sq);
                            break;
                        case 'WeightedMultipleChoiceQuestion':
                            score += Question.scoreWeightedMultipleChoiceAnswer(sq);
                            break;
                        case 'ClozeTestQuestion':
                            score += Question.scoreClozeTestAnswer(sq);
                            break;
                        case 'EssayQuestion':
                            if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Points') {
                                var number = parseFloat(sq.essayAnswer.evaluatedScore);
                                if (angular.isNumber(number)) {
                                    score += number;
                                }
                            }
                            break;
                        default:
                            break;
                    }
                });
                return score;
            };

            self.getSectionMaxScore = function (section) {
                var score = 0;
                section.sectionQuestions.forEach(function (sq) {
                    if (!sq || !sq.question) {
                        return;
                    }
                    switch (sq.question.type) {
                        case 'MultipleChoiceQuestion':
                        case 'ClozeTestQuestion':
                            score += sq.maxScore;
                            break;
                        case 'WeightedMultipleChoiceQuestion':
                            score += Question.calculateMaxPoints(sq);
                            break;
                        case 'EssayQuestion':
                            if (sq.evaluationType === 'Points') {
                                score += sq.maxScore;
                            }
                            break;
                        default:
                            break;
                    }
                });
                if (section.lotteryOn) {
                    score = score * section.lotteryItemCount / Math.max(1, section.sectionQuestions.length);
                }
                function isInteger(n) {
                    return typeof n === "number" && isFinite(n) && Math.floor(n) === n;
                }

                return isInteger(score) ? score : parseFloat(score.toFixed(2));
            };

            self.hasQuestions = function (exam) {
                if (!exam || !exam.examSections) {
                    return false;
                }
                return exam.examSections.reduce(function (a, b) {
                    return a + b.sectionQuestions.length;
                }, 0) > 0;
            };

            self.hasEssayQuestions = function (exam) {
                if (!exam || !exam.examSections) {
                    return false;
                }
                return exam.examSections.filter(function (es) {
                    return es.sectionQuestions.some(function (sq) {
                        return sq.question.type === 'EssayQuestion';
                    });
                }).length > 0;
            };

            self.getMaxScore = function (exam) {
                if (!exam || !exam.examSections) {
                    return 0;
                }
                var total = 0;
                exam.examSections.forEach(function (section) {
                    total += self.getSectionMaxScore(section);
                });
                return total;
            };

            self.getTotalScore = function (exam) {
                if (!exam || !exam.examSections) {
                    return 0;
                }
                var total = 0;
                exam.examSections.forEach(function (section) {
                    total += self.getSectionTotalScore(section);
                });
                return total.toFixed(2);
            };

            self.isOwner = function (exam) {
                var user = Session.getUser();
                var examToCheck = exam && exam.parent ? exam.parent : exam;
                return examToCheck && examToCheck.examOwners.filter(function (o) {
                    return o.id === user.id;
                }).length > 0;
            };

            self.isOwnerOrAdmin = function (exam) {
                var user = Session.getUser();
                return exam && user && (user.isAdmin || self.isOwner(exam));
            };

        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam')
    .component('examList', {
        templateUrl: '/assets/app/exam/examList.template.html',
        controller: ['dialogs', 'Session', 'Exam', '$translate', '$location', 'ExamRes', 'toast',
            function (dialogs, Session, Exam, $translate, $location, ExamRes, toast) {
                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    if (!vm.user.isAdmin) {
                        $location.url("/");
                        return;
                    }
                    vm.view = 'PUBLISHED';
                    vm.showExpired = false;
                    vm.examsPredicate = 'examActiveEndDate';
                    vm.reverse = true;
                    vm.filter = {};
                    vm.loader = {
                        loading: false
                    };

                    Exam.listExecutionTypes().then(function (types) {
                        vm.executionTypes = types;
                    });
                };

                vm.search = function () {
                    vm.loader.loading = true;
                    ExamRes.exams.query({filter: vm.filter.text}, function (exams) {
                        exams.forEach(function (e) {
                            e.ownerAggregate = e.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                            if (e.state === 'PUBLISHED') {
                                e.expired = Date.now() > new Date(e.examActiveEndDate);
                            } else {
                                e.expired = false;
                            }
                        });
                        vm.exams = exams;
                        vm.loader.loading = false;
                    }, function (err) {
                        vm.loader.loading = false;
                        toast.error($translate.instant(err.data));
                    });
                };

                // Called when create exam button is clicked
                vm.createExam = function (executionType) {
                    Exam.createExam(executionType);
                };

                vm.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toast.success($translate.instant('sitnet_exam_copied'));
                        $location.path("/exams/" + copy.id + "/1/");
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.deleteExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toast.success($translate.instant('sitnet_exam_removed'));
                            vm.exams.splice(vm.exams.indexOf(exam), 1);

                        }, function (error) {
                            toast.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                vm.getExecutionTypeTranslation = function (exam) {
                    return Exam.getExecutionTypeTranslation(exam.executionType.type);
                };
            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam')
    .component('printout', {
        templateUrl: '/assets/app/exam/printout/printout.template.html',
        controller: ['$http', '$routeParams', '$location', '$sce', 'Files',
            function ($http, $routeParams, $location, $sce, Files) {

                var vm = this;

                vm.$onInit = function () {
                    $http.get('/app/exampreview/' + $routeParams.id).success(function (data) {
                        data.examSections.sort(function (a, b) {
                            return a.sequenceNumber - b.sequenceNumber;
                        });
                        data.examSections.forEach(function (es) {
                            es.sectionQuestions.filter(function (esq) {
                                return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                            }).forEach(function (esq) {
                                esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                            });
                        });
                        data.examLanguages.forEach(function (l) {
                            l.ord = ['fi', 'sv', 'en', 'de'].indexOf(l.code); // TODO: fixed languages?
                        });
                        // set sections and question numbering
                        angular.forEach(data.examSections, function (section, index) {
                            section.index = index + 1;
                        });

                        vm.exam = data;

                    });
                };


                vm.getLanguageName = function (lang) { // TODO: fixed languages?
                    var name;
                    switch (lang.code) {
                        case 'fi':
                            name = 'suomeksi';
                            break;
                        case 'sv':
                            name = 'på svenska';
                            break;
                        case 'en':
                            name = 'in English';
                            break;
                        case 'de':
                            name = 'auf Deutsch';
                            break;
                    }
                    return name;
                };

                vm.getQuestionTypeName = function (esq) {
                    var name;
                    switch (esq.question.type) {
                        case 'WeightedMultipleChoiceQuestion':
                            name = 'Monivalintakysymys (voit valita monta) / Flervalsfråga (du kan välja många) / Multiple choice question (you can pick multiple)';
                            break;
                        case 'MultipleChoiceQuestion':
                            name = 'Monivalintakysymys (valitse yksi) / Flervalsfråga (välj en) / Multiple choice question (pick one)';
                            break;
                        case 'EssayQuestion':
                            name = 'Esseekysymys / Essefråga / Essay question';
                            break;
                        case 'ClozeTestQuestion':
                            name = 'Aukkotehtävä / Fyll i det som saknas / Cloze test question';
                            break;
                    }
                    return name;
                };

                vm.exitPreview = function () {
                    var path = $routeParams.tab ? '/exams/' + $routeParams.id + '/' + $routeParams.tab : '/printouts';
                    $location.path(path);
                };

                vm.print = function () {
                    window.print();
                };

                vm.printAttachment = function () {
                    Files.download('/app/attachment/exam/' + $routeParams.id, vm.exam.attachment.fileName);
                };

                vm.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };


            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam')
    .component('printoutListing', {
        template:
        '<div id="sitnet-header" class="header">\n' +
        '    <div class="col-md-12 header-wrapper">\n' +
        '        <span class="header-text">{{\'sitnet_printout_exams\' | translate}}</span>\n' +
        '    </div>\n' +
        '</div>\n' +
        '<div id="dashboard">\n' +
        '    <div class="top-row">\n' +
        '        <div class="col-md-12">\n' +
        '            <table class="table table-striped table-condensed exams-table">\n' +
        '                <thead>\n' +
        '                <tr>\n' +
        '                    <th sort by="examinationDatesAggregate" text="sitnet_examination_dates" predicate="$ctrl.predicate"\n' +
        '                        reverse="$ctrl.reverse"></th>\n' +
        '                    <th sort by="course.code" text="sitnet_examcode" predicate="$ctrl.predicate"\n' +
        '                        reverse="$ctrl.reverse"></th>\n' +
        '                    <th sort by="name" text="sitnet_exam_name" predicate="$ctrl.predicate" reverse="$ctrl.reverse"></th>\n' +
        '                    <th sort by="ownerAggregate" text="sitnet_teachers" predicate="$ctrl.predicate"\n' +
        '                        reverse="$ctrl.reverse"></th>\n' +
        '                </tr>\n' +
        '                </thead>\n' +
        '                <tbody>\n' +
        '                <tr ng-repeat="exam in $ctrl.printouts | orderBy:$ctrl.predicate:$ctrl.reverse">\n' +
        '                    <td>{{ exam.examinationDatesAggregate }}</td>\n' +
        '                    <td>{{exam.course.code}}</td>\n' +
        '                    <td><a class="exams-info-title bold-button" href="/exams/{{exam.id}}/view/printout">{{exam.name}}</a>\n' +
        '                    <td>\n' +
        '                        <teacher-list exam="exam"/>\n' +
        '                    </td>\n' +
        '                </tr>\n' +
        '                </tbody>\n' +
        '            </table>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n',
        controller: ['$http',
            function ($http) {

                var vm = this;

                vm.$onInit = function () {
                    vm.predicate = 'examinationDatesAggregate';
                    vm.reverse = true;
                    $http.get('/app/exam/printouts').success(function (printouts) {
                        printouts.forEach(function (printout) {
                            var dates = printout.examinationDates.map(function (ed) {
                                return ed.date;
                            });
                            dates.sort(function (a, b) {
                                return a - b;
                            });
                            printout.examinationDatesAggregate = dates.map(function (d) {
                                return moment(d).format('DD.MM.YYYY');
                            }).join(', ');
                        });
                        vm.printouts = printouts;
                    });
                };

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

(function () {
    'use strict';
    angular.module('app.exam')
        .factory('StudentExamRes', ['$resource', function ($resource) {
            return {
                exams: $resource("/app/student/exams"),
                examInfo: $resource('/app/student/exam/:eid/info', {eid: '@eid'}),
                finishedExams: $resource('/app/student/finishedexams'),
                enrolments: $resource('/app/enrolments'),
                enrolment: $resource('/app/enrolments/:eid',
                    {
                        eid: '@eid'
                    },
                    {
                        'get': {method: 'GET', params: {eid: '@eid'}},
                        'update': {method: 'PUT', params: {eid: '@eid'}}
                    }),
                feedback: $resource('/app/feedback/exams/:eid',
                    {
                        eid: '@eid'
                    },
                    {
                        'get': {method: 'GET', params: {eid: '@eid'}}
                    }),
                scores: $resource('/app/feedback/exams/:eid/score', {eid: '@eid'}),
                teachers: $resource('/app/student/inspectors/exam/:id',
                    {
                        id: '@id'
                    },
                    {
                        'get': {method: 'GET', isArray: true, params: {id: '@id'}}
                    }),
                reservationInstructions: $resource('/app/student/exams/:id',
                    {
                        id: '@id'
                    },
                    {
                        'get': {method: 'GET', isArray: false, params: {id: '@id'}}
                    })
            };
        }]);
}());
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationClock', {
        template:
        '<div class="floating-clock">\n' +
        '    <div class="header-wrapper">\n' +
        '        <span ng-if="$ctrl.showRemainingTime" class="exam-clock-text">\n' +
        '            <span class="sitnet-white">{{\'sitnet_exam_time_left\' | translate}}: </span>\n' +
        '        </span>\n' +
        '        <span class="exam-clock">\n' +
        '            <span ng-if="$ctrl.showRemainingTime"\n' +
        '                ng-class="$ctrl.remainingTime <= $ctrl.alarmThreshold ? \'sitnet-text-alarm\' : \'\'">\n' +
        '                {{$ctrl.formatRemainingTime()}}\n' +
        '            </span>\n' +
        '            <span ng-if="!$ctrl.showRemainingTime" class="clock-hide"><i>{{\'sitnet_clock_hidden\' | translate}}</i></span>\n' +
        '        </span>\n' +
        '        <span>\n' +
        '            <img ng-click="$ctrl.showRemainingTime = !$ctrl.showRemainingTime"\n' +
        '                 src="/assets/assets/images/icon_clock.svg" alt="exam"\n' +
        '                 onerror="this.onerror=null;this.src=\'/assets/assets/images/icon_clock.png\';"/>\n' +
        '        </span>\n' +
        '    </div>\n' +
        '</div>\n',
        bindings: {
            examHash: '<',
            onTimeout: '&'
        },
        controller: ['$timeout', '$http',
            function ($timeout, $http) {

                var vm = this;

                var _syncInterval = 15; // Interval for syncing time with backend in seconds
                var _secondsSinceSync = _syncInterval + 1; // Init so that we sync right away
                var _poller = {};

                vm.$onInit = function () {
                    vm.alarmThreshold = 300; //  Alert user if less than five minutes left.
                    vm.showRemainingTime = true;
                    checkRemainingTime();
                };

                vm.$onDestroy = function () {
                    $timeout.cancel(_poller);
                };

                var checkRemainingTime = function () {
                    _secondsSinceSync++;
                    if (_secondsSinceSync > _syncInterval) {
                        // Sync time with backend
                        _secondsSinceSync = 0;
                        getRemainingTime();
                    } else if (vm.remainingTime) {
                        // Decrease seconds
                        vm.remainingTime--;
                    }
                    if (vm.remainingTime && vm.remainingTime < 0) {
                        onTimeout();
                    }

                    _poller = $timeout(checkRemainingTime, 1000);
                };

                var getRemainingTime = function () {
                    var req = $http.get('/app/time/' + vm.examHash);
                    req.success(function (reply) {
                        vm.remainingTime = parseInt(reply);
                    });
                };

                var onTimeout = function () {
                    $timeout.cancel(_poller);
                    vm.onTimeout();
                };

                var zeroPad = function (n) {
                    n += '';
                    return n.length > 1 ? n : '0' + n;
                };

                vm.formatRemainingTime = function () {
                    if (!vm.remainingTime) {
                        return '';
                    }
                    var hours = Math.floor(vm.remainingTime / 60 / 60);
                    var minutes = Math.floor(vm.remainingTime / 60) % 60;
                    var seconds = vm.remainingTime % 60;
                    return hours + ':' + zeroPad(minutes) + ':' + zeroPad(seconds);
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
                    Examination.startExam($routeParams.hash, vm.isPreview, $routeParams.id)
                        .then(function (exam) {
                            exam.examSections.sort(function (a, b) {
                                return a.sequenceNumber - b.sequenceNumber;
                            });
                            // set section indices
                            angular.forEach(exam.examSections, function (section, index) {
                                section.index = index + 1;
                            });

                            vm.exam = exam;
                            setActiveSection({type: 'guide'});
                        }, function () {
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
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.examination')
    .service('Examination', ['$q', '$location', '$http', '$translate', '$window', 'lodash', 'toast',
        function ($q, $location, $http, $translate, $window, lodash, toast) {

            var self = this;
            var _external;

            var getResource = function (url) {
                return _external ? url.replace('/app/', '/app/iop/') : url;
            };

            self.startExam = function (hash, isPreview, id) {
                var url = isPreview && id ? '/app/exampreview/' + id : '/app/student/exam/' + hash;
                var deferred = $q.defer();
                $http.get(url).success(function (data) {
                    if (data.cloned) {
                        // we came here with a reference to the parent exam so do not render page just yet,
                        // reload with reference to student exam that we just created
                        $location.path('/student/exam/' + data.hash);
                    }
                    _external = data.external;
                    deferred.resolve(data);
                }).error(function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };

            self.saveTextualAnswer = function (esq, hash, autosave) {
                esq.questionStatus = $translate.instant('sitnet_answer_saved');
                var deferred = $q.defer();
                var type = esq.question.type;
                var answerObj = type === 'EssayQuestion' ? esq.essayAnswer : esq.clozeTestAnswer;
                var url = getResource(type === 'EssayQuestion' ?
                    '/app/student/exam/' + hash + '/question/' + esq.id :
                    '/app/student/exam/' + hash + '/clozetest/' + esq.id
                );
                var msg = {
                    answer: answerObj.answer,
                    objectVersion: answerObj.objectVersion
                };
                $http.post(url, msg).success(function (answer) {
                    if (autosave) {
                        esq.autosaved = new Date();
                    } else {
                        toast.info($translate.instant('sitnet_answer_saved'));
                        self.setQuestionColors(esq);
                    }
                    answerObj.objectVersion = answer.objectVersion;
                    deferred.resolve();
                }).error(function (error) {
                    toast.error(error.data);
                    deferred.reject();
                });
                return deferred.promise;
            };

            var isTextualAnswer = function (esq) {
                switch (esq.question.type) {
                    case 'EssayQuestion':
                        return esq.essayAnswer && esq.essayAnswer.answer.length > 0;
                    case 'ClozeTestQuestion':
                        return esq.clozeTestAnswer && !lodash.isEmpty(esq.clozeTestAnswer.answer);
                    default:
                        return false;
                }
            };

            self.saveAllTextualAnswersOfSection = function (section, hash, autosave, canFail) {
                var deferred = $q.defer();

                var questions = section.sectionQuestions.filter(function (esq) {
                    return isTextualAnswer(esq);
                });
                var save = function (question, cb) {
                    self.saveTextualAnswer(question, hash, autosave).then(function () {
                        cb(null);
                    }, function (err) {
                        cb(err);
                    });
                };
                // Run this in an async loop to make sure we don't get version conflicts
                $window.async.eachSeries(questions, save, function (err) {
                    if (err && canFail) {
                        deferred.reject();
                    } else {
                        deferred.resolve();
                    }
                });
                return deferred.promise;
            };

            var stripHtml = function (text) {
                if (text && text.indexOf('math-tex') === -1) {
                    return String(text).replace(/<[^>]+>/gm, '');
                }
                return text;
            };

            self.isAnswered = function (sq) {
                var isAnswered;
                switch (sq.question.type) {
                    case 'EssayQuestion':
                        var essayAnswer = sq.essayAnswer;
                        isAnswered = essayAnswer && essayAnswer.answer &&
                            stripHtml(essayAnswer.answer).length > 0;
                        break;
                    case 'MultipleChoiceQuestion':
                        isAnswered = angular.isDefined(sq.selectedOption) || sq.options.filter(function (o) {
                            return o.answered;
                        }).length > 0;
                        break;
                    case 'WeightedMultipleChoiceQuestion':
                        isAnswered = sq.options.filter(function (o) {
                            return o.answered;
                        }).length > 0;
                        break;
                    case 'ClozeTestQuestion':
                        var clozeTestAnswer = sq.clozeTestAnswer;
                        isAnswered = clozeTestAnswer && !lodash.isEmpty(clozeTestAnswer.answer);
                        break;
                    default:
                        isAnswered = false;
                }
                return isAnswered;
            };

            self.setQuestionColors = function (sectionQuestion) {
                if (self.isAnswered(sectionQuestion)) {
                    sectionQuestion.answered = true;
                    sectionQuestion.questionStatus = $translate.instant('sitnet_question_answered');
                    sectionQuestion.selectedAnsweredState = 'question-answered-header';
                } else {
                    sectionQuestion.answered = false;
                    sectionQuestion.questionStatus = $translate.instant('sitnet_question_unanswered');
                    sectionQuestion.selectedAnsweredState = 'question-unanswered-header';
                }
            };

            self.saveOption = function (hash, sq, preview) {
                var ids;
                if (sq.question.type === 'WeightedMultipleChoiceQuestion') {
                    ids = sq.options.filter(function (o) {
                        return o.answered;
                    }).map(function (o) {
                        return o.id;
                    });
                } else {
                    ids = [sq.selectedOption];
                }
                if (!preview) {
                    var url = getResource('/app/student/exam/' + hash + '/question/' + sq.id + '/option');
                    $http.post(url, {oids: ids}).success(function () {
                        toast.info($translate.instant('sitnet_answer_saved'));
                        sq.options.forEach(function (o) {
                            o.answered = ids.indexOf(o.id) > -1;
                        });
                        self.setQuestionColors(sq);
                    }).error(function (error) {
                        toast.error(error.data);
                    });
                } else {
                    self.setQuestionColors(sq);
                }

            };

            self.abort = function (hash) {
                var url = getResource('/app/student/exam/abort/' + hash);
                return $http.put(url);
            };

            self.logout = function (msg, hash) {
                var url = getResource('/app/student/exam/' + hash);
                $http.put(url).success(function () {
                    toast.info($translate.instant(msg), {timeOut: 5000});
                    window.onbeforeunload = null;
                    $location.path('/student/logout/finished');
                }).error(function (error) {
                    toast.error($translate.instant(error.data));
                });
            };

        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationHeader', {
        template:
        '<div class="row">\n' +
        '    <div class="exam-header">\n' +
        '        <div class="exam-header-img-wrap">\n' +
        '            <img src="/assets/assets/images/exam-logo-mobile.svg" alt="exam"\n' +
        '                 onerror="this.onerror=null;this.src=\'/assets/assets/images/exam-logo-mobile.png\'"/>\n' +
        '        </div>\n' +
        '        <div class="exam-header-title divider"></div>\n' +
        '        <div class="exam-header-title">{{ $ctrl.exam.course.name }} <span>{{ $ctrl.exam.course.code }}</span></div>\n' +
        '        <div class="language-selector">\n' +
        '            <a class="exam-clock-text" ng-click="$ctrl.switchLanguage(\'fi\')">FI</a>\n' +
        '            <a class="exam-clock-text" ng-click="$ctrl.switchLanguage(\'sv\')">SV</a>\n' +
        '            <a class="exam-clock-text" ng-click="$ctrl.switchLanguage(\'en\')">EN</a>\n' +
        '            <span class="exam-header-title divider"></span>\n' +
        '        </div>\n' +
        '        <examination-clock\n' +
        '                ng-if="!$ctrl.isPreview" exam-hash="$ctrl.exam.hash" on-timeout="$ctrl.informTimeout()">\n' +
        '        </examination-clock>\n' +
        '    </div>\n' +
        '</div>',
        bindings: {
            exam: '<',
            onTimeout: '&',
            isPreview: '<'
        },
        controller: ['Session',
            function (Session) {

                var vm = this;

                vm.informTimeout = function () {
                    vm.onTimeout();
                };

                vm.switchLanguage = function (key) {
                    Session.switchLanguage(key);
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('answerInstructions', {
        template: '' +
        '<!-- ANSWER INSTRUCTIONS -->' +
        '<div class="studentexam-header">' +
        '    <span class="exam-title">{{\'sitnet_exam_guide\' | translate}}</span>' +
        '</div>' +
        '<div class="guide-wrapper marr0 pad-15 col-md-12">' +
        '    <div class="guide-column">' +
        '        <span class="header col-md-4"><span>{{ \'sitnet_course_name\' | translate }}:</span></span>' +
        '        <span class="text col-md-8">{{ $ctrl.exam.course.name }}&nbsp;</span>' +
        '    </div>' +
        '    <div class="guide-column">' +
        '        <span class="header col-md-4"><span>{{ \'sitnet_course_code\' | translate }}:</span></span>' +
        '        <span class="text col-md-8">{{ $ctrl.exam.course.code }}&nbsp;</span>' +
        '    </div>' +
        '    <div class="guide-column">' +
        '        <span class="header col-md-4"><span>{{ \'sitnet_exam_name\' | translate }}:</span></span>' +
        '        <span class="text col-md-8">{{ $ctrl.exam.name }}&nbsp;</span>' +
        '    </div>' +
        '    <div class="guide-column">' +
        '        <span class="header col-md-4"><span>{{ \'sitnet_exam_duration\' | translate }}:</span></span>' +
        '        <span class="text col-md-8">{{ $ctrl.printExamDuration() }}&nbsp;</span>' +
        '    </div>' +
        '    <div class="guide-column padtop">' +
        '        <span>{{ \'sitnet_exam_guide\' | translate }}:</span>' +
        '    </div>' +
        '    <div class="guide-column">' +
        '        <div class="list-group">' +
        '            <form class="form-inline pad-15" role="form">' +
        '                <div class="guide-instruction col-md-12" ng-bind-html="$ctrl.exam.instruction"></div>' +
        '            </form>' +
        '        </div>' +
        '    </div>' +
        '</div>',
        bindings: {
            exam: '<'
        },
        controller: ['DateTime',
            function (DateTime) {

                var vm = this;

                vm.printExamDuration = function () {
                    return DateTime.printExamDuration(vm.exam);
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationLogout', {
        template: '' +
        '<div id="sitnet-header" class="header">' +
        '    <div class="col-md-12 header-wrapper">' +
        '        <span class="header-text">{{\'sitnet_end_of_exam\' | translate}}</span>' +
        '    </div>' +
        '</div>' +
        '<div id="dashboard">' +
        '    <div class="exam-logout-wrapper">' +
        '        <h3 class="text-info" style="text-align: center">{{$ctrl.reasonPhrase | translate}} {{\'sitnet_log_out_will_commence\' | translate}}</h3>' +
        '    </div>' +
        '</div>',
        controller: ['$rootScope', '$routeParams', '$location', '$timeout',
            function ($rootScope, $routeParams, $location, $timeout) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reasonPhrase = $routeParams.reason === 'aborted' ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';

                    $timeout(function () {
                        $rootScope.$broadcast('examEnded');
                        $location.path('/logout');
                    }, 8000);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationNavigation', {
        template: '<!-- SECTION NAVIGATION ARROWS AND LABELS -->' +
        '<div class="row exam-navigation">' +
        '    <span class="col-md-12">' +
        '        <!-- PREVIOUS SECTION BUTTON -->' +
        '        <a class="green_button previous" ng-show="$ctrl.prev.valid" ng-click="$ctrl.previousPage()">' +
        '            <img class="arrow_icon" src="/assets/assets/images/icon_left_white.png"> {{ $ctrl.prev.text | translate }}' +
        '        </a>' +
        '        <!-- NEXT SECTION BUTTON -->' +
        '        <a class="green_button" ng-show="$ctrl.next.valid" ng-click="$ctrl.nextPage()">{{ $ctrl.next.text | translate }}' +
        '            <img class="arrow_icon" src="/assets/assets/images/icon_right_white.png">' +
        '        </a>' +
        '    </span>' +
        '</div>',
        bindings: {
            exam: '<',
            activeSection: '<',
            onSelect: '&'
        },
        controller: [
            function () {

                var vm = this;

                var _pages = [];

                vm.$onInit = function () {
                    _pages = vm.exam.examSections.map(function (es) {
                        return {id: es.id, text: es.name, type: 'section', valid: true};
                    });
                    // Add guide page
                    _pages.unshift({text: 'sitnet_exam_guide', type: 'guide', valid: true});
                    setupNavigation();
                };

                vm.$onChanges = function (changes) {
                    if (changes.activeSection) {
                        setupNavigation(); // Active page did change
                    }
                };

                var setupNavigation = function () {
                    if (angular.isUndefined(vm.activeSection)) {
                        vm.next = _pages[1];
                        vm.prev = {valid: false};
                    } else {
                        var nextIndex = nextPageIndex();
                        vm.next = nextIndex > -1 ? _pages[nextIndex] : {valid: false};
                        var prevIndex = prevPageIndex();
                        vm.prev = prevIndex > -1 ? _pages[prevIndex] : {valid: false};
                    }
                };

                var activePageIndex = function () {
                    var page = _pages.filter(function (p) {
                        return vm.activeSection.id === p.id;
                    })[0];
                    return _pages.indexOf(page);
                };

                var nextPageIndex = function () {
                    var activeIndex = activePageIndex();
                    return activeIndex + 1 === _pages.length ? -1 : activeIndex + 1;
                };

                var prevPageIndex = function () {
                    return activePageIndex() - 1;
                };

                vm.nextPage = function () {
                    vm.onSelect({page: vm.next});
                };

                vm.previousPage = function () {
                    vm.onSelect({page: vm.prev});
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationToolbar', {
        templateUrl: '/assets/app/examination/navigation/examinationToolbar.template.html',
        bindings: {
            exam: '<',
            activeSection: '<',
            isPreview: '<',
            onPageSelect: '&'
        },
        controller: ['$http', '$location', '$routeParams', '$translate', 'dialogs', 'Session', 'Examination',
            'Attachment', 'Enrolment', 'toast',
            function ($http, $location, $routeParams, $translate, dialogs, Session, Examination, Attachment,
                      Enrolment, toast) {

                var vm = this;

                vm.$onInit = function () {
                    if (!vm.isPreview) {
                        $http.get('/app/enroll/room/' + vm.exam.hash)
                            .success(function (data) {
                                vm.room = data;
                            });
                    }
                };

                vm.displayUser = function () {
                    var user = Session.getUser();
                    if (!user) {
                        return;
                    }
                    var userId = user.userIdentifier ? ' (' + user.userIdentifier + ')' : '';
                    return user.firstName + ' ' + user.lastName + userId;
                };

                vm.turnExam = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_turn_exam'));
                    dialog.result.then(function () {
                        if (vm.activeSection) {
                            Examination.saveAllTextualAnswersOfSection(vm.activeSection, vm.exam.hash, false).then(function () {
                                Examination.logout('sitnet_exam_returned', vm.exam.hash);
                            });
                        } else {
                            Examination.logout('sitnet_exam_returned', vm.exam.hash);
                        }
                    });
                };

                vm.abortExam = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_abort_exam'));
                    dialog.result.then(function () {
                        Examination.abort(vm.exam.hash).success(function () {
                            toast.info($translate.instant('sitnet_exam_aborted'), {timeOut: 5000});
                            window.onbeforeunload = null;
                            $location.path('/student/logout/aborted');
                        }).error(function (err) {
                            toast.error(err.data);
                        });
                    });
                };

                vm.downloadExamAttachment = function () {
                    Attachment.downloadExamAttachment(vm.exam);
                };

                vm.selectGuidePage = function () {
                    vm.onPageSelect({page: {type: 'guide'}});
                };

                vm.selectSection = function (section) {
                    vm.onPageSelect({page: {id: section.id, type: 'section'}});
                };

                vm.getQuestionAmount = function (section, type) {
                    if (type === 'total') {
                        return section.sectionQuestions.length;
                    } else if (type === 'answered') {
                        return section.sectionQuestions.filter(function (sq) {
                            return Examination.isAnswered(sq);
                        }).length;
                    } else if (type === 'unanswered') {
                        return section.sectionQuestions.length - section.sectionQuestions.filter(function (sq) {
                                return Examination.isAnswered(sq);
                            }).length;
                    }
                };

                vm.displayRoomInstructions = function () {
                    if (vm.room) {
                        switch ($translate.use()) {
                            case 'fi':
                                return vm.room.roomInstruction;
                            case 'sv':
                                return vm.room.roomInstructionSV;
                            case 'en':
                            /* falls through */
                            default:
                                return vm.room.roomInstructionEN;
                        }
                    }
                };

                vm.showMaturityInstructions = function () {
                    Enrolment.showMaturityInstructions({exam: vm.exam});
                };

                vm.exitPreview = function () {
                    $location.path('/exams/' + $routeParams.id + '/' + $routeParams.tab);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationClozeTest', {
        templateUrl: '/assets/app/examination/question/examinationClozeTest.template.html',
        bindings: {
            sq: '<',
            examHash: '<'
        },
        controller: ['Examination',
            function (Examination) {

                var vm = this;

                vm.saveAnswer = function () {
                    Examination.saveTextualAnswer(vm.sq, vm.examHash, false);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationEssayQuestion', {
        templateUrl: '/assets/app/examination/question/examinationEssayQuestion.template.html',
        bindings: {
            sq: '<',
            examHash: '<',
            isPreview: '<'
        },
        controller: ['Examination', 'Attachment', 'Files',
            function (Examination, Attachment, Files) {

                var vm = this;

                vm.$onInit = function () {
                    Examination.setQuestionColors(vm.sq);
                };

                vm.saveAnswer = function () {
                    Examination.saveTextualAnswer(vm.sq, vm.examHash, false);
                };

                vm.removeQuestionAnswerAttachment = function () {
                    Attachment.removeQuestionAnswerAttachment(vm.sq.question, vm.examHash);
                };

                vm.selectFile = function () {
                    if (vm.isPreview) {
                        return;
                    }
                    Attachment.selectFile(false).then(function (data) {
                        Files.uploadAnswerAttachment('/app/attachment/question/answer', data.attachmentFile,
                            {questionId: vm.sq.id, answerId: vm.sq.essayAnswer.id}, vm.sq.essayAnswer);
                    });
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationMultiChoiceQuestion', {
        template: '' +
        '<div class="bottom-padding-2">' +
        '    <div ng-repeat="sqo in $ctrl.sq.options | orderBy: \'id\'" class="exam-answer-options">' +
        '        <input type="radio" ng-model="$ctrl.sq.selectedOption" ng-value="sqo.id"' +
        '            ng-click="$ctrl.saveOption()"/>' +
        '        {{sqo.option.option}}' +
        '    </div>' +
        '</div>' +
        '<div class="padl0 question-type-text">' +
        '    {{$ctrl.sq.derivedMaxScore}} {{\'sitnet_unit_points\' | translate}}' +
        '</div>',
        bindings: {
            sq: '<',
            examHash: '<',
            isPreview: '<'
        },
        controller: ['Examination',
            function (Examination) {

                var vm = this;

                vm.$onInit = function () {
                    var answered = vm.sq.options.filter(function (o) {
                        return o.answered;
                    });
                    if (answered.length > 1) {
                        console.warn('several answered options for mcq');
                    }
                    if (answered.length === 1) {
                        vm.sq.selectedOption = answered[0].id;
                    }
                };

                vm.saveOption = function () {
                    Examination.saveOption(vm.examHash, vm.sq, vm.isPreview);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationQuestion', {
        templateUrl: '/assets/app/examination/question/examinationQuestion.template.html',
        bindings: {
            examHash: '<',
            sq: '<',
            isPreview: '<'
        },
        controller: ['$sce', '$filter', 'Examination', 'Attachment',
            function ($sce, $filter, Examination, Attachment) {

                var vm = this;

                vm.$onInit = function () {
                    vm.sq.expanded = true;
                    var answerData = vm.sq.clozeTestAnswer;
                    if (answerData && typeof answerData.answer === 'string') {
                        answerData.answer = JSON.parse(answerData.answer);
                    }
                };

                vm.displayQuestionText = function (truncated) {
                    var text = truncated ? truncate(vm.sq.question.question, 240) : vm.sq.question.question;
                    return $sce.trustAsHtml(text);
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.sq.question);
                };

                vm.isAnswered = function () {
                    return Examination.isAnswered(vm.sq);
                };

                var truncate = function (content, offset) {
                    return $filter('truncate')(content, offset);
                };


            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationWeightedMultiChoiceQuestion', {
        template: '' +
        '<div class="bottom-padding-2">' +
        '    <div ng-repeat="sqo in $ctrl.sq.options | orderBy: \'id\'" class="exam-answer-options">' +
        '        <input type="checkbox" name="selectedOption" ng-checked="sqo.answered" ng-model="sqo.answered"' +
        '            ng-change="$ctrl.saveOption()"/>' +
        '        {{sqo.option.option}}' +
        '    </div>' +
        '</div>' +
        '<div class="padl0 question-type-text">' +
        '    {{$ctrl.sq.derivedMaxScore}} {{\'sitnet_unit_points\' | translate}}' +
        '</div>',
        bindings: {
            sq: '<',
            examHash: '<',
            isPreview: '<'
        },
        controller: ['Examination',
            function (Examination) {

                var vm = this;

                vm.saveOption = function () {
                    Examination.saveOption(vm.examHash, vm.sq, vm.isPreview);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.examination')
    .component('examinationSection', {
        templateUrl: '/assets/app/examination/section/examinationSection.template.html',
        bindings: {
            examHash: '<',
            isPreview: '<',
            section: '<'
        },
        controller: ['$interval', 'Examination',
            function ($interval, Examination) {

                var vm = this;
                var _autosaver = null;

                vm.$onInit = function () {
                    resetAutosaver();
                };

                vm.$onChanges = function (props) {
                    if (props.section) {
                        // Section changed
                        resetAutosaver();
                    }
                };

                vm.$onDestroy = function () {
                    // No section currently active
                    cancelAutosaver();
                };

                var resetAutosaver = function () {
                    cancelAutosaver();
                    if (vm.section) {
                        _autosaver = $interval(function () {
                            Examination.saveAllTextualAnswersOfSection(vm.section, vm.examHash, true);
                        }, 1000 * 60);
                    }
                };

                var cancelAutosaver = function () {
                    if (_autosaver) {
                        $interval.cancel(_autosaver);
                        _autosaver = null;
                    }
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.accessibility')
    .component('accessibility', {
        templateUrl: '/assets/app/facility/accessibility/accessibility.template.html',
        controller: ['$translate', '$http', 'toast', function ($translate, $http, toast) {

            var ctrl = this;

            ctrl.$onInit = function () {
                ctrl.newItem = {};
                $http.get('/app/accessibility').success(function (data) {
                    ctrl.accessibilities = data;
                });
            };

            ctrl.add = function (item) {
                $http.post('/app/accessibility', item).success(function (data) {
                    ctrl.accessibilities.push(data);
                    toast.info($translate.instant("sitnet_accessibility_added"));
                });
            };

            ctrl.update = function (accessibility) {
                $http.put('/app/accessibility', accessibility).success(function () {
                    toast.info($translate.instant("sitnet_accessibility_updated"));
                });
            };

            ctrl.remove = function (accessibility) {
                $http.delete('/app/accessibility/' + accessibility.id).success(function () {
                    ctrl.accessibilities.splice(ctrl.accessibilities.indexOf(accessibility), 1);
                    toast.info($translate.instant("sitnet_accessibility_removed"));
                });
            };
        }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.accessibility')
    .component('accessibilitySelector', {
        templateUrl: '/assets/app/facility/accessibility/accessibilitySelector.template.html',
        bindings: {
            room: '<'
        },
        controller: ['$translate', 'toast', '$http', function ($translate, toast, $http) {
            var vm = this;

            vm.$onInit = function () {
                $http.get('/app/accessibility').success(function (data) {
                    vm.accessibilities = data;
                });
            };

            vm.selectedAccessibilities = function () {
                return vm.room.accessibility.length === 0 ? $translate.instant('sitnet_select') :
                    vm.room.accessibility.map(function (ac) {
                        return ac.name;
                    }).join(", ");
            };

            vm.isSelected = function (ac) {
                return getIndexOf(ac) > -1;
            };

            vm.updateAccessibility = function (ac) {
                var index = getIndexOf(ac);
                if (index > -1) {
                    vm.room.accessibility.splice(index, 1);
                } else {
                    vm.room.accessibility.push(ac);
                }
                var ids = vm.room.accessibility.map(function (item) {
                    return item.id;
                }).join(", ");

                $http.post('/app/room/' + vm.room.id + '/accessibility', {ids: ids})
                    .success(function () {
                        toast.info($translate.instant("sitnet_room_updated"));
                    });
            };

            function getIndexOf(ac) {
                return vm.room.accessibility.map(function (a) {
                    return a.id;
                }).indexOf(ac.id);
            }
        }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.address')
    .component('examAddress', {
        templateUrl: '/assets/app/facility/address/address.template.html',
        bindings: {
            address: '<'
        },
        controller: ['Room', 'toast', '$translate', function (Room, toast, $translate) {

            var vm = this;

            vm.updateAddress = function () {
                Room.addresses.update(vm.address,
                    function () {
                        toast.info($translate.instant("sitnet_room_address_updated"));
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );
            };
        }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.machines')
    .component('machine', {
        templateUrl: '/assets/app/facility/machines/machine.template.html',
        controller: ['$q', 'dialogs', '$routeParams', '$location', 'Machines', '$translate', 'toast',
            function ($q, dialogs, $routeParams, $location, Machines, $translate, toast) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    Machines.machine.get({id: $routeParams.id},
                        function (machine) {
                            ctrl.machine = machine;
                            Machines.software.query(
                                function (data) {
                                    ctrl.software = data;
                                    ctrl.software.forEach(function (s) {
                                        s.class = ctrl.machine.softwareInfo.map(function (si) {
                                            return si.id;
                                        }).indexOf(s.id) > -1 ? "btn-info" : "btn-default";
                                    });
                                }
                            );
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                ctrl.removeMachine = function (machine) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_machine'));
                    dialog.result.then(function () {
                        Machines.machine.remove({id: machine.id},
                            function () {
                                toast.info($translate.instant('sitnet_machine_removed'));
                                $location.path("/rooms/");
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    });
                };

                ctrl.toggleSoftware = function (software) {
                    Machines.machineSoftware.toggle({mid: ctrl.machine.id, sid: software.id},
                        function (response) {
                            software.class = response.software === 'true' ? 'btn-info' : 'btn-default';
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.updateMachine = function () {
                    var deferred = $q.defer();
                    Machines.machine.update(ctrl.machine,
                        function () {
                            toast.info($translate.instant('sitnet_machine_updated'));
                            deferred.resolve();
                        },
                        function (error) {
                            toast.error(error.data);
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                ctrl.updateMachineAndExit = function () {
                    ctrl.updateMachine(ctrl.machine).then(function () {
                        $location.path("/rooms/");
                    });
                };

            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.machines')
    .component('machineList', {
        templateUrl: '/assets/app/facility/machines/machineList.template.html',
        bindings: {
            room: '<'
        },
        controller: ['Machines', '$translate', 'toast', function (Machines, $translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.showMachines = true;
            };

            vm.toggleShow = function () {
                vm.showMachines = !vm.showMachines
            };

            vm.countMachineAlerts = function () {
                if (!vm.room) return 0;
                return vm.room.examMachines.filter(function (m) {
                    return m.outOfService;
                }).length;
            };

            vm.countMachineNotices = function () {
                if (!vm.room) return 0;
                return vm.room.examMachines.filter(function (m) {
                    return !m.outOfService && m.statusComment;
                }).length;
            };

            vm.addNewMachine = function () {
                var newMachine = {};

                Machines.machine.insert({id: vm.room.id}, newMachine, function (machine) {
                    toast.info($translate.instant("sitnet_machine_added"));
                    vm.room.examMachines.push(machine);
                }, function (error) {
                    toast.error(error.data);
                });
            };

        }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular
    .module('app.facility.machines')
    .factory('Machines', ['$resource',
        function ($resource) {
            return {
                software: $resource("/app/softwares"),
                machineSoftware: $resource("/app/machine/:mid/software/:sid",
                    {
                        mid: "@mid",
                        sid: "@sid"
                    },
                    {
                        "toggle": {method: "POST"}
                    }),
                machine: $resource("/app/machines/:id",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET"},
                        "update": {method: "PUT"},
                        "insert": {method: "POST"},
                        "remove": {method: "DELETE"}
                    })
            };
        }
    ]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.rooms')
    .component('multiRoom', {
        templateUrl: '/assets/app/facility/rooms/multiRoom.template.html',
        controller: ['Room', 'toast', function (Room, toast) {
            var vm = this;

            vm.$onInit = function () {
                vm.week = Room.getWeek();
                loadRooms();
            };

            vm.addException = function (exception) {
                Room.addException(getRoomIds(), exception.exception).then(function () {
                    loadRooms();
                });
            };

            vm.deleteException = function (exception) {
                Room.deleteException(vm.rooms[0].id, exception.id).then(function () {
                    loadRooms();
                });
            };

            vm.addMultiRoomException = function () {
                Room.openExceptionDialog(vm.addException);
            };

            vm.updateWorkingHours = function () {
                Room.updateWorkingHours(vm.week, getRoomIds());
            };

            vm.massEditedRoomFilter = function (room) {
                return room.calendarExceptionEvents.some(function (e) {
                    return e.massEdited;
                });
            };

            vm.massEditedExceptionFilter = function (exception) {
                return exception.massEdited;
            };

            function loadRooms() {
                Room.rooms.query(
                    function (rooms) {
                        vm.rooms = rooms;
                        vm.roomIds = getRoomIds();
                    }, function (error) {
                        toast.error(error.data);
                    }
                );
            }

            function getRoomIds() {
                return vm.rooms.map(function (room) {
                    return room.id;
                });
            }
        }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.rooms')
    .component('room', {
        templateUrl: '/assets/app/facility/rooms/room.template.html',
        controller: ['$translate', '$scope', '$rootScope', '$route', '$location', '$uibModal', '$routeParams', '$http',
            'dialogs', 'Room', 'SettingsResource', 'InteroperabilityResource', 'DateTime', 'EXAM_CONF', 'toast',
            function ($translate, $scope, $rootScope, $route, $location, $modal, $routeParams, $http, dialogs, Room, SettingsRes,
                      InteroperabilityRes, DateTime, EXAM_CONF, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.week = Room.getWeek();
                    vm.showName = true;
                    SettingsRes.iop.get(function(data) {
                        vm.isInteroperable = data.isInteroperable;
                    });

                    Room.rooms.get({id: $routeParams.id},
                        function (room) {
                            room.availableForExternals = room.externalRef !== null;
                            vm.room = room;
                            if (!Room.isAnyExamMachines(vm.room)) {
                                toast.warning($translate.instant('sitnet_room_has_no_machines_yet'));
                            }
                            vm.room.calendarExceptionEvents.forEach(function (event) {
                                Room.formatExceptionEvent(event);
                            });
                            vm.room.defaultWorkingHours.forEach(function (daySlot) {
                                var timeSlots = slotToTimes(daySlot);
                                setSelected(daySlot.weekday, timeSlots);
                            });
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.updateWorkingHours = function () {
                    Room.updateWorkingHours(vm.week, [vm.room.id]);
                };

                vm.addException = function (exception) {
                    Room.addException([vm.room.id], exception).then(function (data) {
                        Room.formatExceptionEvent(data);
                        vm.room.calendarExceptionEvents.push(data);
                    });
                };

                vm.deleteException = function (exception) {
                    Room.deleteException(vm.room.id, exception.id).then(function () {
                        remove(vm.room.calendarExceptionEvents, exception);
                    })
                };

                vm.disableRoom = function () {
                    Room.disableRoom(vm.room);
                };

                vm.enableRoom = function () {
                    Room.enableRoom(vm.room);
                };

                vm.updateRoom = function () {
                    Room.rooms.update(vm.room,
                        function () {
                            toast.info($translate.instant('sitnet_room_updated'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.saveRoom = function () {
                    if (!Room.isSomethingSelected(vm.week)) {
                        toast.error($translate.instant('sitnet_room_must_have_default_opening_hours'));
                        return;
                    }

                    if (!Room.isAnyExamMachines(vm.room))
                        toast.error($translate.instant("sitnet_dont_forget_to_add_machines") + " " + vm.room.name);

                    Room.rooms.update(vm.room,
                        function () {
                            toast.info($translate.instant("sitnet_room_saved"));
                            $location.path("/rooms/");
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.updateInteroperability = function() {
                    InteroperabilityRes.facility.update(vm.room, function(data) {
                        vm.room.externalRef = data.externalRef;
                        vm.room.availableForExternals = data.externalRef !== null;
                    });
                };

                function remove(arr, item) {
                    var index = arr.indexOf(item);
                    arr.splice(index, 1);
                }

                function setSelected(day, slots) {
                    for (var i = 0; i < slots.length; ++i) {
                        if (vm.week[day][slots[i]]) {
                            vm.week[day][slots[i]].type = 'selected';
                        }
                    }
                }

                function slotToTimes(slot) {
                    var arr = [];
                    var startKey = moment(slot.startTime).format("H:mm");
                    var endKey = moment(slot.endTime).format("H:mm");
                    var times = Room.getTimes();
                    var start = startKey === '0:00' ? 0 : times.indexOf(startKey);
                    for (var i = start; i < times.length; i++) {
                        if (times[i] === endKey) {
                            break;
                        }
                        arr.push(i);
                    }
                    return arr;
                }

            }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.rooms')
    .service('Room', ['$resource', '$translate', '$route', 'dialogs', 'toast', '$q', '$uibModal',
        function ($resource, $translate, $route, dialogs, toast, $q, $modal) {

        var self = this;

        var week = {
            'MONDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'TUESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'WEDNESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'THURSDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'FRIDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'SATURDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'SUNDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            })
        };

        var times = ['']; // This is a dummy value for setting something for the table header

        for (var i = 0; i <= 24; ++i) {
            if (i > 0) {
                times.push(i + ':00');
            }
            if (i < 24) {
                times.push(i + ':30');
            }
        }

        self.rooms = $resource("/app/rooms/:id",
            {
                id: "@id"
            },
            {
                "update": {method: "PUT"},
                "inactivate": {method: "DELETE"},
                "activate": {method: "POST"}
            });

        self.addresses = $resource("/app/address/:id",
            {
                id: "@id"
            },
            {
                "update": {method: "PUT"}
            });

        self.workingHours = $resource("/app/workinghours/", null,
            {
                "update": {method: "PUT"}
            });
        self.examStartingHours = $resource("/app/startinghours/", null,
            {
                "update": {method: "PUT"}
            }
        );
        self.exceptions = $resource("/app/exception",
            {},
            {
                "update": {method: "PUT"}
            });

        self.exception = $resource("/app/rooms/:roomId/exception/:exceptionId",
            {
                roomId: "@roomId",
                exceptionId: "@exceptionId"
            },
            {
                "remove": {method: "DELETE"}
            });

        self.draft = $resource("/app/draft/rooms");

        self.isAnyExamMachines = function (room) {
            return room.examMachines && room.examMachines.length > 0;
        };

        self.isSomethingSelected = function (week) {
            for (var day in week) {
                if (week.hasOwnProperty(day)) {
                    if (!self.isEmpty(week, day)) {
                        return true;
                    }
                }
            }
            return false;
        };

        self.isEmpty = function (week, day) {
            for (var i = 0; i < week[day].length; ++i) {
                if (week[day][i].type !== '') {
                    return false;
                }
            }
            return true;
        };

        self.getTimes = function () {
            return angular.copy(times);
        };

        self.getWeek = function () {
            return angular.copy(week);
        };

        self.disableRoom = function (room) {
            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_room_inactivation'));
            dialog.result.then(function () {
                self.rooms.inactivate({id: room.id},
                    function () {
                        toast.info($translate.instant('sitnet_room_inactivated'));
                        $route.reload();
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );
            });
        };

        self.enableRoom = function (room) {
            self.rooms.activate({id: room.id},
                function () {
                    toast.info($translate.instant('sitnet_room_activated'));
                    $route.reload();
                },
                function (error) {
                    toast.error(error.data);
                }
            );

        };

        self.addException = function (ids, exception) {
            var d = $q.defer();
            self.exceptions.update({roomIds: ids, exception: exception},
                function (data) {
                    toast.info($translate.instant('sitnet_exception_time_added'));
                    d.resolve(data);
                },
                function (error) {
                    toast.error(error.data);
                    d.reject();
                }
            );
            return d.promise;
        };

        self.openExceptionDialog = function (callBack) {
            var modalInstance = $modal.open({
                component: 'exception',
                backdrop: 'static',
                keyboard: true
            });
            modalInstance.result.then(function (exception) {
                callBack({exception: exception});
            });
        };

        self.deleteException = function (roomId, exceptionId) {
            var d = $q.defer();
            self.exception.remove({roomId: roomId, exceptionId: exceptionId},
                function () {
                    toast.info($translate.instant('sitnet_exception_time_removed'));
                    d.resolve();
                },
                function (error) {
                    toast.error(error.data);
                    d.reject();
                }
            );
            return d.promise;
        };

        self.formatExceptionEvent = function(event) {
                event.startDate = moment(event.startDate).format();
                event.endDate = moment(event.endDate).format();
        };

        self.updateStartingHours = function (hours, offset, roomIds) {
            var d = $q.defer();
            var selected = hours.filter(function (hour) {
                return hour.selected;
            }).map(function (hour) {
                return formatTime(hour.startingHour);
            });
            var data = {hours: selected, offset: offset};
            data.roomIds = roomIds;

            self.examStartingHours.update(data,
                function () {
                    toast.info($translate.instant('sitnet_exam_starting_hours_updated'));
                    d.resolve();
                },
                function (error) {
                    toast.error(error.data);
                    d.reject();
                }
            );
            return d.promise;
        };

        self.updateWorkingHours = function (week, ids) {
            var data = {};
            var workingHours = [];
            var times = self.getTimes();
            for (var day in week) {
                if (week.hasOwnProperty(day)) {
                    var blocks = blocksForDay(week, day);
                    var weekdayBlocks = {'weekday': day, 'blocks': []};
                    for (var i = 0; i < blocks.length; ++i) {
                        var block = blocks[i];
                        var start = formatTime(times[block[0]] || "0:00");
                        var end = formatTime(times[block[block.length - 1] + 1]);
                        weekdayBlocks.blocks.push({'start': start, 'end': end});
                    }
                    workingHours.push(weekdayBlocks);
                }
            }
            data.workingHours = workingHours;
            data.roomIds = ids;
            self.workingHours.update(data,
                function () {
                    toast.info($translate.instant('sitnet_default_opening_hours_updated'));
                },
                function (error) {
                    toast.error(error.data);
                }
            );
        };

        function blocksForDay(week, day) {
            var blocks = [];
            var tmp = [];
            for (var i = 0; i < week[day].length; ++i) {
                if (week[day][i].type) {
                    tmp.push(i);
                    if (i === week[day].length - 1) {
                        blocks.push(tmp);
                        tmp = [];
                    }
                } else if (tmp.length > 0) {
                    blocks.push(tmp);
                    tmp = [];
                }
            }
            return blocks;
        }

        function formatTime(time) {
            var hours = moment().isDST() ? 1 : 0;
            return moment()
                .set('hour', parseInt(time.split(':')[0]) + hours)
                .set('minute', time.split(':')[1])
                .format("DD.MM.YYYY HH:mmZZ");
        }

    }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.rooms')
    .component('roomList', {
        templateUrl: '/assets/app/facility/rooms/roomList.template.html',
        controller: ['$routeParams', 'Session', '$location', 'Room', '$translate', 'toast',
            function ($routeParams, Session, $location, Room,  $translate, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();

                    if (vm.user.isAdmin) {
                        if (!$routeParams.id) {
                            Room.rooms.query(function (rooms) {
                                vm.times = Room.getTimes();
                                vm.rooms = rooms;
                                angular.forEach(vm.rooms, function (room) {
                                    room.examMachines = room.examMachines.filter(function (machine) {
                                        return !machine.archived;
                                    });
                                });
                            });
                        }
                    }
                    else {
                        $location.path("/");
                    }
                };

                vm.disableRoom = function (room) {
                    Room.disableRoom(room);
                };

                vm.enableRoom = function (room) {
                    Room.enableRoom(room);
                };

                // Called when create exam button is clicked
                vm.createExamRoom = function () {
                    Room.draft.get(
                        function (room) {
                            toast.info($translate.instant("sitnet_room_draft_created"));
                            $location.path("/rooms/" + room.id);
                        }, function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.editMultipleRooms = function () {
                    $location.path("/rooms_edit/edit_multiple");
                };

                vm.isArchived = function (machine) {
                    return machine.isArchived() === false;
                };

                vm.displayAddress = function (address) {

                    if (!address || (!address.street && !address.city && !address.zip)) return "N/A";
                    var street = address.street ? address.street + ", " : "";
                    var city = (address.city || "").toUpperCase();
                    return street + address.zip + " " + city;
                };

            }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.schedule')
    .component('exception', {
        templateUrl: '/assets/app/facility/schedule/exception.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', 'toast', function ($translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                var now = new Date();
                now.setMinutes(0);
                now.setSeconds(0);
                now.setMilliseconds(0);
                vm.dateOptions = {
                    'starting-day': 1
                };
                vm.dateFormat = 'dd.MM.yyyy';

                vm.exception = {startDate: now, endDate: angular.copy(now), outOfService: true};
            };

            vm.ok = function () {
                var start = moment(vm.exception.startDate);
                var end = moment(vm.exception.endDate);
                if (end <= start) {
                    toast.error($translate.instant('sitnet_endtime_before_starttime'));
                    return;
                }
                vm.close({
                    $value: {
                        "startDate": start,
                        "endDate": end,
                        "outOfService": vm.exception.outOfService
                    }
                });
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };
        }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.schedule')
    .component('exceptionList', {
        templateUrl: '/assets/app/facility/schedule/exceptionList.template.html',
        bindings: {
            room: '<',
            hideButton: '<',
            hideTitle: '<',
            filter: '<',
            onCreate: '&',
            onDelete: '&'
        },
        controller: ['Room',
            function (Room) {

                var vm = this;

                vm.$onInit = function () {
                };

                vm.formatDate = function (exception) {
                    var fmt = 'DD.MM.YYYY HH:mm';
                    var start = moment(exception.startDate);
                    var end = moment(exception.endDate);
                    return start.format(fmt) + ' - ' + end.format(fmt);
                };

                vm.addException = function () {
                    Room.openExceptionDialog(vm.onCreate);
                };

                vm.deleteException = function (exception) {
                    vm.onDelete({exception: exception});
                };
            }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.schedule')
    .component('openHours', {
        templateUrl: '/assets/app/facility/schedule/openHours.template.html',
        bindings: {
            week: '<',
            onSelect: '&'
        },
        controller: ['Room', 'DateTime', 'toast', '$translate', '$scope',
            function (Room, DateTime, toast, $translate, $scope) {

            var vm = this;

            vm.$onInit = function () {
                vm.weekdayNames = DateTime.getWeekdayNames();
                vm.times = Room.getTimes();
            };

            vm.timeRange = function () {
                return Array.apply(null, new Array(vm.times.length - 1)).map(function (x, i) {
                    return i;
                });
            };

            vm.getWeekdays = function () {
                return Object.keys(vm.week);
            };

            vm.getType = function (day, time) {
                return vm.week[day][time].type;
            };

            vm.calculateTime = function (index) {
                return (vm.times[index] || "0:00") + " - " + vm.times[index + 1];
            };

            vm.selectSlot = function (day, time) {
                var i = 0, status = vm.week[day][time].type;
                if (status === 'accepted') { // clear selection
                    vm.week[day][time].type = '';
                    return;
                }
                if (status === 'selected') { // mark everything hereafter as free until next block
                    for (i = 0; i < vm.week[day].length; ++i) {
                        if (i >= time) {
                            if (vm.week[day][i].type === 'selected') {
                                vm.week[day][i].type = '';
                            } else {
                                break;
                            }
                        }
                    }
                }
                else {
                    // check if something is accepted yet
                    var accepted;
                    for (i = 0; i < vm.week[day].length; ++i) {
                        if (vm.week[day][i].type === 'accepted') {
                            accepted = i;
                            break;
                        }
                    }
                    if (accepted >= 0) { // mark everything between accepted and this as selected
                        if (accepted < time) {
                            for (i = accepted; i <= time; ++i) {
                                vm.week[day][i].type = 'selected';
                            }
                        } else {
                            for (i = time; i <= accepted; ++i) {
                                vm.week[day][i].type = 'selected';
                            }
                        }
                    } else {
                        vm.week[day][time].type = 'accepted'; // mark beginning
                    }
                }

                vm.onSelect();
            };

            $scope.$on('$localeChangeSuccess', function () {
                vm.weekdayNames = DateTime.getWeekdayNames();
            });
        }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.schedule')
    .component('startingTime', {
        templateUrl: '/assets/app/facility/schedule/startingTime.template.html',
        bindings: {
            roomIds: '<',
            startingHours: '<'
        },
        controller: ['Room', function (Room) {
            var vm = this;

            vm.$onInit = function () {
                vm.examStartingHours = Array.apply(null, new Array(24)).map(function (x, i) {
                    return {startingHour: i + ":00", selected: true};
                });
                if (vm.startingHours && vm.startingHours.length > 0) {
                    var startingHours = vm.startingHours.map(function (hour) {
                        return moment(hour.startingHour);
                    });
                    vm.examStartingHourOffset = startingHours[0].minute();
                    startingHours = startingHours.map(function (hour) {
                        return hour.format("H:mm");
                    });
                    vm.setStartingHourOffset();
                    vm.examStartingHours.forEach(function (hour) {
                        hour.selected = startingHours.indexOf(hour.startingHour) !== -1;
                    });
                }
            };

            vm.updateStartingHours = function () {
                Room.updateStartingHours(vm.examStartingHours, vm.examStartingHourOffset, vm.roomIds)
                    .then(function () {
                        if (vm.startingHours) {
                            vm.startingHours = vm.examStartingHours;
                        }
                    });
            };

            vm.toggleAllExamStartingHours = function () {
                var anySelected = vm.examStartingHours.some(function (hours) {
                    return hours.selected;
                });
                vm.examStartingHours.forEach(function (hours) {
                    hours.selected = !anySelected;
                });
            };

            vm.setStartingHourOffset = function () {
                vm.examStartingHourOffset = vm.examStartingHourOffset || 0;
                vm.examStartingHours.forEach(function (hours) {
                    hours.startingHour = hours.startingHour.split(':')[0] + ':' + zeropad(vm.examStartingHourOffset);
                });
            };

            vm.anyStartingHoursSelected = function () {
                return vm.examStartingHours.some(function (hours) {
                    return hours.selected;
                });
            };

            function zeropad(n) {
                n += '';
                return n.length > 1 ? n : '0' + n;
            }
        }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

(function () {
    'use strict';
    angular.module('app.iop')
        .factory("InteroperabilityResource", ['$resource', function ($resource) {
            return {
                facility: $resource("/integration/iop/facilities/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"}
                    }),
                facilities: $resource("/integration/iop/facilities"),
                organisations: $resource("/integration/iop/organisations"),
                slots: $resource("/integration/iop/calendar/:examId/:roomRef", {examId: "@examId", roomRef: "@roomRef"}),
                reservations: $resource("/integration/iop/reservations/external", {}, {"create": {method: "POST"}}),
                reservation: $resource("/integration/iop/reservations/external/:ref", {ref: "@ref"}, {"remove": {method: "DELETE"}})
            };
        }]);
}());
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.maturity')
    .component('languageInspections', {
        templateUrl: '/assets/app/maturity/languageInspections.template.html',
        controller: ['$translate', 'LanguageInspections', 'Session', 'EXAM_CONF', 'lodash',
            function ($translate, LanguageInspections, Session, EXAM_CONF, lodash) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.ongoingInspections = [];
                    vm.processedInspections = [];
                    vm.filters = {};
                    vm.templates = {
                        ongoing: EXAM_CONF.TEMPLATES_PATH + 'maturity/templates/inspection_under_review.html',
                        processed: EXAM_CONF.TEMPLATES_PATH + 'maturity/templates/inspection_reviewed.html'
                    };
                    vm.sorting = {
                        ongoing: {
                            predicate: 'arrived',
                            reverse: false
                        },
                        processed: {
                            predicate: 'finishedAt',
                            reverse: false
                        }
                    };
                    query();
                };

                vm.startDateChanged = function (date) {
                    vm.startDate = date;
                    query();
                };

                vm.endDateChanged = function (date) {
                    vm.endDate = date;
                    query();
                };

                var query = function () {
                    var params = {};
                    var tzOffset = new Date().getTimezoneOffset() * 60000;
                    if (vm.startDate) {
                        params.start = Date.parse(vm.startDate) + tzOffset;
                    }
                    if (vm.endDate) {
                        params.end = Date.parse(moment(vm.endDate).add(1, 'days'));
                    }
                    var refreshAll = lodash.isEmpty(params);
                    LanguageInspections.query(refreshAll ? undefined : params).then(
                        function (inspections) {
                            inspections.forEach(function (i) {
                                i.ownerAggregate = i.exam.parent.examOwners.map(function (o) {
                                    return o.firstName + ' ' + o.lastName;
                                }).join(', ');
                                i.studentName = i.exam.creator ? i.exam.creator.firstName + ' ' + i.exam.creator.lastName : '';
                                i.studentNameAggregate = i.exam.creator ? i.exam.creator.lastName + ' ' + i.exam.creator.firstName : '';
                                i.inspectorName = i.modifier ? i.modifier.firstName + ' ' + i.modifier.lastName : '';
                                i.inspectorNameAggregate = i.modifier ? i.modifier.lastName + ' ' + i.modifier.firstName : '';
                            });
                            if (refreshAll) {
                                vm.ongoingInspections = inspections.filter(function (i) {
                                    return !i.finishedAt;
                                });
                            }
                            vm.processedInspections = inspections.filter(function (i) {
                                return i.finishedAt;
                            });
                        });
                };


                vm.assignInspection = function (inspection) {
                    LanguageInspections.assignInspection(inspection);
                };

                vm.showStatement = function (statement) {
                    LanguageInspections.showStatement(statement);
                };

                vm.getOngoingInspectionsDetails = function () {
                    var amount = vm.ongoingInspections.length.toString();
                    return $translate.instant('sitnet_ongoing_language_inspections_detail').replace('{0}', amount);
                };

                vm.getProcessedInspectionsDetails = function () {
                    var amount = vm.processedInspections.length.toString();
                    var year = moment().format('YYYY');
                    return $translate.instant('sitnet_processed_language_inspections_detail').replace('{0}', amount)
                        .replace('{1}', year);
                };

            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .service('LanguageInspections', ['$resource', '$location', '$uibModal', '$translate', 'dialogs', 'EXAM_CONF', 'toast',
        function ($resource, $location, $modal, $translate, dialogs, EXAM_CONF, toast) {

            var self = this;

            var inspectionsApi = $resource('/app/inspections');
            var assignmentApi = $resource('/app/inspection/:id', {id: '@id'}, {'update': {method: 'PUT'}});

            self.query = function (params) {
                return inspectionsApi.query(params).$promise;
            };

            self.showStatement = function (statement) {
                var modalController = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                    $scope.statement = statement.comment;
                    $scope.ok = function () {
                        $modalInstance.close('Accepted');
                    };
                }];

                $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'maturity/dialogs/inspection_statement.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: modalController,
                    resolve: {
                        statement: function () {
                            return statement.comment;
                        }
                    }
                });
            };

            self.assignInspection = function (inspection) {
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                    $translate.instant('sitnet_confirm_assign_inspection'));
                dialog.result.then(function () {
                    assignmentApi.update({id: inspection.id}, function () {
                        $location.path('assessments/' + inspection.exam.id);
                    }, function (err) {
                        toast.error(err);
                    });
                });
            };


        }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.maturity')
    .component('maturityReporting', {
        templateUrl: '/assets/app/maturity/reporting/maturityReporting.template.html',
        controller: ['$translate', 'LanguageInspections', 'Session', 'EXAM_CONF',
            function ($translate, LanguageInspections, Session, EXAM_CONF) {

                var vm = this;

                vm.$onInit = function () {
                    vm.selection = {opened: false, month: new Date()};
                    vm.query();
                };

                vm.printReport = function () {
                    setTimeout(function () {
                        window.print();
                    }, 500);
                };

                vm.open = function ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    vm.selection.opened = true;
                };

                vm.query = function () {
                    var params = {};
                    if (vm.selection.month) {
                        params.month = vm.selection.month;
                    }
                    LanguageInspections.query(params).then(
                        function (inspections) {
                            vm.processedInspections = inspections.filter(function (i) {
                                return i.finishedAt;
                            });
                        });
                };

                vm.showStatement = function (statement) {
                    LanguageInspections.showStatement(statement);
                };

            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

angular.module('app.navigation')
    .component("navigation", {
        templateUrl: '/assets/app/navigation/navigation.template.html',
        controller: ['$rootScope', '$location', 'Session', 'Navigation',
            function ($rootScope, $location, Session, Navigation) {

                var ctrl = this;

                ctrl.isActive = function (link) {
                    return link.href === $location.path();
                };

                ctrl.canDisplayFullNavbar = function () {
                    return window.matchMedia("(min-width: 600px)").matches;
                };

                ctrl.openMenu = function () {
                    ctrl.mobileMenuOpen = !ctrl.mobileMenuOpen;
                };

                var links = function () {
                    ctrl.user = Session.getUser();

                    if (!ctrl.user || ctrl.user.isLoggedOut) {
                        ctrl.loggedOut = true;
                        delete ctrl.appVersion;
                        return [];
                    }

                    var admin = ctrl.user.isAdmin || false;
                    var student = ctrl.user.isStudent || false;
                    var teacher = ctrl.user.isTeacher || false;
                    var languageInspector = ctrl.user.isTeacher && ctrl.user.isLanguageInspector;

                    if (admin) {
                        Navigation.appVersion.get(function (data) {
                            ctrl.appVersion = data.appVersion;
                        });
                    }

                    // Do not show if waiting for exam to begin
                    var hideDashboard = /\/student\/waiting-room|wrong-machine|wrong-room/.test($location.path());

                    // Change the menu item title if student
                    var nameForDashboard = "sitnet_dashboard";
                    if (student) {
                        nameForDashboard = "sitnet_user_enrolled_exams_title";
                    }

                    return [
                        {
                            href: "/",
                            visible: !hideDashboard,
                            class: "fa-home",
                            name: nameForDashboard,
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/inspections",
                            visible: (languageInspector || admin),
                            class: 'fa-language',
                            name: "sitnet_language_inspections",
                            icon_svg: "icon_language_inspection.svg",
                            icon_png: "icon_language_inspection.png"
                        },
                        {
                            href: "/exams",
                            visible: (admin),
                            class: "fa-paste",
                            name: "sitnet_exams",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/printouts",
                            visible: (admin),
                            class: "fa-print",
                            name: "sitnet_printout_exams"
                            //icon_svg: "icon_enrols.svg",
                            //icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/rooms",
                            visible: (admin),
                            class: "fa-building-o",
                            name: "sitnet_exam_rooms",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/reports",
                            visible: (admin),
                            class: "fa-files-o",
                            name: "sitnet_reports",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/statistics",
                            visible: (admin),
                            class: "fa-line-chart",
                            name: "sitnet_statistics",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/settings",
                            visible: (admin),
                            class: "fa-wrench",
                            name: "sitnet_settings",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/users",
                            visible: (admin),
                            class: "fa-users",
                            name: "sitnet_users",
                            icon_svg: "icon_reservations.svg",
                            icon_png: "icon_reservations.png"
                        },
                        {
                            href: "/questions",
                            visible: (admin || teacher),
                            class: "fa-list-ol",
                            name: "sitnet_library_new",
                            icon_svg: "icon_pencil.svg",
                            icon_png: "icon_pencil.png"
                        },
                        {
                            href: "/reservations",
                            visible: (teacher),
                            class: "fa-clock-o",
                            name: "sitnet_reservations_new",
                            icon_svg: "icon_reservations.svg",
                            icon_png: "icon_reservations.png"
                        },
                        {
                            href: "/student/exams",
                            visible: (student && !hideDashboard),
                            class: "fa-search",
                            name: "sitnet_exams",
                            sub: [],
                            icon_svg: "icon_exams.svg",
                            icon_png: "icon_exams.png"
                        },
                        {
                            href: "/student/participations",
                            visible: (student && !hideDashboard),
                            class: "fa-search",
                            name: "sitnet_exam_responses",
                            sub: [],
                            icon_svg: "icon_finished.svg",
                            icon_png: "icon_finished.png"
                        },
                        {
                            href: "/logout",
                            visible: (student || admin || teacher),
                            class: "fa-sign-out",
                            name: "sitnet_logout",
                            icon_svg: "icon_logout.svg",
                            icon_png: "icon_logout.png"

                        },
                        {
                            href: "/login",
                            visible: !ctrl.user,
                            class: "fa-sign-in",
                            name: "sitnet_login",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        }
                    ];
                };

                $rootScope.$on('userUpdated', function () {
                    ctrl.links = links();
                });

                $rootScope.$on('upcomingExam', function () {
                    ctrl.links = links();
                });

                $rootScope.$on('wrongLocation', function () {
                    ctrl.links = links();
                });

                ctrl.switchLanguage = function (key) {
                    Session.switchLanguage(key);
                };

                ctrl.$onInit = function() {
                    ctrl.links = links();
                };


            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular
    .module('app.navigation')
    .factory('Navigation', ['$resource',
        function ($resource) {
            return {
                appVersion: $resource("/app/settings/appVersion")
            }
        }
    ]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('question', {
        template:
        '<div id="dashboard">\n' +
        '    <div class="top-row">\n' +
        '        <div class="col-md-12">\n' +
        '            <div class="student-details-title-wrap">\n' +
        '                <div class="student-enroll-title-wrap">\n' +
        '                    <div ng-if="!$ctrl.newQuestion" class="student-enroll-title">{{\'sitnet_questions_edit\' | translate}}</div>\n' +
        '                    <div ng-if="$ctrl.newQuestion" class="student-enroll-title">{{\'sitnet_toolbar_new_question\' | translate}}</div>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '    <div class="marl50 marr50">\n' +
        '        <!-- Question body //-->\n' +
        '        <div class="col-md-12 question-border padl40 padr40">\n' +
        '            <form role="form" class="form-horizontal" name="questionForm" novalidate>\n' +
        '                <question-body ng-if="$ctrl.question" question="$ctrl.question" ' +
        '                       current-owners="$ctrl.currentOwners" lottery-on="$ctrl.lotteryOn"></question-body>\n' +
        '            </form>\n' +
        '            <!-- buttons -->\n' +
        '            <div class="mart20">\n' +
        '                <div class="question-cancel">\n' +
        '                    <button ng-disabled="!questionForm.$valid" ng-click="$ctrl.saveQuestion()"\n' +
        '                            type="submit" class="btn btn-success bigbutton">{{\'sitnet_save\' | translate}}\n' +
        '                    </button>\n' +
        '                </div>\n' +
        '                <div class="question-cancel marr20">\n' +
        '                    <button ng-click="$ctrl.cancel()" type="submit" class="btn btn-cancel pull-right bigbutton">\n' +
        '                        {{\'sitnet_button_cancel\' | translate}}\n' +
        '                    </button>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n',
        bindings: {
            newQuestion: '<',
            questionId: '<',
            lotteryOn: '<',
            onSave: '&?',
            onCancel: '&?'
        },
        controller: ['$routeParams', '$scope', '$location', '$translate', 'dialogs', 'Question', 'toast',
            function ($routeParams, $scope, $location, $translate, dialogs, Question, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.currentOwners = [];
                    if (vm.newQuestion) {
                        vm.question = Question.getQuestionDraft();
                        vm.currentOwners = angular.copy(vm.question.questionOwners);
                    } else {
                        Question.questionsApi.get({id: vm.questionId || $routeParams.id},
                            function (question) {
                                vm.question = question;
                                vm.currentOwners = angular.copy(vm.question.questionOwners);
                                window.onbeforeunload = function () {
                                    return $translate.instant('sitnet_unsaved_data_may_be_lost');
                                };
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    }
                };

                vm.saveQuestion = function () {
                    vm.question.questionOwners = vm.currentOwners;
                    if (vm.newQuestion) {
                        Question.createQuestion(vm.question).then(
                            function (question) {
                                clearListeners();
                                if (vm.onSave) {
                                    vm.onSave({question: question});
                                } else {
                                    $location.path('/questions');
                                }
                            }, function (error) {
                                toast.error(error.data);
                            });
                    } else {
                        Question.updateQuestion(vm.question, true).then(
                            function () {
                                clearListeners();
                                if (vm.onSave) {
                                    vm.onSave({question: vm.question})
                                } else {
                                    $location.path('/questions');
                                }
                            }, function (error) {
                                toast.error(error.data);
                            });
                    }
                };

                vm.cancel = function () {
                    toast.info($translate.instant('sitnet_canceled'));
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    clearListeners();
                    if (vm.onCancel) {
                        vm.onCancel();
                    } else {
                        $location.path('/questions');
                    }
                };

                var routingWatcher = $scope.$on('$locationChangeStart', function (event, newUrl) {
                    if (window.onbeforeunload) {
                        event.preventDefault();
                        // we got changes in the model, ask confirmation
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm_exit'),
                            $translate.instant('sitnet_unsaved_question_data'));
                        dialog.result.then(function (data) {
                            if (data.toString() === 'yes') {
                                // ok to reroute
                                clearListeners();
                                $location.path(newUrl.substring($location.absUrl().length - $location.url().length));
                            }
                        });
                    } else {
                        clearListeners();
                    }
                });

                var clearListeners = function () {
                    window.onbeforeunload = null;
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    routingWatcher();
                };

            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('questionBody', {
        templateUrl: '/assets/app/question/basequestion/questionBody.template.html',
        bindings: {
            question: '<',
            currentOwners: '<',
            lotteryOn: '<'
        },
        controller: ['$scope', '$translate', 'Session', 'Attachment', 'UserRes', 'limitToFilter', 'Question', 'EXAM_CONF', 'toast',
            function ($scope, $translate, Session, Attachment, UserRes, limitToFilter, Question, EXAM_CONF, toast) {

                var essayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/essay_question.html';
                var multiChoiceQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/multiple_choice_question.html';


                var vm = this;

                var init = function () {
                    // TODO: move these to subcomponents
                    if (vm.question.type === 'WeightedMultipleChoiceQuestion' || vm.question.defaultEvaluationType === 'Selection') {
                        delete vm.question.defaultMaxScore; // will screw up validation otherwise
                    }
                    var sections = vm.question.examSectionQuestions.map(function (esq) {
                        return esq.examSection;
                    });
                    var examNames = sections.map(function (s) {
                        if (s.exam.state === 'PUBLISHED') {
                            vm.isInPublishedExam = true;
                        }
                        return s.exam.name;
                    });
                    var sectionNames = sections.map(function (s) {
                        return s.name;
                    });
                    // remove duplicates
                    vm.examNames = examNames.filter(function (n, pos) {
                        return examNames.indexOf(n) === pos;
                    });
                    vm.sectionNames = sectionNames.filter(function (n, pos) {
                        return sectionNames.indexOf(n) === pos;
                    });

                    vm.newOwner = {id: null, name: null};
                    vm.newType = {};
                    setQuestionTemplates();
                };

                vm.$onInit = function () {
                    vm.questionTypes = [
                        {'type': 'essay', 'name': 'sitnet_toolbar_essay_question'},
                        {'type': 'cloze', 'name': 'sitnet_toolbar_cloze_test_question'},
                        {'type': 'multichoice', 'name': 'sitnet_toolbar_multiplechoice_question'},
                        {'type': 'weighted', 'name': 'sitnet_toolbar_weighted_multiplechoice_question'}];

                    init();
                };

                function setQuestionTemplates() {
                    switch (vm.question.type) {
                        case 'EssayQuestion':
                            vm.questionTemplate = essayQuestionTemplate;
                            vm.question.defaultEvaluationType = vm.question.defaultEvaluationType || 'Points';
                            break;
                        case 'ClozeTestQuestion':
                            // No template needed
                            break;
                        case 'MultipleChoiceQuestion':
                            vm.questionTemplate = multiChoiceQuestionTemplate;
                            vm.newOptionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/option.html';
                            break;
                        case 'WeightedMultipleChoiceQuestion':
                            vm.questionTemplate = multiChoiceQuestionTemplate;
                            vm.newOptionTemplate = EXAM_CONF.TEMPLATES_PATH + 'question/basequestion/templates/weighted_option.html';
                            break;
                    }
                }

                vm.setQuestionType = function () {
                    vm.question.type = Question.getQuestionType(vm.newType.type);
                    init();
                };

                vm.showWarning = function () {
                    return vm.examNames.length > 1;
                };

                vm.questionOwners = function (filter, criteria) {
                    var data = {
                        role: 'TEACHER',
                        q: criteria
                    };
                    return UserRes.filterOwnersByQuestion.query(data).$promise.then(
                        function (names) {
                            return limitToFilter(
                                names.filter(function (n) {
                                    return vm.currentOwners.map(function (qo) {
                                        return qo.id;
                                    }).indexOf(n.id) === -1;
                                }), 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.setQuestionOwner = function ($item, $model, $label) {

                    // Using template to store the selected user
                    vm.newOwnerTemplate = $item;
                };

                vm.addQuestionOwner = function () {
                    if (vm.newOwnerTemplate && vm.newOwnerTemplate.id) {
                        vm.currentOwners.push(vm.newOwnerTemplate);

                        // nullify input field and template
                        vm.newOwner.name = null;
                        vm.newOwnerTemplate = null;
                    }
                };

                vm.removeOwnerDisabled = function (user) {
                    if (vm.currentOwners.length === 1) {
                        // disallow clearing the owners
                        return true;
                    }
                    return vm.question.state === 'NEW' && Session.getUser().id === user.id;
                };

                vm.removeOwner = function (user) {
                    if (vm.removeOwnerDisabled(user)) {
                        return;
                    }
                    var i = vm.currentOwners.indexOf(user);
                    if (i >= 0) {
                        vm.currentOwners.splice(i, 1);
                    }
                };

                vm.selectFile = function () {
                    Attachment.selectFile(true).then(function (data) {
                        data.attachmentFile.modified = true;
                        vm.question.attachment = data.attachmentFile;
                    });
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.question);
                };

                vm.removeQuestionAttachment = function () {
                    Attachment.removeQuestionAttachment(vm.question);
                };

                vm.getFileSize = function () {
                    return Attachment.getFileSize(vm.question.attachment);
                };

                vm.updateEvaluationType = function () {
                    if (vm.question.defaultEvaluationType === 'Selection') {
                        delete vm.question.defaultMaxScore;
                    }
                };

                vm.removeTag = function (tag) {
                    vm.question.tags.splice(vm.question.tags.indexOf(tag), 1);
                };

                vm.isUserAllowedToModifyOwners = function () {
                    var user = Session.getUser();
                    return vm.question.questionOwners && (user.isAdmin ||
                        vm.question.questionOwners.map(function (o) {
                            return o.id;
                        }).indexOf(user.id) > -1
                    );
                };

                vm.estimateCharacters = function () {
                    return (vm.question.defaultExpectedWordCount || 0) * 8;
                };

                vm.calculateDefaultMaxPoints = function () {
                    return Question.calculateDefaultMaxPoints(vm.question);
                };

                vm.addNewOption = function () {
                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                        return;
                    }
                    vm.question.options.push({correctOption: false});
                };

                vm.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                vm.removeOption = function (option) {
                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                    } else {
                        removeOption(option);
                    }
                };

                vm.correctAnswerToggled = function (option) {
                    Question.toggleCorrectOption(option, vm.question.options);
                };

                vm.optionDisabled = function (option) {
                    return option.correctOption === true;
                };

                var removeOption = function (selectedOption) {
                    var hasCorrectAnswer = vm.question.options.filter(function (o) {
                        return o.id !== selectedOption.id && (o.correctOption || o.defaultScore > 0);
                    }).length > 0;

                    // Either not published exam or correct answer exists
                    if (!vm.isInPublishedExam || hasCorrectAnswer) {
                        vm.question.options.splice(vm.question.options.indexOf(selectedOption), 1);
                    } else {
                        toast.error($translate.instant('sitnet_action_disabled_minimum_options'));
                    }
                };


            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('tagPicker', {
        template: '<div class="col-md-12 margin-20 padl0 padr0">\n' +
        '        <div class="col-md-3 exam-basic-title padl0">\n' +
        '            {{ \'sitnet_tag_question\' | translate}}\n' +
        '            <sup><img popover-placement="right" popover-trigger="\'mouseenter\'"\n' +
        '                      uib-popover="{{\'sitnet_question_tag_question_description\' | translate}}"\n' +
        '                      src="/assets/assets/images/icon_tooltip.svg" alt="exam"\n' +
        '                      onerror="this.onerror=null;this.src=\'../../../assets/assets/images/icon_tooltip.png\';"/></sup>\n' +
        '        </div>\n' +
        '        <div class="col-md-9 padr0">\n' +
        '            <input id="newTag" name="newTag" maxlength="30" lowercase\n' +
        '                   class="form-control"\n' +
        '                   ng-model="$ctrl.question.newTag"\n' +
        '                   uib-typeahead="t as t.name for t in $ctrl.getTags($viewValue)"\n' +
        '                   typeahead-on-select="$ctrl.onTagSelect($item)"\n' +
        '                   typeahead-min-length="2"/>\n' +
        '            <ul class="list-inline mart10">\n' +
        '                <li ng-repeat="tag in $ctrl.question.tags">{{tag.name}}\n' +
        '                    <button class="reviewer-remove"\n' +
        '                            popover-placement="top" popover-popup-delay="500"\n' +
        '                            popover-trigger="\'mouseenter\'"\n' +
        '                            uib-popover="{{ \'sitnet_remove\' | translate }}"\n' +
        '                            ng-click="$ctrl.removeTag(tag)"\n' +
        '                            title="{{\'sitnet_remove\' | translate}}">\n' +
        '                        <img src="/assets/assets/images/icon_remove.svg" alt="exam"\n' +
        '                             onerror="this.onerror=null;this.src=\'../../../assets/assets/images/icon_remove.png\';"/>\n' +
        '                    </button>\n' +
        '                </li>\n' +
        '            </ul>\n' +
        '        </div>\n' +
        '    </div>',
        bindings: {
            question: '<'
        }, controller: ['$resource', 'limitToFilter', 'toast',
            function ($resource, limitToFilter, toast) {

                var vm = this;

                vm.getTags = function (filter) {
                    return $resource("/app/tags").query({filter: filter}).$promise.then(
                        function (tags) {
                            if (filter) {
                                tags.unshift({id: 0, name: filter});
                            }
                            // filter out the ones already tagged for this question
                            var filtered = tags.filter(function (tag) {
                                return vm.question.tags.map(function (qtag) {
                                    return qtag.name;
                                }).indexOf(tag.name) === -1;
                            });
                            return limitToFilter(filtered, 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.onTagSelect = function (tag) {
                    vm.question.tags.push(tag);
                    delete vm.question.newTag;
                };

                vm.removeTag = function (tag) {
                    vm.question.tags.splice(vm.question.tags.indexOf(tag), 1);
                };

            }]
    });



;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('baseQuestionEditor', {
        template:
        '<div id="sitnet-dialog">\n' +
        '    <div class="modal-body">\n' +
        '        <question new-question="$ctrl.resolve.newQuestion" question-id="$ctrl.resolve.questionId" on-save="$ctrl.onSave(question)" on-cancel="$ctrl.cancel()"\n' +
        '                  lottery-on="$ctrl.resolve.lotteryOn"></question>\n' +
        '    </div>\n' +
        '    <div class="modal-footer">\n' +
        '    </div>\n' +
        '</div>',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope',
            function ($scope) {
                // This component is used for creating new exam questions and editing existing undistributed ones.

                var vm = this;

                vm.onSave = function (question) {
                    vm.close({
                        $value: {'question': question}
                    });
                };

                vm.cancel = function () {
                    vm.dismiss({$value: 'cancel'});
                };

                // Close modal if user clicked the back button and no changes made
                $scope.$on('$routeChangeStart', function () {
                    if (!window.onbeforeunload) {
                        vm.cancel();
                    }
                });

            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('examQuestion', {
        templateUrl: '/assets/app/question/examquestion/examQuestion.template.html',
        bindings: {
            examQuestion: '<',
            lotteryOn: '<',
            onSave: '&',
            onCancel: '&'
        },
        controller: ['$scope', '$translate', 'Attachment', 'Question', 'toast',
            function ($scope, $translate, Attachment, Question, toast) {
                // This component depicts a distributed exam question

                var vm = this;

                var init = function () {
                    Question.questionsApi.get({id: vm.examQuestion.question.id}, function (data) {
                        vm.question = data;
                        var sections = vm.question.examSectionQuestions.map(function (esq) {
                            return esq.examSection;
                        });
                        var examNames = sections.map(function (s) {
                            if (s.exam.state === 'PUBLISHED') {
                                vm.isInPublishedExam = true;
                            }
                            return s.exam.name;
                        });
                        var sectionNames = sections.map(function (s) {
                            return s.name;
                        });
                        // remove duplicates
                        vm.examNames = examNames.filter(function (n, pos) {
                            return examNames.indexOf(n) === pos;
                        });
                        vm.sectionNames = sectionNames.filter(function (n, pos) {
                            return sectionNames.indexOf(n) === pos;
                        });
                    });
                };

                vm.$onInit = function () {
                    init();
                };

                vm.showWarning = function () {
                    return vm.examNames && vm.examNames.length > 1;
                };

                vm.estimateCharacters = function () {
                    return (vm.examQuestion.expectedWordCount || 0) * 8;
                };

                vm.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                vm.removeOption = function (selectedOption) {

                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                        return;
                    }

                    var hasCorrectAnswer = vm.examQuestion.options.filter(function (o) {
                        return o.id !== selectedOption.id && (o.option.correctOption || o.option.defaultScore > 0);
                    }).length > 0;

                    // Either not published exam or correct answer exists
                    if (!vm.isInPublishedExam || hasCorrectAnswer) {
                        vm.examQuestion.options.splice(vm.examQuestion.options.indexOf(selectedOption), 1);
                    } else {
                        toast.error($translate.instant('sitnet_action_disabled_minimum_options'));
                    }
                };

                vm.addNewOption = function () {
                    if (vm.lotteryOn) {
                        toast.error($translate.instant('sitnet_action_disabled_lottery_on'));
                        return;
                    }
                    vm.examQuestion.options.push({option: {correctOption: false}});
                };

                vm.correctAnswerToggled = function (option) {
                    Question.toggleCorrectOption(option.option,
                        vm.examQuestion.options.map(function (o) {
                                return o.option;
                            }
                        ));
                };

                vm.optionDisabled = function (option) {
                    return option.option.correctOption;
                };

                vm.updateEvaluationType = function () {
                    if (vm.examQuestion.evaluationType && vm.examQuestion.evaluationType === 'Selection') {
                        delete vm.examQuestion.maxScore;
                    }
                };

                vm.selectFile = function () {
                    Attachment.selectFile(true).then(function (data) {
                        data.attachmentFile.modified = true;
                        vm.question.attachment = data.attachmentFile;
                    });
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.question);
                };

                vm.removeQuestionAttachment = function () {
                    Attachment.removeQuestionAttachment(vm.question);
                };

                vm.getFileSize = function () {
                    return !vm.question ? 0 : Attachment.getFileSize(vm.question.attachment);
                };

                vm.save = function () {
                    clearListeners();
                    vm.onSave({question: vm.question, examQuestion: vm.examQuestion});
                };

                vm.cancel = function () {
                    clearListeners();
                    vm.onCancel();
                };

                vm.calculateMaxPoints = function () {
                    return Question.calculateMaxPoints(vm.examQuestion);
                };

                var routingWatcher = $scope.$on('$locationChangeStart', function (event, newUrl) {
                    if (window.onbeforeunload) {
                        event.preventDefault();
                        // we got changes in the model, ask confirmation
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm_exit'),
                            $translate.instant('sitnet_unsaved_question_data'));
                        dialog.result.then(function (data) {
                            if (data.toString() === 'yes') {
                                // ok to reroute
                                clearListeners();
                                $location.path(newUrl.substring($location.absUrl().length - $location.url().length));
                            }
                        });
                    } else {
                        clearListeners();
                    }
                });

                var clearListeners = function () {
                    window.onbeforeunload = null;
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    routingWatcher();
                };


            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .service('ExamQuestion', ['$resource', function ($resource) {

        var self = this;

        self.undistributionApi = $resource('/app/examquestions/undistributed/:id',
            {
                id: '@id'
            },
            {
                'update': {method: 'PUT', params: {id: '@id'}}
            });

        self.distributionApi = $resource('/app/examquestions/distributed/:id',
            {
                id: '@id'
            },
            {
                'update': {method: 'PUT', params: {id: '@id'}}
            });

    }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('examQuestionEditor', {
        template:
        '<div id="sitnet-dialog">\n' +
        '    <div class="modal-body">\n' +
        '        <exam-question exam-question="$ctrl.resolve.examQuestion" on-save="$ctrl.onSave(question, examQuestion)" on-cancel="$ctrl.cancel()"\n' +
        '                  lottery-on="$ctrl.resolve.lotteryOn"></exam-question>\n' +
        '    </div>\n' +
        '    <div class="modal-footer">\n' +
        '    </div>\n' +
        '</div>',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope',
            function ($scope) {
                // This component is used for editing distributed exam questions.

                var vm = this;

                vm.onSave = function (question, examQuestion) {
                    vm.close({
                        $value: {question: question, examQuestion: examQuestion}
                    });
                };

                vm.cancel = function () {
                    vm.dismiss({$value: 'cancel'});
                };

                // Close modal if user clicked the back button and no changes made
                $scope.$on('$routeChangeStart', function () {
                    if (!window.onbeforeunload) {
                        vm.cancel();
                    }
                });

            }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('library', {
        templateUrl: '/assets/app/question/library/library.template.html',
        controller: ['$location', '$translate', 'toast', function ($location, $translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.questions = [];
            };

            vm.resultsUpdated = function (results) {
                vm.questions = results;
            };

            vm.questionSelected = function (selections) {
                vm.selections = selections;
            };

            vm.questionCopied = function (copy) {
                toast.info($translate.instant('sitnet_question_copied'));
                $location.path('/questions/' + copy.id);
            };

        }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .service('Library', ['$resource', '$sessionStorage', '$q', 'Question',
        function ($resource, $sessionStorage, $q, Question) {

            var self = this;

            self.examApi = $resource('/app/examsearch');
            self.courseApi = $resource('/app/courses/user');
            self.tagApi = $resource('/app/tags');
            self.questionApi = $resource('/app/questions');

            self.loadFilters = function (category) {
                if ($sessionStorage.questionFilters && $sessionStorage.questionFilters[category]) {
                    return JSON.parse($sessionStorage.questionFilters[category]);
                }
                return {};
            };

            self.storeFilters = function (filters, category) {
                var data = {filters: filters};
                if (!$sessionStorage.questionFilters) {
                    $sessionStorage.questionFilters = {};
                }
                $sessionStorage.questionFilters[category] = JSON.stringify(data);
            };

            self.applyFreeSearchFilter = function (text, questions) {
                if (text) {
                    return questions.filter(function (question) {
                        var re = new RegExp(text, 'i');

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
                    return questions;
                }
            };

            self.applyOwnerSearchFilter = function (text, questions) {
                if (text) {
                    return questions.filter(function (question) {
                        var re = new RegExp(text, 'i');
                        var owner = question.creator.firstName + ' ' + question.creator.lastName;
                        return owner.match(re);
                    });
                } else {
                    return questions;
                }
            };

            self.search = function (examIds, courseIds, tagIds, sectionIds) {
                var deferred = $q.defer();
                self.questionApi.query({
                    exam: examIds,
                    course: courseIds,
                    tag: tagIds,
                    section: sectionIds
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
                    var questions = Question.applyFilter(data);
                    questions.forEach(function (q) {
                        if (q.defaultEvaluationType === 'Points' || q.type === 'ClozeTestQuestion' || q.type === 'MultipleChoiceQuestion') {
                            q.displayedMaxScore = q.defaultMaxScore;
                        } else if (q.defaultEvaluationType === 'Selection') {
                            q.displayedMaxScore = 'sitnet_evaluation_select';
                        } else if (q.type === 'WeightedMultipleChoiceQuestion') {
                            q.displayedMaxScore = Question.calculateDefaultMaxPoints(q);
                        }
                        q.typeOrd = ['EssayQuestion',
                            'ClozeTestQuestion',
                            'MultipleChoiceQuestion',
                            'WeightedMultipleChoiceQuestion'].indexOf(q.type);
                        q.ownerAggregate = "";
                        if (q.questionOwners) {
                            q.ownerAggregate = q.questionOwners.reduce(function (s, owner) {
                                return s + owner.lastName + owner.firstName;
                            }, "");
                        }
                        q.allowedToRemove = q.examSectionQuestions.filter(function (esq) {
                            var exam = esq.examSection.exam;
                            return exam.state === 'PUBLISHED' && exam.examActiveEndDate > new Date().getTime();
                        }).length === 0;
                    });
                    deferred.resolve(questions);
                });
                return deferred.promise;
            };


            var htmlDecode = function (text) {
                return $('<div/>').html(text).text();
            };


        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('libraryOwnerSelection', {
        templateUrl: '/assets/app/question/library/owners/libraryOwners.template.html',
        bindings: {
            selections: '<',
            ownerUpdated: '&'
        },
        controller: ['$translate', 'Question', 'UserRes', 'toast',
            function ($translate, Question, UserRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.teachers = UserRes.usersByRole.query({role: 'TEACHER'});
                };

                vm.onTeacherSelect = function ($item, $model, $label) {
                    vm.newTeacher = $item;
                };

                vm.addOwnerForSelected = function () {
                    // check that atleast one has been selected
                    if (vm.selections.length === 0) {
                        toast.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }
                    if (!vm.newTeacher) {
                        toast.warning($translate.instant('sitnet_add_question_owner'));
                        return;
                    }

                    var data = {
                        'uid': vm.newTeacher.id,
                        'questionIds': vm.selections.join()
                    };

                    Question.questionOwnerApi.update(data,
                        function () {
                            toast.info($translate.instant('sitnet_question_owner_added'));
                            vm.ownerUpdated();
                        }, function () {
                            toast.info($translate.instant('sitnet_update_failed'));
                        });
                };

            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('libraryResults', {
        templateUrl: '/assets/app/question/library/results/libraryResults.template.html',
        bindings: {
            onSelection: '&',
            onCopy: '&',
            questions: '<',
            disableLinks: '<',
            tableClass: '@?'
        },
        controller: ['$translate', 'dialogs', 'Question', 'Library', 'Attachment', 'Session', 'toast',
            function ($translate, dialogs, Question, Library, Attachment, Session, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.allSelected = false;
                    vm.pageSize = 25;
                    vm.currentPage = 0;
                    vm.tableClass = vm.tableClass || 'exams-table';
                    var storedData = Library.loadFilters('sorting');
                    if (storedData.filters) {
                        vm.questionsPredicate = storedData.filters.predicate;
                        vm.reverse = storedData.filters.reverse;
                    }
                };

                vm.$onChanges = function (props) {
                    if (props.questions) {
                        vm.currentPage = 0;
                        resetSelections();
                    }
                };

                vm.onSort = function () {
                    saveFilters();
                };

                var saveFilters = function () {
                    var filters = {
                        predicate: vm.questionsPredicate,
                        reverse: vm.reverse
                    };
                    Library.storeFilters(filters, 'sorting');
                };

                vm.selectAll = function () {
                    vm.questions.forEach(function (q) {
                        q.selected = vm.allSelected;
                    });
                    vm.questionSelected();
                };

                var resetSelections = function () {
                    vm.questions.forEach(function (q) {
                        q.selected = false;
                    });
                    vm.questionSelected();
                };

                vm.questionSelected = function () {
                    var selections = vm.questions.filter(function (q) {
                        return q.selected;
                    }).map(function (q) {
                        return q.id;
                    });
                    vm.onSelection({selections: selections});
                };

                vm.deleteQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question_from_library_only'));
                    dialog.result.then(function (btn) {
                        Question.questionsApi.delete({id: question.id}, function () {
                            vm.questions.splice(vm.questions.indexOf(question), 1);
                            toast.info($translate.instant('sitnet_question_removed'));
                        });
                    });
                };

                vm.copyQuestion = function (question) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_copy_question'));
                    dialog.result.then(function (btn) {
                        Question.questionCopyApi.copy({id: question.id}, function (copy) {
                            vm.questions.splice(vm.questions.indexOf(question), 0, copy);
                            vm.onCopy({copy: copy});
                        });
                    });
                };

                vm.downloadQuestionAttachment = function (question) {
                    Attachment.downloadQuestionAttachment(question);
                };

                vm.printOwners = function (question) {
                    return question.questionOwners.map(function (o) {
                        return vm.printOwner(o, false);
                    }).join(', ');
                };

                vm.printOwner = function (owner, showId) {
                    var s = owner.firstName + ' ' + owner.lastName;
                    if (showId && owner.userIdentifier) {
                        s += " (" + owner.userIdentifier + ")";
                    }
                    return s;
                };

                vm.printTags = function (question) {
                    return question.tags.map (function (t) {
                        return t.name.toUpperCase();
                    }).join(', ');
                };

                vm.getQuestionTypeIcon = function (question) {
                    switch (question.type) {
                        case 'EssayQuestion':
                            return 'fa-edit';
                        case 'MultipleChoiceQuestion':
                            return 'fa-list-ul';
                        case 'WeightedMultipleChoiceQuestion':
                            return 'fa-balance-scale';
                        case 'ClozeTestQuestion':
                            return 'fa-terminal';
                    }
                    return '';
                };

                vm.getQuestionTypeText = function (question) {
                    switch (question.type) {
                        case 'EssayQuestion':
                            return 'sitnet_essay';
                        case 'MultipleChoiceQuestion':
                            return 'sitnet_question_mc';
                        case 'WeightedMultipleChoiceQuestion':
                            return 'sitnet_question_weighted_mc';
                        case 'ClozeTestQuestion':
                            return 'sitnet_toolbar_cloze_test_question';
                    }
                    return '';
                }


            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
                    saveFilters();
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

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .service('Question', ['$q', '$resource', '$translate', '$location', '$sessionStorage',
        'ExamQuestion', 'Session', 'Files', 'Attachment', 'toast',
        function ($q, $resource, $translate, $location, $sessionStorage, ExamQuestion, Session,
                  Files, Attachment, toast) {

            var self = this;

            self.questionsApi = $resource('/app/questions/:id',
                {
                    id: '@id'
                },
                {
                    'update': {method: 'PUT'},
                    'delete': {method: 'DELETE', params: {id: '@id'}},
                    'create': {method: 'POST'}

                });

            self.questionOwnerApi = $resource('/app/questions/owner/:uid',
                {
                    uid: '@uid'
                },
                {
                    'update': {method: 'POST'}
                });

            self.essayScoreApi = $resource('/app/review/examquestion/:id/score',
                {
                    id: '@id'
                },
                {
                    'update': {method: 'PUT', params: {id: '@id'}}
                });

            self.questionCopyApi = $resource('/app/question/:id',
                {
                    id: '@id'
                },
                {
                    'copy': {method: 'POST'}
                });


            self.getQuestionType = function (type) {
                var questionType;
                switch (type) {
                    case 'essay':
                        questionType = 'EssayQuestion';
                        break;
                    case 'multichoice':
                        questionType = 'MultipleChoiceQuestion';
                        break;
                    case 'weighted':
                        questionType = 'WeightedMultipleChoiceQuestion';
                        break;
                    case 'cloze':
                        questionType = 'ClozeTestQuestion';
                        break;
                }
                return questionType;
            };

            self.getQuestionDraft = function () {
                return {
                    examSectionQuestions: [],
                    options: [],
                    questionOwners: [Session.getUser()],
                    state: 'NEW',
                    tags: []
                };
            };

            self.getQuestionAmounts = function (exam) {
                var data = {accepted: 0, rejected: 0, hasEssays: false};
                angular.forEach(exam.examSections, function (section) {
                    angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                        var question = sectionQuestion.question;
                        if (question.type === 'EssayQuestion') {
                            if (sectionQuestion.evaluationType === 'Selection' && sectionQuestion.essayAnswer) {
                                if (parseInt(sectionQuestion.essayAnswer.evaluatedScore) === 1) {
                                    data.accepted++;
                                } else if (parseInt(sectionQuestion.essayAnswer.evaluatedScore) === 0) {
                                    data.rejected++;
                                }
                            }
                            data.hasEssays = true;
                        }
                    });
                });
                return data;
            };

            // For weighted mcq
            self.calculateDefaultMaxPoints = function (question) {
                return (question.options.filter(function (option) {
                    return option.defaultScore > 0;
                }).reduce(function (a, b) {
                    return a + b.defaultScore;
                }, 0));
            };

            // For weighted mcq
            self.calculateMaxPoints = function (sectionQuestion) {
                if (!sectionQuestion.options) {
                    return 0;
                }
                var points = sectionQuestion.options.filter(function (option) {
                    return option.score > 0;
                }).reduce(function (a, b) {
                    return a + parseFloat(b.score);
                }, 0);
                return parseFloat(points.toFixed(2));
            };

            self.scoreClozeTestAnswer = function (sectionQuestion) {
                var score = sectionQuestion.clozeTestAnswer.score;
                return parseFloat(score.correctAnswers * sectionQuestion.maxScore /
                    (score.correctAnswers + score.incorrectAnswers).toFixed(2));
            };

            self.scoreWeightedMultipleChoiceAnswer = function (sectionQuestion) {
                var score = sectionQuestion.options.filter(function (o) {
                    return o.answered;
                }).reduce(function (a, b) {
                    return a + b.score;
                }, 0);
                return Math.max(0, score);
            };

            // For non-weighted mcq
            self.scoreMultipleChoiceAnswer = function (sectionQuestion) {
                var selected = sectionQuestion.options.filter(function (o) {
                    return o.answered;
                });
                if (selected.length === 0) {
                    return 0;
                }
                if (selected.length !== 1) {
                    console.error('multiple options selected for a MultiChoice answer!');
                }
                if (selected[0].option.correctOption === true) {
                    return sectionQuestion.maxScore;
                }
                return 0;
            };

            self.decodeHtml = function (html) {
                var txt = document.createElement('textarea');
                txt.innerHTML = html;
                return txt.value;
            };

            self.longTextIfNotMath = function (text) {
                if (text && text.length > 0 && text.indexOf('math-tex') === -1) {
                    // remove HTML tags
                    var str = String(text).replace(/<[^>]+>/gm, '');
                    // shorten string
                    return self.decodeHtml(str);
                }
                return '';
            };

            self.shortText = function (text, maxLength) {

                if (text && text.length > 0 && text.indexOf('math-tex') === -1) {
                    // remove HTML tags
                    var str = String(text).replace(/<[^>]+>/gm, '');
                    // shorten string
                    str = self.decodeHtml(str);
                    return str.length + 3 > maxLength ? str.substr(0, maxLength) + '...' : str;
                }
                return text ? self.decodeHtml(text) : '';
            };

            var _filter;

            self.setFilter = function (filter) {
                switch (filter) {
                    case 'MultipleChoiceQuestion':
                    case 'WeightedMultipleChoiceQuestion':
                    case 'EssayQuestion':
                    case 'ClozeTestQuestion':
                        _filter = filter;
                        break;
                    default:
                        _filter = undefined;
                }
            };

            self.applyFilter = function (questions) {
                if (!_filter) {
                    return questions;
                }
                return questions.filter(function (q) {
                    return q.type === _filter;
                });
            };

            self.loadFilters = function (category) {
                if ($sessionStorage.questionFilters && $sessionStorage.questionFilters[category]) {
                    return JSON.parse($sessionStorage.questionFilters[category]);
                }
                return {};
            };

            self.storeFilters = function (filters, category) {
                var data = {filters: filters};
                if (!$sessionStorage.questionFilters) {
                    $sessionStorage.questionFilters = {};
                }
                $sessionStorage.questionFilters[category] = JSON.stringify(data);
            };

            self.range = function (min, max, step) {
                step |= 1;
                var input = [];
                for (var i = min; i <= max; i += step) {
                    input.push(i);
                }
                return input;
            };

            var getQuestionData = function (question) {
                var questionToUpdate = {
                    'type': question.type,
                    'defaultMaxScore': question.defaultMaxScore,
                    'question': question.question,
                    'shared': question.shared,
                    'defaultAnswerInstructions': question.defaultAnswerInstructions,
                    'defaultEvaluationCriteria': question.defaultEvaluationCriteria,
                    'questionOwners': question.questionOwners,
                    'tags': question.tags,
                    'options': question.options
                };
                if (question.id) {
                    questionToUpdate.id = question.id;
                }

                // update question specific attributes
                switch (questionToUpdate.type) {
                    case 'EssayQuestion':
                        questionToUpdate.defaultExpectedWordCount = question.defaultExpectedWordCount;
                        questionToUpdate.defaultEvaluationType = question.defaultEvaluationType;
                        break;
                    case 'MultipleChoiceQuestion':
                    case 'WeightedMultipleChoiceQuestion':
                        questionToUpdate.options = question.options;
                        break;
                }
                return questionToUpdate;
            };

            self.createQuestion = function (question) {
                var body = getQuestionData(question);
                var deferred = $q.defer();

                self.questionsApi.create(body,
                    function (response) {
                        toast.info($translate.instant('sitnet_question_added'));
                        if (question.attachment && question.attachment.modified) {
                            Files.upload('/app/attachment/question', question.attachment,
                                {questionId: response.id}, question, null, function () {
                                    deferred.resolve(response);
                                });
                        } else {
                            deferred.resolve(response);
                        }
                    }, function (error) {
                        deferred.reject(error);
                    }
                );
                return deferred.promise;
            };

            self.updateQuestion = function (question, displayErrors) {
                var body = getQuestionData(question);
                var deferred = $q.defer();
                self.questionsApi.update(body,
                    function (response) {
                        toast.info($translate.instant('sitnet_question_saved'));
                        if (question.attachment && question.attachment.modified) {
                            Files.upload('/app/attachment/question', question.attachment,
                                {questionId: question.id}, question, null, function () {
                                    deferred.resolve();
                                });
                        }
                        else if (question.attachment && question.attachment.removed) {
                            Attachment.eraseQuestionAttachment(question).then(function () {
                                deferred.resolve(response);
                            });
                        } else {
                            deferred.resolve(response);
                        }
                    }, function (error) {
                        if (displayErrors) {
                            toast.error(error.data);
                        }
                        deferred.reject();
                    }
                );
                return deferred.promise;
            };

            self.updateDistributedExamQuestion = function (question, sectionQuestion) {
                var data = {
                    'id': sectionQuestion.id,
                    'maxScore': sectionQuestion.maxScore,
                    'answerInstructions': sectionQuestion.answerInstructions,
                    'evaluationCriteria': sectionQuestion.evaluationCriteria,
                    'options': sectionQuestion.options,
                    'question': question
                };

                // update question specific attributes
                switch (question.type) {
                    case 'EssayQuestion':
                        data.expectedWordCount = sectionQuestion.expectedWordCount;
                        data.evaluationType = sectionQuestion.evaluationType;
                        break;
                }
                var deferred = $q.defer();
                ExamQuestion.distributionApi.update({id: sectionQuestion.id}, data,
                    function (esq) {
                        angular.extend(esq.question, question);
                        if (question.attachment && question.attachment.modified) {
                            Files.upload('/app/attachment/question', question.attachment,
                                {questionId: question.id}, question, null, function () {
                                    esq.question.attachment = question.attachment;
                                    deferred.resolve(esq);
                                });
                        }
                        else if (question.attachment && question.attachment.removed) {
                            Attachment.eraseQuestionAttachment(question).then(function () {
                                esq.question.attachment = null;
                                deferred.resolve(esq);
                            });
                        } else {
                            deferred.resolve(esq);
                        }
                    }, function (error) {
                        toast.error(error.data);
                        deferred.reject();
                    }
                );
                return deferred.promise;
            };

            self.toggleCorrectOption = function (option, options) {
                option.correctOption = true;
                angular.forEach(options, function (o) {
                    o.correctOption = o === option;
                });
            };

        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .factory("QuestionRes", ['$resource', function ($resource) {
        return {

        };
    }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.question')
    .component('questionSelector', {
        templateUrl: '/assets/app/question/selector/questionSelector.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', 'ExamRes', 'toast', function ($translate, ExamRes, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.questions = [];
            };

            vm.resultsUpdated = function (results) {
                vm.questions = results;
            };

            vm.questionSelected = function (selections) {
                vm.selections = selections;
            };

            vm.questionCopied = function(copy) {
                toastr.info($translate.instant('sitnet_question_copied'));
            };

            vm.addQuestions = function () {
                // check that at least one has been selected
                if (vm.selections.length === 0) {
                    toast.warning($translate.instant('sitnet_choose_atleast_one'));
                    return;
                }
                var insertQuestion = function (sectionId, to, examId) {

                    ExamRes.sectionquestionsmultiple.insert({
                            eid: examId,
                            sid: sectionId,
                            seq: to,
                            questions: vm.selections.join()
                        }, function (sec) {
                            toast.info($translate.instant('sitnet_question_added'));
                            vm.close();
                        }, function (error) {
                            toast.error(error.data);
                            vm.close({error: error});
                        }
                    );

                };

                // calculate the new order number for question sequence
                // always add question to last spot, because dragndrop
                // is not in use here
                var to = parseInt(vm.resolve.questionCount) + 1;
                insertQuestion(vm.resolve.sectionId, to, vm.resolve.examId);
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

        }]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module("app.reservation")
    .factory("ReservationResource", ['$resource', function ($resource) {
        return {
            reservations: $resource("/app/reservations"),
            reservation: $resource("/app/reservations/:id", {id: "@id"},
                {"remove": {method: "DELETE", params: {id: "id"}}}
            ),
            students: $resource("/app/reservations/students"),
            teachers: $resource("/app/reservations/teachers"),
            exams: $resource("/app/reservations/exams"),
            examrooms: $resource("/app/reservations/examrooms"),
            machines: $resource("/app/machines"),
            availableMachines: $resource("/app/reservations/:id/machines", {id: "@id"}),
            machine: $resource("/app/reservations/:id/machine", {id: "@id"}, {"update": {method: "PUT"}})
        };
    }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.reservation')
    .component('reservations', {
        template: '<div ng-include="$ctrl.templateUrl"></div>',
        bindings: {
            'userRole': '@'
        },
        controller: ['ExamRes', '$location', '$http', 'EXAM_CONF',
            'ReservationResource', 'Reservation', 'Exam', '$timeout', '$routeParams', '$translate', '$filter', 'toast',
            function (ExamRes, $location, $http, EXAM_CONF, ReservationResource, Reservation, Exam,
                      $timeout, $routeParams, $translate, $filter, toast) {

                var select2options = {
                    placeholder: '-',
                    data: [],
                    allowClear: true,
                    dropdownAutoWidth: true
                };

                var ctrl = this;
                var examId = $routeParams.eid ? parseInt($routeParams.eid) : undefined;

                ctrl.$onInit = function () {
                    ctrl.startDate = ctrl.endDate = new Date();
                    if (ctrl.userRole === 'admin') {
                        ctrl.templateUrl = EXAM_CONF.TEMPLATES_PATH + 'reservation/admin/adminReservations.template.html';
                    } else if (ctrl.userRole === 'teacher') {
                        ctrl.templateUrl = EXAM_CONF.TEMPLATES_PATH + 'reservation/teacher/teacherReservations.template.html';
                    }
                    ctrl.examStates = [
                        'REVIEW',
                        'REVIEW_STARTED',
                        'GRADED',
                        'GRADED_LOGGED',
                        'REJECTED',
                        'ARCHIVED',
                        'STUDENT_STARTED',
                        'PUBLISHED',
                        'ABORTED',
                        'NO_SHOW'
                    ];
                    if (ctrl.userRole === 'admin') {
                        ctrl.examStates.push('EXTERNAL_UNFINISHED');
                        ctrl.examStates.push('EXTERNAL_FINISHED');
                    }

                    ctrl.selection = {examId: examId};

                    ctrl.machineOptions = angular.copy(select2options);

                    ctrl.roomOptions = angular.copy(select2options);

                    ctrl.examOptions = angular.copy(select2options);
                    ctrl.examOptions.initSelection = function (element, callback) {
                        if (examId) {
                            var selected = ctrl.examOptions.data.filter(function (d) {
                                return d.id === examId;
                            });
                            if (selected.length > 0) {
                                callback(selected[0]);
                                // this reset is dumb but necessary because for some reason this callback is executed
                                // each time selection changes. Might be a problem with the (deprecated) ui-select2
                                // directive or not
                                examId = null;
                            }
                        }
                    };

                    ctrl.studentOptions = angular.copy(select2options);

                    ctrl.stateOptions = angular.copy(select2options);

                    ctrl.teacherOptions = angular.copy(select2options);

                    ctrl.reservationDetails = EXAM_CONF.TEMPLATES_PATH + 'reservation/reservation_details.html';

                    ctrl.examStates.forEach(function (state) {
                        ctrl.stateOptions.data.push({
                            id: state,
                            text: $translate.instant('sitnet_exam_status_' + state.toLowerCase())
                        });
                    });
                };


                ctrl.isAdminView = function () {
                    return $location.path() === '/';
                };

                ReservationResource.students.query(function (students) {
                        ctrl.students = $filter('orderBy')(students, ['lastName', 'firstName']);
                        ctrl.students.forEach(function (student) {
                            ctrl.studentOptions.data.push({id: student.id, text: student.name});
                        });
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );

                ReservationResource.exams.query(
                    function (exams) {
                        ctrl.examnames = $filter('orderBy')(exams, 'name');
                        ctrl.examnames.forEach(function (exam) {
                            ctrl.examOptions.data.push({id: exam.id, text: exam.name});
                        });
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );

                if (ctrl.isAdminView()) {
                    ReservationResource.teachers.query(function (teachers) {
                            ctrl.examOwners = $filter('orderBy')(teachers, ['lastName', 'firstName']);
                            ctrl.examOwners.forEach(function (owner) {
                                ctrl.teacherOptions.data.push({
                                    id: owner.id,
                                    text: owner.firstName + ' ' + owner.lastName
                                });
                            });
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );

                    ReservationResource.examrooms.query(
                        function (examrooms) {
                            ctrl.examrooms = examrooms;
                            examrooms.forEach(function (room) {
                                ctrl.roomOptions.data.push({id: room.id, text: room.name});
                            });
                            // Load machines after rooms are loaded
                            ReservationResource.machines.query(
                                function (machines) {
                                    ctrl.machines = machines;
                                    machinesForRooms(examrooms, machines);
                                },
                                function (error) {
                                    toast.error(error.data);
                                }
                            );
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                }

                ctrl.printExamState = function (reservation) {
                    return reservation.noShow ? 'NO_SHOW' : reservation.enrolment.exam.state;
                };


                ctrl.getStateclass = function (reservation) {
                    return reservation.noShow ? 'no_show' : reservation.enrolment.exam.state.toLowerCase();
                };

                ctrl.roomChanged = function () {
                    if (typeof ctrl.selection.roomId !== 'object') {
                        return;
                    }

                    ctrl.machineOptions.data.length = 0;
                    if (ctrl.selection.roomId === null) {
                        machinesForRooms(ctrl.examrooms, ctrl.machines);
                    } else {
                        machinesForRoom(findRoom(ctrl.selection.roomId.id), ctrl.machines);
                    }
                    ctrl.query();
                };

                ctrl.startDateChanged = function (date) {
                    ctrl.startDate = date;
                    ctrl.query();
                };

                ctrl.endDateChanged = function (date) {
                    ctrl.endDate = date;
                    ctrl.query();
                };

                var somethingSelected = function (params) {
                    for (var k in params) {
                        if (!params.hasOwnProperty(k)) {
                            continue;
                        }
                        if (params[k]) {
                            return true;
                        }
                    }
                    return ctrl.startDate || ctrl.endDate;
                };

                ctrl.query = function () {
                    var params = angular.copy(ctrl.selection);
                    if (somethingSelected(params)) {
                        // have to clear empty strings completely
                        for (var k in params) {
                            if (!params.hasOwnProperty(k)) {
                                continue;
                            }
                            if (params[k] === '' || params[k] === null) {
                                delete params[k];
                                continue;
                            }
                            if (typeof params[k] === 'object') {
                                params[k] = params[k].id;
                            }
                        }

                        if (ctrl.startDate) {
                            params.start = ctrl.startDate;
                        }
                        if (ctrl.endDate) {
                            params.end = ctrl.endDate;
                        }

                        ReservationResource.reservations.query(params,
                            function (reservations) {
                                reservations.forEach(function (r) {
                                    r.userAggregate = r.user ? r.user.lastName + r.user.firstName : r.externalUserRef;
                                    if (!r.enrolment || r.enrolment.externalExam) {
                                        r.enrolment = r.enrolment || {};
                                        var externalState = r.enrolment.finished ? 'EXTERNAL_FINISHED' :
                                            'EXTERNAL_UNFINISHED';
                                        r.enrolment.exam = {external: true, examOwners: [], state: externalState};
                                    }
                                    var exam = r.enrolment.exam.parent || r.enrolment.exam;
                                    r.enrolment.teacherAggregate = exam.examOwners.map(function (o) {
                                        return o.lastName + o.firstName;
                                    }).join();
                                    var state = ctrl.printExamState(r);
                                    r.stateOrd = ['PUBLISHED', 'NO_SHOW', 'STUDENT_STARTED', 'ABORTED', 'REVIEW',
                                        'REVIEW_STARTED', 'GRADED', 'GRADED_LOGGED', 'REJECTED', 'ARCHIVED',
                                        'EXTERNAL_UNFINISHED', 'EXTERNAL_FINISHED'].indexOf(state);
                                });
                                ctrl.reservations = reservations;
                            }, function (error) {
                                toast.error(error.data);
                            });
                    }
                };

                ctrl.removeReservation = function (reservation) {
                    Reservation.cancelReservation(reservation).then(function () {
                        ctrl.reservations.splice(ctrl.reservations.indexOf(reservation), 1);
                        toast.info($translate.instant('sitnet_reservation_removed'));
                    });
                };

                ctrl.changeReservationMachine = function (reservation) {
                    Reservation.changeMachine(reservation);
                };

                ctrl.permitRetrial = function (reservation) {
                    ExamRes.reservation.update({id: reservation.id}, function () {
                        reservation.retrialPermitted = true;
                        toast.info($translate.instant('sitnet_retrial_permitted'));
                    });
                };

                function roomContains(examroom, machine) {
                    if (examroom && examroom.examMachines) {
                        return examroom.examMachines.some(function (roommachine) {
                            return (machine.id === roommachine.id);
                        });
                    }
                    return false;
                }

                function findRoom(id) {
                    var i = ctrl.examrooms.map(function (er) {
                        return er.id;
                    }).indexOf(id);
                    if (i >= 0) {
                        return ctrl.examrooms[i];
                    }
                    return undefined;
                }

                function machinesForRoom(room, machines) {
                    if (room.examMachines.length < 1) {
                        return;
                    }
                    var data = {
                        text: room.name,
                        children: []
                    };
                    machines.forEach(function (machine) {
                        if (!roomContains(room, machine)) {
                            return;
                        }
                        data.children.push({id: machine.id, text: machine.name === null ? '' : machine.name});
                    });
                    ctrl.machineOptions.data.push(data);
                }

                function machinesForRooms(rooms, machines) {
                    if (!rooms || !machines) {
                        return;
                    }
                    rooms.forEach(function (room) {
                        machinesForRoom(room, machines);
                    });
                }
            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.reservation')
    .service('Reservation', ['$q', '$uibModal', '$http', '$translate', 'dialogs',
        'ReservationResource', 'EXAM_CONF', 'InteroperabilityResource', 'toast',
        function ($q, $modal, $http, $translate, dialogs,
                  ReservationRes, EXAM_CONF, InteroperabilityRes, toast) {

            var self = this;

            self.removeReservation = function (enrolment) {
                var externalRef = enrolment.reservation.externalRef;
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                var successFn = function () {
                    delete enrolment.reservation;
                    enrolment.reservationCanceled = true;
                };
                var errorFn = function (msg) {
                    toast.error(msg);
                };
                dialog.result.then(function (btn) {
                    if (externalRef) {
                        InteroperabilityRes.reservation.remove({ref: externalRef}, successFn, errorFn);
                    } else {
                        $http.delete('/app/calendar/reservation/' + enrolment.reservation.id)
                            .success(successFn)
                            .error(errorFn);
                    }
                });
            };

            self.getReservationCount = function (exam) {
                return exam.examEnrolments.filter(function (enrolment) {
                    return enrolment.reservation && enrolment.reservation.endAt > new Date().getTime();
                }).length;
            };

            self.changeMachine = function (reservation) {
                var modalController = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                    $scope.selection = {};
                    $scope.availableMachines = ReservationRes.availableMachines.query({id: reservation.id});
                    $scope.ok = function () {
                        ReservationRes.machine.update({
                            id: reservation.id,
                            machineId: $scope.selection.machineId
                        }, function (machine) {
                            toast.info($translate.instant("sitnet_updated"));
                            reservation.machine = machine;
                            $modalInstance.close("Accepted");
                        }, function (msg) {
                            toast.error(msg);
                        });
                    };

                    $scope.cancel = function () {
                        $modalInstance.close("Dismissed");
                    };

                }];

                var modalInstance = $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/admin/change_machine_dialog.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: modalController
                });

                modalInstance.result.then(function () {
                    console.log("closed");
                });
            };

            self.cancelReservation = function (reservation) {
                var deferred = $q.defer();
                var modalController = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                    $scope.message = {};
                    $scope.ok = function () {
                        ReservationRes.reservation.remove({id: reservation.id, msg: $scope.message.text},
                            function () {
                                $modalInstance.close("Accepted");
                                deferred.resolve("ok");
                            }, function (error) {
                                toast.error(error.data);
                            });
                    };

                    $scope.cancel = function () {
                        $modalInstance.close("Dismissed");
                        deferred.reject();
                    };

                }];

                var modalInstance = $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'reservation/admin/remove_reservation_dialog.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: modalController
                });

                modalInstance.result.then(function () {
                    console.log("closed");
                    deferred.reject();
                });
                return deferred.promise;
            };


        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('assessment', {
        templateUrl: '/assets/app/review/assessment/assessment.template.html',
        controller: ['$routeParams', 'Assessment', 'ExamRes', 'Question', 'Session', 'Exam', 'toast',
            function ($routeParams, Assessment, ExamRes, Question, Session, Exam, toast) {

                var vm = this;

                vm.$onInit = function () {
                    ExamRes.reviewerExam.get({eid: $routeParams.id},
                        function (exam) {
                            exam.examSections.forEach(function (es) {
                                es.sectionQuestions.filter(function (esq) {
                                    return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                                }).forEach(function (esq) {
                                    esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                                });
                            });

                            vm.questionSummary = Question.getQuestionAmounts(exam);
                            vm.exam = exam;
                            vm.user = Session.getUser();
                            vm.backUrl = vm.user.isAdmin ? "/" : "/exams/" + vm.exam.parent.id + "/4";
                        }, function (err) {
                            toast.error(err.data);
                        });
                };

                vm.isUnderLanguageInspection = function () {
                    if (!vm.user) return false;
                    return vm.user.isLanguageInspector &&
                        vm.exam.languageInspection &&
                        !vm.exam.languageInspection.finishedAt;
                };

                vm.print = function () {
                    window.open("/print/exam/" + vm.exam.id, "_blank");
                };

                vm.scoreSet = function () {
                    angular.extend(vm.questionSummary, Question.getQuestionAmounts(vm.exam));
                    startReview();
                };

                vm.gradingUpdated = function () {
                    startReview();
                };

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                // Set review status as started if not already done so
                var startReview = function () {
                    if (vm.exam.state === 'REVIEW') {
                        var review = Assessment.getPayload(vm.exam, 'REVIEW_STARTED');
                        ExamRes.review.update({id: review.id}, review);
                    }
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .service('Assessment', ['$q', '$resource', '$translate', '$location', '$timeout', 'dialogs', 'ExamRes', 'Session', 'Question', 'toast',
        function ($q, $resource, $translate, $location, $timeout, dialogs, ExamRes, Session, Question, toast) {

            var self = this;

            self.noShowApi = $resource('/app/noshows/:eid/:uid', {
                eid: '@eid',
                uid: '@uid'
            });

            self.participationsApi = $resource('/app/examparticipations/:eid/:uid', {
                eid: '@eid',
                uid: '@uid'
            });

            self.examAssessmentApi = $resource('/app/review/:id/info', {
                id: '@id'
            }, {
                update: {method: 'PUT'}
            });

            self.saveFeedback = function (exam, silent) {
                var deferred = $q.defer();
                var examFeedback = {
                    'comment': exam.examFeedback.comment
                };

                // TODO: combine these to one API call!
                // Update comment
                if (exam.examFeedback.id) {
                    ExamRes.comment.update({
                        eid: exam.id,
                        cid: exam.examFeedback.id
                    }, examFeedback, function (data) {
                        if (!silent) {
                            toast.info($translate.instant('sitnet_comment_updated'));
                        }
                        deferred.resolve();
                    }, function (error) {
                        toast.error(error.data);
                        deferred.reject();
                    });
                    // Insert new comment
                } else {
                    ExamRes.comment.insert({
                        eid: exam.id,
                        cid: 0
                    }, examFeedback, function (comment) {
                        if (!silent) {
                            toast.info($translate.instant('sitnet_comment_added'));
                        }
                        exam.examFeedback = comment;
                        deferred.resolve();
                    }, function (error) {
                        toast.error(error.data);
                        deferred.reject();
                    });
                }
                return deferred.promise;
            };

            self.isReadOnly = function (exam) {
                return exam && ['GRADED_LOGGED', 'ARCHIVED', 'ABORTED', 'REJECTED'].indexOf(exam.state) > -1;
            };

            self.isGraded = function (exam) {
                return exam && exam.state === 'GRADED';
            };

            self.pickExamLanguage = function (exam) {
                var lang = exam.answerLanguage;
                if (lang) {
                    return {code: lang};
                }
                else if (exam.examLanguages.length === 1) {
                    lang = exam.examLanguages[0];
                }
                return lang;
            };

            self.checkCredit = function (exam, silent) {
                var credit = exam.customCredit;
                var valid = !isNaN(credit) && credit >= 0;
                if (!valid) {
                    if (!silent) {
                        toast.error($translate.instant('sitnet_not_a_valid_custom_credit'));
                    }
                    // Reset to default
                    exam.customCredit = exam.course.credits;
                }
                return valid;
            };

            // Defining markup outside templates is not advisable, but creating a working custom dialog template for this
            // proved to be a bit too much of a hassle. Lets live with this.
            self.getRecordReviewConfirmationDialogContent = function (feedback) {
                return '<h4>' + $translate.instant('sitnet_teachers_comment') + '</h4>' +
                    feedback + '<br/><strong>' + $translate.instant('sitnet_confirm_record_review') + '</strong>';
            };

            self.countCharacters = function (text) {
                if (!text) {
                    return 0;
                }
                var normalizedText = text
                    .replace(/\s/g, '')
                    .replace(/&nbsp;/g, '')
                    .replace(/(\r\n|\n|\r)/gm, '')
                    .replace(/&nbsp;/gi, ' ');
                normalizedText = strip(normalizedText)
                    .replace(/^([\t\r\n]*)$/, '');
                return normalizedText.length;
            };

            self.countWords = function (text) {
                if (!text) {
                    return 0;
                }
                var normalizedText = text
                    .replace(/(\r\n|\n|\r)/gm, ' ')
                    .replace(/^\s+|\s+$/g, '')
                    .replace('&nbsp;', ' ');

                normalizedText = strip(normalizedText);

                var words = normalizedText.split(/\s+/);

                for (var wordIndex = words.length - 1; wordIndex >= 0; wordIndex--) {
                    if (words[wordIndex].match(/^([\s\t\r\n]*)$/)) {
                        words.splice(wordIndex, 1);
                    }
                }
                return words.length;
            };

            self.getExitUrl = function (exam) {
                var user = Session.getUser || {isAdmin: false};
                return user.isAdmin ? '/' : '/exams/' + exam.parent.id + '/4';
            };

            self.createExamRecord = function (exam, needsConfirmation, followUpUrl) {

                if (!self.checkCredit(exam)) {
                    return;
                }
                var messages = getErrors(exam);
                if (messages.length > 0) {
                    messages.forEach(function (msg) {
                        toast.error($translate.instant(msg));
                    });
                }
                else {
                    var dialogNote, res;
                    if (exam.gradeless) {
                        dialogNote = $translate.instant('sitnet_confirm_archiving_without_grade');
                        res = ExamRes.register.add;
                    } else {
                        dialogNote = self.getRecordReviewConfirmationDialogContent(exam.examFeedback.comment);
                        res = ExamRes.saveRecord.add;
                    }
                    var payload = getPayload(exam, 'GRADED');
                    if (needsConfirmation) {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), dialogNote);
                        dialog.result.then(function () {
                            register(exam, res, payload, followUpUrl);
                        });
                    } else {
                        sendToRegistry(payload, res, exam, followUpUrl);
                    }
                }
            };

            self.saveEssayScore = function (question) {
                if (!question.essayAnswer || isNaN(question.essayAnswer.evaluatedScore)) {
                    return $q.reject();
                }

                return Question.essayScoreApi.update({
                    id: question.id,
                    evaluatedScore: question.essayAnswer.evaluatedScore
                }).$promise;
            };

            self.saveAssessmentInfo = function (exam) {
                if (exam.state === 'GRADED_LOGGED') {
                    self.examAssessmentApi.update({id: exam.id, assessmentInfo: exam.assessmentInfo}, function () {
                        toast.info($translate.instant('sitnet_saved'));
                    });
                }
            };

            self.saveAssessment = function (exam, modifiable) {
                if (!modifiable) {
                    if (exam.state !== 'GRADED') {
                        // Just save feedback and leave
                        saveFeedback(exam).then(function () {
                            toast.info($translate.instant('sitnet_saved'));
                            $location.path('exams/' + exam.parent.id + '/4');
                        });
                    }
                }
                else {
                    if (!self.checkCredit(exam)) {
                        return;
                    }
                    var messages = getErrors(exam);
                    if (exam.executionType.type === 'MATURITY') {
                        sendAssessment(exam.state, getPayload(exam), messages, exam);
                    } else {
                        var oldState = exam.state;
                        var newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';
                        var payload = getPayload(exam, newState);
                        if (newState !== 'GRADED' || oldState === 'GRADED') {
                            sendAssessment(newState, payload, messages, exam);
                        } else {
                            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                            dialog.result.then(function () {
                                sendAssessment(newState, payload, messages, exam);
                            });
                        }
                    }
                }
            };

            self.rejectMaturity = function (exam, askConfirmation, followUpUrl) {
                var reject = function () {
                    saveFeedback(exam).then(function () {
                        var payload = getPayload(exam, 'REJECTED');
                        ExamRes.review.update(payload, function () {
                            toast.info($translate.instant('sitnet_maturity_rejected'));
                            $location.path(followUpUrl || self.getExitUrl(exam));
                        }, function (error) {
                            toast.error(error.data);
                        });
                    });
                };
                if (askConfirmation) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_maturity_disapproval'));
                    dialog.result.then(function () {
                        reject();
                    });
                } else {
                    reject();
                }

            };

            self.getPayload = function (exam, state) {
                return getPayload(exam, state);
            };

            var strip = function (html) {
                var tmp = document.createElement('div');
                tmp.innerHTML = html;

                if (!tmp.textContent && typeof tmp.innerText === 'undefined') {
                    return '';
                }

                return tmp.textContent || tmp.innerText;
            };

            var sendAssessment = function (newState, payload, messages, exam) {
                ExamRes.review.update(payload, function () {
                    saveFeedback(exam).then(function () {
                        if (newState === 'REVIEW_STARTED') {
                            messages.forEach(function (msg) {
                                toast.warning($translate.instant(msg));
                            });
                            $timeout(function () {
                                toast.info($translate.instant('sitnet_review_saved'));
                            }, 1000);
                        } else {
                            toast.info($translate.instant('sitnet_review_graded'));
                            $location.path(self.getExitUrl(exam));
                        }
                    });
                }, function (error) {
                    toast.error(error.data);
                });
            };

            var getErrors = function (exam) {
                var messages = [];
                if (!exam.grade.id) {
                    messages.push('sitnet_participation_unreviewed');
                }
                if (!exam.creditType.type) {
                    messages.push('sitnet_exam_choose_credit_type');
                }
                if (!exam.answerLanguage) {
                    messages.push('sitnet_exam_choose_response_language');
                }
                return messages;
            };

            var saveFeedback = function (exam) {
                return self.saveFeedback(exam, true);
            };

            var sendToRegistry = function (payload, res, exam, followUpUrl) {
                payload.state = 'GRADED_LOGGED';
                res(payload, function () {
                    toast.info($translate.instant('sitnet_review_recorded'));
                    $location.path(followUpUrl || self.getExitUrl(exam));
                }, function (error) {
                    toast.error(error.data);
                });
            };

            var getPayload = function (exam, state) {
                return {
                    'id': exam.id,
                    'state': state || exam.state,
                    'grade': exam.grade && exam.grade.id ? exam.grade.id : undefined,
                    'gradeless': exam.gradeless,
                    'customCredit': exam.customCredit,
                    'creditType': exam.creditType ? exam.creditType.type : undefined,
                    'answerLanguage': exam.answerLanguage ? exam.answerLanguage.code : undefined,
                    'additionalInfo': exam.additionalInfo
                };
            };

            var register = function (exam, res, payload, followUpUrl) {
                saveFeedback(exam).then(function () {
                    ExamRes.review.update(payload, function () {
                        if (exam.state !== 'GRADED') {
                            toast.info($translate.instant('sitnet_review_graded'));
                        }
                        sendToRegistry(payload, res, exam, followUpUrl);
                    }, function (error) {
                        toast.error(error.data);
                    });
                });
            };


        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rFeedback', {
        templateUrl: '/assets/app/review/assessment/feedback/feedback.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$uibModal', 'Assessment', 'Attachment', 'Files',
            function ($modal, Assessment, Attachment, Files) {

                var vm = this;

                vm.toggleFeedbackVisibility = function () {
                    var selector = $('.body');
                    if (vm.hideEditor) {
                        selector.show();
                    } else {
                        selector.hide();
                    }
                    vm.hideEditor = !vm.hideEditor;
                };

                vm.saveFeedback = function () {
                    Assessment.saveFeedback(vm.exam);
                };

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.exam);
                };

                vm.removeFeedbackAttachment = function () {
                    Attachment.removeFeedbackAttachment(vm.exam);
                };

                vm.selectFile = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {
                            isTeacherModal: function () {
                                return true;
                            }
                        }
                    }).result.then(function (data) {
                        Assessment.saveFeedback(vm.exam).then(function () {
                            Files.upload('/app/attachment/exam/' + vm.exam.id + '/feedback',
                                data.attachmentFile, {examId: vm.exam.id}, vm.exam.examFeedback);
                        })
                    });
                };
            }

        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rStatement', {
        templateUrl: '/assets/app/review/assessment/feedback/statement.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$uibModal', 'Maturity', 'Attachment', 'Files',
            function ($modal, Maturity, Attachment, Files) {

                var vm = this;

                vm.hasGoneThroughLanguageInspection = function () {
                    return vm.exam.languageInspection && vm.exam.languageInspection.finishedAt;
                };

                vm.toggleEditorVisibility = function () {
                    var selector = $('.body');
                    if (vm.hideEditor) {
                        selector.show();
                    } else {
                        selector.hide();
                    }
                    vm.hideEditor = !vm.hideEditor;
                };

                vm.saveInspectionStatement = function () {
                    Maturity.saveInspectionStatement(vm.exam).then(function (data) {
                        angular.extend(vm.exam.languageInspection.statement, data);
                    });
                };

                vm.downloadStatementAttachment = function () {
                    Attachment.downloadStatementAttachment(vm.exam);
                };

                vm.removeStatementAttachment = function () {
                    Attachment.removeStatementAttachment(vm.exam);
                };

                vm.selectFile = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {
                            isTeacherModal: function () {
                                return true;
                            }
                        }
                    }).result.then(function (fileData) {
                        Maturity.saveInspectionStatement(vm.exam).then(function (data) {
                            angular.extend(vm.exam.languageInspection.statement, data);
                            Files.upload('/app/attachment/exam/' + vm.exam.id + '/statement',
                                fileData.attachmentFile, {examId: vm.exam.id}, vm.exam.languageInspection.statement);
                        });
                    });
                };


            }

        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rGeneralInfo', {
        templateUrl: '/assets/app/review/assessment/general/generalInfo.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['ExamRes', 'Attachment', 'Assessment',
            function (ExamRes, Attachment, Assessment) {

                var vm = this;

                vm.$onInit = function () {
                    vm.participation = vm.exam.examParticipations[0];
                    var duration = moment.utc(new Date(vm.participation.duration));
                    if (duration.second() > 29) {
                        duration.add(1, 'minutes');
                    }
                    vm.participation.duration = duration.format('HH:mm');

                    vm.student = vm.participation.user;
                    vm.enrolment = vm.exam.examEnrolments[0];
                    vm.reservation = vm.enrolment.reservation;
                    Assessment.participationsApi.query({
                        eid: vm.exam.parent.id,
                        uid: vm.student.id
                    }, function (data) {
                        // Filter out the participation we are looking into
                        var previousParticipations = data.filter(function (p) {
                            return p.id !== vm.participation.id;
                        });
                        Assessment.noShowApi.query({eid: vm.exam.parent.id, uid: vm.student.id}, function (data) {
                            var noShows = data.map(function (d) {
                                return {noShow: true, started: d.reservation.startAt, exam: {state: 'no_show'}};
                            });
                            vm.previousParticipations = previousParticipations.concat(noShows);

                        });
                    });

                };

                vm.downloadExamAttachment = function () {
                    Attachment.downloadExamAttachment(vm.exam);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rParticipation', {
        templateUrl: '/assets/app/review/assessment/general/participation.template.html',
        bindings: {
            participation: '<'
        },
        controller: ['Exam',
            function (Exam) {

                var vm = this;

                vm.viewAnswers = function () {
                    window.open('/assessments/' + vm.participation.exam.id, '_blank');
                };

                vm.translateGrade = function () {
                    if (vm.participation.noShow ||!vm.participation.exam.grade) {
                        return;
                    }
                    return Exam.getExamGradeDisplayName(vm.participation.exam.grade.name);
                };

            }

        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rGrading', {
        templateUrl: '/assets/app/review/assessment/grading/grading.template.html',
        bindings: {
            exam: '<',
            user: '<',
            questionSummary: '<',
            onUpdate: '&'
        },
        controller: ['$translate', '$scope', 'Assessment', 'Exam', 'ExamRes', 'Attachment', 'Language', 'toast',
            function ($translate, $scope, Assessment, Exam, ExamRes, Attachment, Language, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.message = {};
                    vm.selections = {};
                    initGrade();
                    initCreditTypes();
                    initLanguages();
                };

                vm.getExamMaxPossibleScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return Exam.getTotalScore(vm.exam);
                };

                vm.inspectionDone = function () {
                    vm.onUpdate();
                };

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                vm.getTeacherCount = function () {
                    // Do not add up if user exists in both groups
                    var owners = vm.exam.parent.examOwners.filter(function (owner) {
                        return vm.exam.examInspections.map(function (inspection) {
                            return inspection.user.id;
                        }).indexOf(owner.id) === -1;
                    });
                    return vm.exam.examInspections.length + owners.length;
                };

                vm.sendEmailMessage = function () {
                    if (!vm.message.text) {
                        toast.error($translate.instant('sitnet_email_empty'));
                        return;
                    }
                    ExamRes.email.inspection({
                        eid: vm.exam.id,
                        msg: vm.message.text
                    }, function () {
                        toast.info($translate.instant('sitnet_email_sent'));
                        delete vm.message.text;
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.saveAssessmentInfo = function () {
                    Assessment.saveAssessmentInfo(vm.exam);
                };

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.exam);
                };

                vm.setGrade = function () {
                    if (vm.selections.grade &&
                        (vm.selections.grade.id || vm.selections.grade.type === 'NONE')) {
                        vm.exam.grade = vm.selections.grade;
                        vm.exam.gradeless = vm.selections.grade.type === 'NONE';
                    } else {
                        delete vm.exam.grade;
                        vm.exam.gradeless = false;
                    }
                };

                vm.setCreditType = function () {
                    if (vm.selections.type && vm.selections.type.type) {
                        vm.exam.creditType = {type: vm.selections.type.type};
                    } else {
                        delete vm.exam.creditType;
                    }
                };

                vm.setLanguage = function () {
                    vm.exam.answerLanguage = vm.selections.language ? {code: vm.selections.language.code} : undefined;
                };

                var initGrade = function () {
                    if (!vm.exam.grade || !vm.exam.grade.id) {
                        vm.exam.grade = {};
                    }
                    var scale = vm.exam.gradeScale || vm.exam.parent.gradeScale || vm.exam.course.gradeScale;
                    scale.grades = scale.grades || [];
                    vm.grades = scale.grades.map(function (grade) {
                        grade.type = grade.name;
                        grade.name = Exam.getExamGradeDisplayName(grade.name);

                        if (vm.exam.grade && vm.exam.grade.id === grade.id) {
                            vm.exam.grade.type = grade.type;
                            vm.selections.grade = grade;
                        }
                        return grade;
                    });
                    // The "no grade" option
                    var noGrade = {type: 'NONE', name: Exam.getExamGradeDisplayName('NONE')};
                    if (vm.exam.gradeless && !vm.selections.grade) {
                        vm.selections.grade = noGrade;
                    }
                    vm.grades.push(noGrade);
                };

                var initCreditTypes = function () {
                    Exam.refreshExamTypes().then(function (types) {
                        var creditType = vm.exam.creditType || vm.exam.examType;
                        vm.creditTypes = types;
                        types.forEach(function (type) {
                            if (creditType.id === type.id) {
                                // Reset also exam's credit type in case it was taken from its exam type. Confusing isn't it :)
                                vm.exam.creditType = vm.selections.type = type;
                            }
                        });
                    });
                    if (vm.exam.course && !vm.exam.customCredit) {
                        vm.exam.customCredit = vm.exam.course.credits;
                    }
                };

                var initLanguages = function () {
                    var lang = Assessment.pickExamLanguage(vm.exam);
                    if (!vm.exam.answerLanguage) {
                        vm.exam.answerLanguage = lang;
                    } else {
                        vm.exam.answerLanguage = {code: vm.exam.answerLanguage};
                    }
                    Language.languageApi.query(function (languages) {
                        vm.languages = languages.map(function (language) {
                            if (lang && lang.code === language.code) {
                                vm.selections.language = language;
                            }
                            language.name = Language.getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                $scope.$on('$localeChangeSuccess', function () {
                    initCreditTypes();
                    vm.grades.forEach(function (eg) {
                        eg.name = Exam.getExamGradeDisplayName(eg.type);
                    });
                });

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rInspection', {
        templateUrl: '/assets/app/review/assessment/grading/inspection.template.html',
        bindings: {
            inspection: '<',
            user: '<',
            disabled: '<',
            onInspection: '&'
        },
        controller: ['$translate', 'ExamRes', 'toast',
            function ($translate, ExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reviewStatuses = [
                        {
                            'key': true,
                            'value': $translate.instant('sitnet_ready')
                        },
                        {
                            'key': false,
                            'value': $translate.instant('sitnet_in_progress')
                        }
                    ];
                };

                vm.setInspectionStatus = function () {
                    if (vm.inspection.user.id === vm.user.id) {
                        ExamRes.inspectionReady.update({
                            id: vm.inspection.id,
                            ready: vm.inspection.ready
                        }, function (result) {
                            toast.info($translate.instant('sitnet_exam_updated'));
                            vm.inspection.ready = result.ready;
                            vm.onInspection();
                        }, function (error) {
                            toast.error(error.data);
                        });
                    }
                };

            }

        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rToolbar', {
        templateUrl: '/assets/app/review/assessment/grading/toolbar.template.html',
        bindings: {
            exam: '<',
            valid: '<'
        },
        controller: ['$translate', 'Assessment', 'Exam',
            function ($translate, Assessment, Exam) {

                var vm = this;

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                vm.isMaturityRejection = function () {
                    return vm.exam.executionType.type === 'MATURITY' &&
                        !vm.exam.subjectToLanguageInspection &&
                        vm.exam.grade &&
                        vm.exam.grade.marksRejection;
                };

                vm.saveAssessment = function () {
                    Assessment.saveAssessment(vm.exam, vm.isOwnerOrAdmin());
                };

                vm.createExamRecord = function () {
                    Assessment.createExamRecord(vm.exam, true);
                };

                vm.rejectMaturity = function () {
                    Assessment.rejectMaturity(vm.exam);
                };

                vm.getExitUrl = function () {
                    return Assessment.getExitUrl(vm.exam);
                };

            }

        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('rInspectionComment', {
        templateUrl: '/assets/app/review/assessment/maturity/dialogs/inspectionComment.template.html',
        bindings: {
            close: '&',
            dismiss: '&'
        },
        controller: ['$scope', 'Files', function ($scope, Files) {

            var vm = this;

            vm.$onInit = function () {
                vm.data = {comment: null};
            };

            vm.ok = function () {
                vm.close({
                    $value: {'comment': vm.data.comment}
                });
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function () {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });

        }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rMaturityGrading', {
        templateUrl: '/assets/app/review/assessment/maturity/grading.template.html',
        bindings: {
            exam: '<',
            user: '<',
            questionSummary: '<',
            onUpdate: '&'
        },
        controller: ['$translate', '$scope', 'Assessment', 'Exam', 'ExamRes', 'Attachment', 'Language', 'toast',
            function ($translate, $scope, Assessment, Exam, ExamRes, Attachment, Language, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.message = {};
                    vm.selections = {};
                    initGrade();
                    initCreditTypes();
                    initLanguages();
                };

                vm.isUnderLanguageInspection = function () {
                    return vm.user.isLanguageInspector &&
                        vm.exam.languageInspection &&
                        !vm.exam.languageInspection.finishedAt;
                };

                vm.hasGoneThroughLanguageInspection = function () {
                    return vm.exam.languageInspection && vm.exam.languageInspection.finishedAt;
                };

                vm.isAwaitingInspection = function () {
                    return vm.exam.languageInspection && !vm.exam.languageInspection.finishedAt;
                };

                vm.canFinalizeInspection = function () {
                    return vm.exam.languageInspection.statement && vm.exam.languageInspection.statement.comment;
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.downloadStatementAttachment = function () {
                    Attachment.downloadStatementAttachment(vm.exam);
                };

                vm.getExamMaxPossibleScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return Exam.getTotalScore(vm.exam);
                };

                vm.inspectionDone = function () {
                    vm.onUpdate();
                };

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                vm.sendEmailMessage = function () {
                    if (!vm.message.text) {
                        toast.error($translate.instant('sitnet_email_empty'));
                        return;
                    }
                    ExamRes.email.inspection({
                        eid: vm.exam.id,
                        msg: vm.message.text
                    }, function () {
                        toast.info($translate.instant('sitnet_email_sent'));
                        delete vm.message.text;
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.exam);
                };

                vm.setGrade = function () {
                    if (vm.selections.grade &&
                        (vm.selections.grade.id || vm.selections.grade.type === 'NONE')) {
                        vm.exam.grade = vm.selections.grade;
                        vm.exam.gradeless = vm.selections.grade.type === 'NONE';
                    } else {
                        delete vm.exam.grade;
                        vm.exam.gradeless = false;
                    }
                };

                vm.setCreditType = function () {
                    if (vm.selections.type && vm.selections.type.type) {
                        vm.exam.creditType = {type: vm.selections.type.type};
                    } else {
                        delete vm.exam.creditType;
                    }
                };

                vm.setLanguage = function () {
                    vm.exam.answerLanguage = vm.selections.language ? vm.selections.language.name : undefined;
                };

                var initGrade = function () {
                    if (!vm.exam.grade || !vm.exam.grade.id) {
                        vm.exam.grade = {};
                    }
                    var scale = vm.exam.gradeScale || vm.exam.parent.gradeScale || vm.exam.course.gradeScale;
                    scale.grades = scale.grades || [];
                    vm.grades = scale.grades.map(function (grade) {
                        grade.type = grade.name;
                        grade.name = Exam.getExamGradeDisplayName(grade.name);

                        if (vm.exam.grade && vm.exam.grade.id === grade.id) {
                            vm.exam.grade.type = grade.type;
                            vm.selections.grade = grade;
                        }
                        return grade;
                    });
                    // The "no grade" option
                    var noGrade = {type: 'NONE', name: Exam.getExamGradeDisplayName('NONE')};
                    if (vm.exam.gradeless && !vm.selections.grade) {
                        vm.selections.grade = noGrade;
                    }
                    vm.grades.push(noGrade);
                };

                var initCreditTypes = function () {
                    Exam.refreshExamTypes().then(function (types) {
                        var creditType = vm.exam.creditType || vm.exam.examType;
                        vm.creditTypes = types;
                        types.forEach(function (type) {
                            if (creditType.id === type.id) {
                                // Reset also exam's credit type in case it was taken from its exam type. Confusing isn't it :)
                                vm.exam.creditType = vm.selections.type = type;
                            }
                        });
                    });
                    if (vm.exam.course && !vm.exam.customCredit) {
                        vm.exam.customCredit = vm.exam.course.credits;
                    }
                };

                var initLanguages = function () {
                    var lang = Assessment.pickExamLanguage(vm.exam);
                    if (!vm.exam.answerLanguage) {
                        vm.exam.answerLanguage = lang;
                    }
                    Language.languageApi.query(function (languages) {
                        vm.languages = languages.map(function (language) {
                            if (lang && lang.code === language.code) {
                                vm.selections.language = language;
                            }
                            language.name = Language.getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                $scope.$on('$localeChangeSuccess', function () {
                    initCreditTypes();
                    vm.grades.forEach(function (eg) {
                        eg.name = Exam.getExamGradeDisplayName(eg.type);
                    });
                });

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rInspectionComments', {
        templateUrl: '/assets/app/review/assessment/maturity/inspectionComments.template.html',
        bindings: {
            exam: '<',
            addingDisabled: '<',
            addingVisible: '<'
        },
        controller: ['$uibModal', 'ExamRes',
            function ($modal, ExamRes) {

                var vm = this;

                vm.addInspectionComment = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'rInspectionComment'
                    }).result.then(function (params) {
                        ExamRes.inspectionComment.create({
                            id: vm.exam.id,
                            comment: params.comment
                        }, function (comment) {
                            vm.exam.inspectionComments.unshift(comment);
                        });
                    });
                };

            }

        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .service('Maturity', ['$q', '$resource', '$location', '$translate', 'dialogs', 'Assessment', 'Session', 'ExamRes', 'toast',
        function ($q, $resource, $location, $translate, dialogs, Assessment, Session, ExamRes, toast) {

            var self = this;

            var inspectionApi = $resource('/app/inspection', null, {'add': {method: 'POST'}});
            var approvalApi = $resource('/app/inspection/:id/approval', {id: '@id'}, {'update': {method: 'PUT'}});
            var statementApi = $resource('/app/inspection/:id/statement', {id: '@id'}, {'update': {method: 'PUT'}});

            var canFinalizeInspection = function (exam) {
                return exam.languageInspection.statement && exam.languageInspection.statement.comment;
            };

            var isUnderLanguageInspection = function (exam) {
                return Session.getUser().isLanguageInspector && exam.languageInspection && !exam.languageInspection.finishedAt;
            };

            var isMissingStatement = function (exam) {
                if (!isUnderLanguageInspection(exam)) {
                    return false;
                }
                return !exam.languageInspection.statement || !exam.languageInspection.statement.comment;
            };

            var isMissingFeedback = function (exam) {
                return !exam.examFeedback || !exam.examFeedback.comment;
            };

            var isAwaitingInspection = function (exam) {
                return exam.languageInspection && !exam.languageInspection.finishedAt;
            };

            var MATURITY_STATES = {
                NOT_REVIEWED: {id: 1, text: 'sitnet_not_reviewed'},
                REJECT_STRAIGHTAWAY: {id: 2, text: 'sitnet_reject_maturity', canProceed: true, warn: true},
                LANGUAGE_INSPECT: {id: 3, text: 'sitnet_send_for_language_inspection', canProceed: true},
                AWAIT_INSPECTION: {id: 4, text: 'sitnet_await_inspection'},
                REJECT_LANGUAGE: {
                    id: 5, text: 'sitnet_reject_maturity', canProceed: true, warn: true,
                    validate: canFinalizeInspection,
                    showHint: isMissingStatement,
                    hint: 'sitnet_missing_statement'
                },
                APPROVE_LANGUAGE: {
                    id: 6, text: 'sitnet_approve_maturity', canProceed: true,
                    validate: canFinalizeInspection,
                    showHint: isMissingStatement,
                    hint: 'sitnet_missing_statement'
                },
                MISSING_STATEMENT: {id: 9, text: 'sitnet_missing_statement'}
            };
            MATURITY_STATES.APPROVE_LANGUAGE.alternateState = MATURITY_STATES.REJECT_LANGUAGE;

            var isGraded = function (exam) {
                return exam.grade;
            };

            self.isMissingStatement = function (exam) {
                return isMissingStatement(exam);
            };

            self.saveInspectionStatement = function (exam) {
                var deferred = $q.defer();
                var statement = {
                    'id': exam.languageInspection.id,
                    'comment': exam.languageInspection.statement.comment
                };
                // Update comment
                statementApi.update(statement,
                    function (data) {
                        toast.info($translate.instant('sitnet_statement_updated'));
                        deferred.resolve(data);
                    }, function (error) {
                        toast.error(error.data);
                        deferred.reject(error.data);
                    });
                return deferred.promise;
            };

            self.getNextState = function (exam) {
                if (!isGraded(exam)) {
                    return MATURITY_STATES.NOT_REVIEWED;
                }
                if (isMissingFeedback(exam)) {
                    return MATURITY_STATES.MISSING_STATEMENT;
                }
                if (isUnderLanguageInspection(exam)) {
                    return MATURITY_STATES.APPROVE_LANGUAGE;
                }
                if (isAwaitingInspection(exam)) {
                    return MATURITY_STATES.AWAIT_INSPECTION;
                }
                var grade = exam.grade;
                var disapproved = !grade || grade.marksRejection;

                return disapproved ? MATURITY_STATES.REJECT_STRAIGHTAWAY :
                    MATURITY_STATES.LANGUAGE_INSPECT;
            };

            self.proceed = function (exam, alternate) {
                var state = self.getNextState(exam);
                if (state.alternateState && alternate) {
                    state = state.alternateState;
                }
                switch (state.id) {
                    case MATURITY_STATES.REJECT_STRAIGHTAWAY.id:
                        Assessment.rejectMaturity(exam);
                        break;
                    case MATURITY_STATES.LANGUAGE_INSPECT.id:
                        sendForLanguageInspection(exam);
                        break;
                    case MATURITY_STATES.REJECT_LANGUAGE.id:
                        finalizeLanguageInspection(exam, true);
                        break;
                    case MATURITY_STATES.APPROVE_LANGUAGE.id:
                        finalizeLanguageInspection(exam);
                        break;
                    case MATURITY_STATES.AWAIT_INSPECTION.id:
                        // Nothing to do
                        break;
                    default:
                        // Nothing to do
                        break;
                }
            };

            var sendForLanguageInspection = function (exam) {
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                    $translate.instant('sitnet_confirm_maturity_approval'));
                dialog.result.then(function () {
                    Assessment.saveFeedback(exam).then(function () {
                        var params = Assessment.getPayload(exam, 'GRADED');
                        ExamRes.review.update({id: exam.id}, params, function () {
                            inspectionApi.add({examId: exam.id}, function () {
                                toast.info($translate.instant('sitnet_sent_for_language_inspection'));
                                $location.path(Assessment.getExitUrl(exam));
                            });
                        }, function (error) {
                            toast.error(error.data);
                        });
                    });
                });
            };

            var finalizeLanguageInspection = function (exam, reject) {
                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                    $translate.instant('sitnet_confirm_language_inspection_approval'));
                dialog.result.then(function () {
                    var approved = !reject;
                    self.saveInspectionStatement(exam).then(function () {
                        approvalApi.update(
                            {id: exam.languageInspection.id, approved: approved},
                            function () {
                                toast.info($translate.instant('sitnet_language_inspection_finished'));
                                if (approved) {
                                    Assessment.createExamRecord(exam, false, 'inspections');
                                } else {
                                    Assessment.rejectMaturity(exam, false, 'inspections');
                                }
                            });
                    });
                });
            };

        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rMaturityToolbar', {
        templateUrl: '/assets/app/review/assessment/maturity/toolbar.template.html',
        bindings: {
            exam: '<',
            valid: '<'
        },
        controller: ['$translate', 'Maturity', 'Assessment', 'Session', 'Exam',
            function ($translate, Maturity, Assessment, Session, Exam) {

                var vm = this;

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isUnderLanguageInspection = function () {
                    return Session.getUser().isLanguageInspector &&
                        vm.exam.languageInspection &&
                        !vm.exam.languageInspection.finishedAt;
                };

                vm.saveAssessment = function () {
                    Assessment.saveAssessment(vm.exam, vm.isOwnerOrAdmin());
                };

                vm.getNextState = function () {
                    return Maturity.getNextState(vm.exam);
                };

                vm.proceed = function (alternate) {
                    Maturity.proceed(vm.exam, alternate);
                };

                vm.isMissingStatement = function () {
                    return Maturity.isMissingStatement(vm.exam);
                };

            }

        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('printedAssessment', {
        templateUrl: '/assets/app/review/assessment/print/printedAssessment.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$routeParams', '$document', '$sce', 'ExamRes', 'Question', 'Exam', 'Assessment', 'EXAM_CONF',
            'Session', 'Language',
            function ($routeParams, $document, $sce, ExamRes, Question, Exam, Assessment, EXAM_CONF, Session, Language) {

                var vm = this;

                vm.$onInit = function () {

                    var path = EXAM_CONF.TEMPLATES_PATH + 'review/assessment/print/templates/';
                    vm.templates = {
                        section: path + 'section.html',
                        multiChoice: path + 'multiChoice.html',
                        essay: path + 'essay.html',
                        clozeTest: path + 'clozeTest.html'
                    };

                    ExamRes.reviewerExam.get({eid: $routeParams.id},
                        function (exam) { //TODO: Some duplicates here, refactor some more
                            exam.examSections.forEach(function (es) {
                                es.sectionQuestions.filter(function (esq) {
                                    return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                                }).forEach(function (esq) {
                                    esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                                });
                            });

                            vm.questionSummary = Question.getQuestionAmounts(exam);
                            vm.exam = exam;
                            vm.user = Session.getUser();

                            vm.participation = vm.exam.examParticipations[0];
                            var duration = moment.utc(new Date(vm.participation.duration));
                            if (duration.second() > 29) {
                                duration.add(1, 'minutes');
                            }
                            vm.participation.duration = duration.format('HH:mm');

                            vm.student = vm.participation.user;
                            vm.enrolment = vm.exam.examEnrolments[0];
                            vm.reservation = vm.enrolment.reservation;
                            Assessment.participationsApi.query({
                                eid: vm.exam.parent.id,
                                uid: vm.student.id
                            }, function (data) {
                                // Filter out the participation we are looking into
                                var previousParticipations = data.filter(function (p) {
                                    return p.id !== vm.participation.id;
                                });
                                Assessment.noShowApi.query({
                                    eid: vm.exam.parent.id,
                                    uid: vm.student.id
                                }, function (data) {
                                    var noShows = data.map(function (d) {
                                        return {noShow: true, started: d.reservation.startAt, exam: {state: 'no_show'}};
                                    });
                                    vm.previousParticipations = previousParticipations.concat(noShows);
                                    $document.ready(function () {
                                        $('#vmenu').hide();
                                        var mainView = $('#mainView');
                                        mainView.css('margin', '0 15px');
                                        mainView.css('max-width', '1000px');

                                        MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
                                        setTimeout(function () {
                                            window.print();
                                        }, 2000);
                                    });
                                });
                            });

                        });
                };

                vm.translateGrade = function (participation) {
                    return !participation.exam.grade ? 'N/A' : Exam.getExamGradeDisplayName(participation.exam.grade.name);
                };

                vm.getGrade = function () {
                    return !vm.exam.grade ? 'N/A' : Exam.getExamGradeDisplayName(vm.exam.grade.name);
                };

                vm.getCreditType = function () {
                    return !vm.exam ? 'N/A' : Exam.getExamTypeDisplayName(vm.exam.examType.type);
                };

                vm.getLanguage = function () {
                    return !vm.exam ? 'N/A' : Language.getLanguageNativeName(Assessment.pickExamLanguage(vm.exam).code);
                };

                vm.getExamMaxPossibleScore = function () {
                    return Exam.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return Exam.getTotalScore(vm.exam);
                };

                vm.getTeacherCount = function () {
                    // Do not add up if user exists in both groups
                    var owners = vm.exam.parent.examOwners.filter(function (owner) {
                        return vm.exam.examInspections.map(function (inspection) {
                            return inspection.user.id;
                        }).indexOf(owner.id) === -1;
                    });
                    return vm.exam.examInspections.length + owners.length;
                };

                vm.displayQuestionText = function (sq) {
                    return $sce.trustAsHtml(sq.question.question);
                };

                vm.getWordCount = function (sq) {
                    if (!sq.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countWords(sq.essayAnswer.answer);
                };

                vm.getCharacterCount = function (sq) {
                    if (!sq.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countCharacters(sq.essayAnswer.answer);
                };

                vm.scoreWeightedMultipleChoiceAnswer = function (sq) {
                    if (sq.question.type !== 'WeightedMultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreWeightedMultipleChoiceAnswer(sq);
                };

                vm.scoreMultipleChoiceAnswer = function (sq) {
                    if (sq.question.type !== 'MultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreMultipleChoiceAnswer(sq);
                };

                vm.calculateMaxPoints = function (sq) {
                    return Question.calculateMaxPoints(sq);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rClozeTest', {
        templateUrl: '/assets/app/review/assessment/questions/clozeTest.template.html',
        bindings: {
            sectionQuestion: '<'
        },
        controller: ['$sce', 'Attachment',
            function ($sce, Attachment) {

                var vm = this;

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };

                vm.displayClozeTestScore = function () {
                    var max = vm.sectionQuestion.maxScore;
                    var score = vm.sectionQuestion.clozeTestAnswer.score;
                    return score.correctAnswers * max / (score.correctAnswers + score.incorrectAnswers).toFixed(2)
                        + ' / ' + max;
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rEssayQuestion', {
        templateUrl: '/assets/app/review/assessment/questions/essayQuestion.template.html',
        bindings: {
            exam: '<',
            sectionQuestion: '<',
            isScorable: '<',
            onScore: '&'
        },
        controller: ['$sce', '$translate', 'Assessment', 'Attachment', 'toast',
            function ($sce, $translate, Assessment, Attachment, toast) {

                var vm = this;

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };

                vm.downloadQuestionAnswerAttachment = function () {
                    return Attachment.downloadQuestionAnswerAttachment(vm.sectionQuestion, vm.exam.hash);
                };

                vm.insertEssayScore = function () {
                    Assessment.saveEssayScore(vm.sectionQuestion)
                        .then(function () {
                            toast.info($translate.instant('sitnet_graded'));
                            vm.onScore();
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.getWordCount = function () {
                    if (!vm.sectionQuestion.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countWords(vm.sectionQuestion.essayAnswer.answer);
                };

                vm.getCharacterCount = function () {
                    if (!vm.sectionQuestion.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countCharacters(vm.sectionQuestion.essayAnswer.answer);
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rMultiChoiceQuestion', {
        templateUrl: '/assets/app/review/assessment/questions/multiChoiceQuestion.template.html',
        bindings: {
            sectionQuestion: '<'
        },
        controller: ['$sce', 'Attachment', 'Question', 'EXAM_CONF',
            function ($sce, Attachment, Question, EXAM_CONF) {

                var vm = this;

                vm.$onInit = function () {
                    var path = EXAM_CONF.TEMPLATES_PATH + 'review/assessment/questions/';
                    vm.templates = {
                        multiChoiceAnswer: path + 'multiChoiceAnswer.template.html',
                        weightedMultiChoiceAnswer: path + 'weightedMultiChoiceAnswer.template.html'
                    };
                };

                vm.scoreWeightedMultipleChoiceAnswer = function () {
                    if (vm.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreWeightedMultipleChoiceAnswer(vm.sectionQuestion);
                };

                vm.scoreMultipleChoiceAnswer = function () {
                    if (vm.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreMultipleChoiceAnswer(vm.sectionQuestion);
                };

                vm.calculateMaxPoints = function () {
                    return Question.calculateMaxPoints(vm.sectionQuestion);
                };

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };


            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rExamSection', {
        templateUrl: '/assets/app/review/assessment/sections/examSection.template.html',
        bindings: {
            exam: '<',
            section: '<',
            isScorable: '<',
            index: '<',
            onScore: '&'
        },
        controller: ['$sce', 'Attachment',
            function ($sce, Attachment) {

                var vm = this;

                vm.scoreSet = function() {
                    vm.onScore();
                };

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };

                vm.displayClozeTestScore = function () {
                    var max = vm.sectionQuestion.maxScore;
                    var score = vm.sectionQuestion.clozeTestAnswer.score;
                    return score.correctAnswers * max / (score.correctAnswers + score.incorrectAnswers).toFixed(2)
                        + ' / ' + max;
                };
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('abortedExams', {
        templateUrl: '/assets/app/review/listing/dialogs/abortedExams.template.html',
        bindings: {
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', '$scope', 'ExamRes', 'toast', function ($translate, $scope, ExamRes, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.abortedExams = vm.resolve.abortedExams;
            };

            vm.permitRetrial = function (reservation) {
                ExamRes.reservation.update({id: reservation.id}, function () {
                    reservation.retrialPermitted = true;
                    toast.info($translate.instant('sitnet_retrial_permitted'));
                });
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function () {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });

        }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('archiveDownload', {
        templateUrl: '/assets/app/review/listing/dialogs/archiveDownload.template.html',
        bindings: {
            close: '&',
            dismiss: '&'
        },
        controller: ['$translate', 'toast', function ($translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.params = {startDate: new Date(), endDate: new Date()};
            };

            vm.startDateChanged = function (date) {
                vm.params.startDate = date;
            };

            vm.endDateChanged = function (date) {
                vm.params.endDate = date;
            };

            vm.ok = function () {
                var start, end;
                if (vm.params.startDate) {
                    start = moment(vm.params.startDate);
                }
                if (vm.params.endDate) {
                    end = moment(vm.params.endDate);
                }
                if (start && end && end < start) {
                    toast.error($translate.instant('sitnet_endtime_before_starttime'));
                } else {
                    vm.close({
                        $value: {
                            'start': start.format('DD.MM.YYYY'),
                            'end': end.format('DD.MM.YYYY')
                        }
                    });
                }
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };
        }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('reviewFeedback', {
        templateUrl: '/assets/app/review/listing/dialogs/feedback.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope', 'Assessment', function ($scope, Assessment) {

            var vm = this;

            vm.$onInit = function () {
                vm.exam = vm.resolve.exam;
            };

            vm.ok = function () {
                if (!vm.exam.examFeedback) {
                    vm.exam.examFeedback = {};
                }
                Assessment.saveFeedback(vm.exam);
                vm.close();
            };
            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function () {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });

        }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('noShows', {
        templateUrl: '/assets/app/review/listing/dialogs/noShows.template.html',
        bindings: {
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', '$scope', 'ExamRes', 'toast', function ($translate, $scope, ExamRes, toast) {

            //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.

            var vm = this;

            vm.$onInit = function () {
                vm.noShows = vm.resolve.noShows;
            };

            vm.permitRetrial = function (reservation) {
                ExamRes.reservation.update({id: reservation.id}, function () {
                    reservation.retrialPermitted = true;
                    toast.info($translate.instant('sitnet_retrial_permitted'));
                });
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function () {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });

        }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('reviewList', {
        templateUrl: '/assets/app/review/listing/reviewList.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$filter', '$q', '$translate', '$uibModal', 'dialogs', 'ExamRes', 'DateTime', 'Exam',
            'ReviewList', 'Files', 'EXAM_CONF', 'diffInMinutesToFilter', 'toast',
            function ($filter, $q, $translate, $modal, dialogs, ExamRes, DateTime, Exam, Review,
                      Files, EXAM_CONF, diffInMinutesToFilter, toast) {

                var vm = this;

                vm.applyFreeSearchFilter = function (key) {
                    var text = vm.data[key].filter;
                    var target = vm.data[key].items;
                    vm.data[key].filtered = Review.applyFilter(text, target);
                };

                var prepareView = function (items, view, setup) {
                    items.forEach(setup);
                    vm.data[view].items = vm.data[view].filtered = items;
                    vm.data[view].toggle = items.length > 0;
                };

                var filterByState = function (reviews, states) {
                    return reviews.filter(function (r) {
                        return states.indexOf(r.exam.state) > -1;
                    });
                };

                vm.$onInit = function () {
                    vm.pageSize = 30;

                    vm.templates = {
                        reviewStartedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/review_started.html',
                        speedReviewPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/speed_review.html',
                        languageInspectionPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/language_inspection.html',
                        gradedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/graded.html',
                        gradedLoggedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/graded_logged.html',
                        rejectedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/rejected.html',
                        archivedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/archived.html'
                    };

                    vm.selections = {graded: {all: false, page: false}, gradedLogged: {all: false, page: false}};

                    vm.data = {
                        started: {predicate: 'deadline'},
                        graded: {predicate: 'deadline'},
                        finished: {predicate: 'displayedGradingTime'},
                        inspected: {predicate: 'deadline'},
                        rejected: {predicate: 'displayedGradingTime'},
                        archived: {predicate: 'displayedGradingTime'}
                    };

                    ExamRes.examReviews.query({eid: vm.exam.id},
                        function (reviews) {
                            reviews.forEach(function (r) {
                                r.duration = diffInMinutesToFilter(r.started, r.ended);
                                if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                    r.isUnderLanguageInspection = true;
                                }
                            });

                            // ABORTED
                            vm.abortedExams = filterByState(reviews, ['ABORTED']);
                            // REVIEW STARTED
                            prepareView(filterByState(reviews, ['REVIEW', 'REVIEW_STARTED']), 'started', handleOngoingReviews);
                            // FINISHED
                            prepareView(filterByState(reviews, ['GRADED_LOGGED']), 'finished', handleGradedReviews);
                            // REJECTED
                            prepareView(filterByState(reviews, ['REJECTED']), 'rejected', handleGradedReviews);
                            // ARCHIVED
                            prepareView(filterByState(reviews, ['ARCHIVED']), 'archived', handleGradedReviews);
                            // GRADED
                            var gradedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' &&
                                    (!r.exam.languageInspection || r.exam.languageInspection.finishedAt);
                            });
                            prepareView(gradedReviews, 'graded', handleGradedReviews);
                            // IN LANGUAGE INSPECTION
                            var inspections = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' && r.exam.languageInspection &&
                                    !r.exam.languageInspection.finishedAt;
                            });
                            prepareView(inspections, 'inspected', handleGradedReviews);

                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );

                    // No-shows
                    ExamRes.noShows.query({eid: vm.exam.id}, function (noShows) {
                        vm.noShows = noShows;
                    });
                };

                vm.translateGrade = function (exam) {
                    var grade = exam.grade ? exam.grade.name : 'NONE';
                    return Exam.getExamGradeDisplayName(grade);
                };

                vm.selectAll = function (name, items) {
                    var override = resetSelections(name, 'all');
                    items.forEach(function (i) {
                        i.selected = !i.selected || override;
                    });
                };

                vm.selectPage = function (name, items, boxClass) {
                    var override = resetSelections(name, 'page');
                    var boxes = angular.element('.' + boxClass);
                    var ids = [];
                    angular.forEach(boxes, function (input) {
                        ids.push(parseInt(angular.element(input).val()));
                    });
                    // init all as not selected
                    if (override) {
                        items.forEach(function (i) {
                            i.selected = false;
                        });
                    }
                    var pageItems = items.filter(function (i) {
                        return ids.indexOf(i.exam.id) > -1;
                    });
                    pageItems.forEach(function (pi) {
                        pi.selected = !pi.selected || override;
                    });
                };

                vm.archiveSelected = function () {
                    var selection = getSelectedReviews(vm.data.finished.filtered);
                    if (!selection) {
                        return;
                    }
                    var ids = selection.map(function (r) {
                        return r.exam.id;
                    });
                    ExamRes.archive.update({ids: ids.join()}, function () {
                        vm.data.finished.items = vm.data.finished.items.filter(function (r) {
                            if (ids.indexOf(r.exam.id) > -1) {
                                vm.data.archived.items.push(r);
                                return false;
                            }
                            return true;
                        });
                        vm.applyFreeSearchFilter('archived');
                        vm.applyFreeSearchFilter('finished');
                        toast.info($translate.instant('sitnet_exams_archived'));
                    });
                };

                vm.sendSelectedToRegistry = function () {
                    var selection = getSelectedReviews(vm.data.graded.filtered);
                    if (!selection) {
                        return;
                    }
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_record_review'));

                    dialog.result.then(function (btn) {
                        var promises = [];
                        selection.forEach(function (r) {
                            promises.push(send(r));
                        });
                        $q.all(promises).then(function () {
                            toast.info($translate.instant('sitnet_results_send_ok'));
                        });
                    });
                };

                vm.printSelected = function (asReport) {
                    var selection = getSelectedReviews(vm.data.finished.filtered);
                    if (!selection) {
                        return;
                    }
                    var url = '/app/exam/record/export/';
                    if (asReport) {
                        url += 'report/';
                    }
                    var fileType = asReport ? '.xlsx' : '.csv';
                    var ids = selection.map(function (r) {
                        return r.exam.id;
                    });

                    Files.download(url + vm.exam.id,
                        $translate.instant('sitnet_grading_info') + '_' + $filter('date')(Date.now(), 'dd-MM-yyyy') + fileType,
                        {'childIds': ids}, true
                    );
                };

                var resetSelections = function (name, view) {
                    var scope = vm.selections[name];
                    var prev, next;
                    for (var k in scope) {
                        if (scope.hasOwnProperty(k)) {
                            if (k === view) {
                                scope[k] = !scope[k];
                                next = scope[k];
                            } else {
                                if (scope[k]) {
                                    prev = true;
                                }
                                scope[k] = false;
                            }
                        }
                    }
                    return prev && next;
                };

                var getSelectedReviews = function (items) {
                    var objects = items.filter(function (i) {
                        return i.selected;
                    });
                    if (objects.length === 0) {
                        toast.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }
                    return objects;
                };

                var send = function (review) {
                    var deferred = $q.defer();
                    var exam = review.exam;
                    var resource = exam.gradeless ? ExamRes.register : ExamRes.saveRecord;
                    if ((exam.grade || exam.gradeless) && exam.creditType && exam.answerLanguage) {
                        var examToRecord = {
                            'id': exam.id,
                            'state': 'GRADED_LOGGED',
                            'grade': exam.grade,
                            'customCredit': exam.customCredit,
                            'totalScore': exam.totalScore,
                            'creditType': exam.creditType,
                            'sendFeedback': true,
                            'answerLanguage': exam.answerLanguage
                        };

                        resource.add(examToRecord, function () {
                            review.selected = false;
                            review.displayedGradingTime = review.exam.languageInspection ?
                                review.exam.languageInspection.finishedAt : review.exam.gradedTime;
                            vm.data.graded.items.splice(vm.data.graded.items.indexOf(review), 1);
                            vm.data.finished.items.push(review);
                            vm.applyFreeSearchFilter('graded');
                            vm.applyFreeSearchFilter('finished');
                            deferred.resolve();
                        });
                    } else {
                        toast.error($translate.instant('sitnet_failed_to_record_review'));
                        deferred.reject();
                    }
                    return deferred.promise;
                };

                var handleOngoingReviews = function (review) {
                    Review.gradeExam(review.exam);
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

                var handleGradedReviews = function (r) {
                    r.displayedGradingTime = r.exam.languageInspection ?
                        r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                    r.displayedGrade = vm.translateGrade(r.exam);
                    r.displayedCredit = vm.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                };

                vm.printExamCredit = function (courseCredit, customCredit) {
                    return customCredit ? customCredit : courseCredit;
                };

                vm.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                vm.getAnswerAttachments = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'archiveDownload'
                    }).result.then(function (params) {
                        Files.download(
                            '/app/exam/' + vm.exam.id + '/attachments', vm.exam.id + '.tar.gz', params);
                    });
                };

                vm.openAborted = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        component: 'abortedExams',
                        resolve: {
                            abortedExams: function () {
                                return vm.abortedExams;
                            }
                        }
                    });
                };

                vm.openNoShows = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        component: 'noShows',
                        resolve: {
                            noShows: function () {
                                return vm.noShows;
                            }
                        }
                    });
                };

            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .service('ReviewList', ['Exam', 'lodash',
        function (Exam, lodash) {

            var self = this;

            self.gradeExam = function (exam) {
                if (!exam.grade || !exam.grade.id) {
                    exam.grade = {};
                }
                if (!exam.selectedGrade) {
                    exam.selectedGrade = {};
                }
                var scale = exam.gradeScale || exam.parent.gradeScale || exam.course.gradeScale;
                scale.grades = scale.grades || [];
                exam.selectableGrades = scale.grades.map(function (grade) {
                    grade.type = grade.name;
                    grade.name = Exam.getExamGradeDisplayName(grade.name);
                    if (exam.grade && exam.grade.id === grade.id) {
                        exam.grade.type = grade.type;
                        exam.selectedGrade = grade;
                    }
                    return grade;
                });
                var noGrade = {type: 'NONE', name: Exam.getExamGradeDisplayName('NONE')};
                if (exam.gradeless && !exam.selectedGrade) {
                    exam.selectedGrade = noGrade;
                }
                exam.selectableGrades.push(noGrade);
            };

            self.filterReview = function (filter, review) {
                if (!filter) {
                    return true;
                }
                var s = filter.toLowerCase();
                var name = lodash.get(review, 'user.firstName', '') + ' ' + lodash.get(review, 'user.lastName', '');
                return name.toLowerCase().indexOf(s) > -1
                    || lodash.get(review, 'user.email', '').toLowerCase().indexOf(s) > -1;
            };

            self.applyFilter = function (filter, items) {
                if (!filter) {
                    return items;
                }
                return items.filter(function (i) {
                    return self.filterReview(filter, i);
                });
            }

        }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('speedReview', {
        templateUrl: '/assets/app/review/listing/speedReview.template.html',
        controller: ['dialogs', '$q', '$route', '$routeParams', '$translate', 'ExamRes', 'Exam',
            'ReviewList', 'Files', '$uibModal', 'EXAM_CONF', 'toast',
            function (dialogs, $q, $route, $routeParams, $translate, ExamRes,
                      Exam, ReviewList, Files, $modal, EXAM_CONF, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.pageSize = 10;
                    vm.eid = $routeParams.id;

                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.examInfo = {
                            examOwners: exam.examOwners,
                            title: exam.course.code + ' ' + exam.name
                        };
                        ExamRes.examReviews.query({eid: $routeParams.id},
                            function (reviews) {
                                reviews.forEach(function (r) {
                                    r.duration = moment.utc(Date.parse(r.duration)).format('HH:mm');
                                    if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                        r.isUnderLanguageInspection = true;
                                    }
                                });
                                vm.examReviews = reviews.filter(function (r) {
                                    return r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED';
                                });
                                vm.examReviews.forEach(handleOngoingReviews);
                                vm.toggleReviews = vm.examReviews.length > 0;
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    });
                };

                vm.showFeedbackEditor = function (exam) {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        component: 'reviewFeedback',
                        resolve: {
                            exam: function () {
                                return exam;
                            }
                        }
                    });
                };

                vm.isAllowedToGrade = function (exam) {
                    return Exam.isOwnerOrAdmin(exam);
                };

                var getErrors = function (exam) {
                    var messages = [];
                    if (!vm.isAllowedToGrade(exam)) {
                        messages.push('sitnet_error_unauthorized');
                    }
                    if (!exam.creditType && !exam.examType) {
                        messages.push('sitnet_exam_choose_credit_type');
                    }
                    if (!exam.answerLanguage && exam.examLanguages.length !== 1) {
                        messages.push('sitnet_exam_choose_response_language');
                    }
                    return messages;
                };

                var gradeExam = function (review) {
                    var deferred = $q.defer();
                    var exam = review.exam;
                    var messages = getErrors(exam);
                    if (!exam.selectedGrade && !exam.grade.id) {
                        messages.push('sitnet_participation_unreviewed');
                    }
                    messages.forEach(function (msg) {
                        toast.warning($translate.instant(msg));
                    });
                    if (messages.length === 0) {
                        var grade;
                        if (exam.selectedGrade.type === 'NONE') {
                            grade = undefined;
                            exam.gradeless = true;
                        } else {
                            grade = exam.selectedGrade.id ? exam.selectedGrade : exam.grade;
                            exam.gradeless = false;
                        }
                        var data = {
                            'id': exam.id,
                            'state': 'GRADED',
                            'gradeless': exam.gradeless,
                            'grade': grade ? grade.id : undefined,
                            'customCredit': exam.customCredit,
                            'creditType': exam.creditType ? exam.creditType.type : exam.examType.type,
                            'answerLanguage': exam.answerLanguage ? exam.answerLanguage.code : exam.examLanguages[0].code
                        };
                        ExamRes.review.update({id: exam.id}, data, function () {
                            vm.examReviews.splice(vm.examReviews.indexOf(review), 1);
                            exam.gradedTime = new Date().getTime();
                            exam.grade = grade;
                            deferred.resolve();
                        }, function (error) {
                            toast.error(error.data);
                            deferred.reject();
                        });
                    } else {
                        deferred.reject();
                    }
                    return deferred.promise;
                };

                vm.isGradeable = function (exam) {
                    return exam && getErrors(exam).length === 0;
                };

                vm.hasModifications = function () {
                    if (vm.examReviews) {
                        return vm.examReviews.filter(function (r) {
                                return r.exam.selectedGrade &&
                                    (r.exam.selectedGrade.id || r.exam.selectedGrade.type === 'NONE') &&
                                    vm.isGradeable(r.exam);
                            }).length > 0;

                    }
                };

                vm.gradeExams = function () {
                    var reviews = vm.examReviews.filter(function (r) {
                        return r.exam.selectedGrade && r.exam.selectedGrade.type && vm.isGradeable(r.exam);
                    });
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                    dialog.result.then(function (btn) {
                        var promises = [];
                        reviews.forEach(function (r) {
                            promises.push(gradeExam(r));
                        });
                        $q.all(promises).then(function () {
                            toast.info($translate.instant('sitnet_saved'));
                        });
                    });
                };

                vm.isOwner = function (user, owners) {
                    var b = false;
                    if (owners) {
                        angular.forEach(owners, function (owner) {
                            if ((owner.firstName + ' ' + owner.lastName) === (user.firstName + ' ' + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                vm.importGrades = function () {
                    var ctrl = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        Files.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });
                        $scope.title = 'sitnet_import_grades_from_csv';
                        $scope.submit = function () {
                            Files.upload('/app/gradeimport', $scope.attachmentFile, {}, null, $modalInstance,
                                $route.reload);
                        };
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        console.log('closed');
                    });
                };

                vm.createGradingTemplate = function () {
                    var content = vm.examReviews.map(function (r) {
                        return [r.exam.id,
                                '',
                                '',
                                r.exam.totalScore + ' / ' + r.exam.maxScore,
                                r.user.firstName + ' ' + r.user.lastName,
                                r.user.userIdentifier]
                                .join() + ',\n';
                    }).reduce(function (a, b) {
                        return a + b;
                    }, '');
                    content = 'exam id,grade,feedback,total score,student,student id\n' + content;
                    var blob = new Blob([content], {type: 'text/csv;charset=utf-8'});
                    saveAs(blob, 'grading.csv');
                };

                var handleOngoingReviews = function (review) {
                    ReviewList.gradeExam(review.exam);
                    // FIXME: Seems evil
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

            }
        ]
    });

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.review')
    .component('essayAnswer', {
        templateUrl: '/assets/app/review/questions/assessment/essayAnswer.template.html',
        bindings: {
            answer: '<',
            editable: '<',
            action: '@',
            onSelection: '&'
        },
        controller: ['Assessment',
            function (Assessment) {

                var vm = this;

                vm.$onInit = function () {
                    vm.answer.expanded = true;
                    vm.answer.essayAnswer = vm.answer.essayAnswer || {};
                    vm.answer.essayAnswer.score = vm.answer.essayAnswer.evaluatedScore;
                };

                vm.getWordCount = function () {
                    return Assessment.countWords(vm.answer.essayAnswer.answer);
                };

                vm.getCharacterCount = function () {
                    return Assessment.countCharacters(vm.answer.essayAnswer.answer);
                };

                vm.saveScore = function () {
                    vm.onSelection({answer: vm.answer});
                };

                vm.isAssessed = function () {
                    return vm.answer.essayAnswer && parseFloat(vm.answer.essayAnswer.score) >= 0;
                };

                vm.displayMaxScore = function () {
                    return vm.answer.evaluationType === 'Points' ? vm.answer.maxScore : 1;
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('essayAnswers', {
        template:
        '<div class="top-row">\n' +
        '    <div class="col-md-12" ng-repeat="answer in $ctrl.answers">\n' +
        '        <essay-answer answer="answer" editable="$ctrl.editable" action="{{$ctrl.actionText}}" on-selection="$ctrl.assessEssay(answer)"></essay-answer>\n' +
        '    </div>\n' +
        '    <div ng-if="$ctrl.answers.length === 0" class="col-md-12">\n' +
        '        <div class="jumbotron padl20"><p class="lead">{{\'sitnet_no_answers_to_assess\' | translate }}</p></div>\n' +
        '    </div>\n' +
        '    <div ng-if="$ctrl.answers.length > 0" class="col-md-12 mart20 marb30">\n' +
        '        <button class="btn btn-success" ng-click="$ctrl.assessSelected()">{{ $ctrl.actionText | translate }} ({{$ctrl.countSelected()}})</button>\n' +
        '    </div>\n' +
        '</div>',
        bindings: {
            editable: '<',
            answers: '<',
            isPremature: '<',
            actionText: '@',
            onAssessed: '&'
        },
        controller: ['QuestionReview',
            function (QuestionReview) {

                var vm = this;

                vm.countSelected = function () {
                    if (!vm.answers) {
                        return 0;
                    }
                    return vm.answers.filter(QuestionReview.isAssessed).length;
                };

                vm.assessSelected = function () {
                    vm.onAssessed({answers: vm.answers.filter(QuestionReview.isAssessed)});
                };

                vm.assessEssay = function (answer) {
                    if (QuestionReview.isAssessed(answer)) {
                        vm.onAssessed({answers: [answer]});
                    }
                };


            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('questionAssessment', {
        templateUrl: '/assets/app/review/questions/assessment/questionAssessment.template.html',
        controller: ['$routeParams', '$q', '$sce', '$translate', 'QuestionReview', 'Assessment', 'Session', 'Attachment', 'toast',
            function ($routeParams, $q, $sce, $translate, QuestionReview, Assessment, Session, Attachment, toast) {

                var vm = this;

                var isLocked = function (answer) {
                    var states = ['REVIEW', 'REVIEW_STARTED'];
                    var exam = answer.examSection.exam;
                    var isInspector = exam.examInspections.map(function(ei) {
                        return ei.user.id;
                    }).indexOf(vm.user.id) > -1;
                    if (!isInspector) {
                        states.push('GRADED');
                    }
                    return states.indexOf(exam.state) === -1;
                };

                var setSelectedReview = function (review) {
                    vm.selectedReview = review;
                    vm.assessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0 && !isLocked(a);
                    });
                    vm.unassessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return !a.essayAnswer || a.essayAnswer.evaluatedScore === null && !isLocked(a);
                    });
                    vm.lockedAnswers = vm.selectedReview.answers.filter(function (a){
                        return isLocked(a);
                    });
                };

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.examId = $routeParams.id;
                    var ids = $routeParams.q || [];
                    QuestionReview.questionsApi.query({id: vm.examId, ids: ids}, function (data) {
                        data.forEach(function (r, i) {
                            r.selected = i === 0; // select the first in the list
                        });
                        vm.reviews = data;
                        if (vm.reviews.length > 0) {
                            setSelectedReview(vm.reviews[0]);

                            vm.sanitizeQuestion = function () {
                                return $sce.trustAsHtml(vm.selectedReview.question.question);
                            };

                            vm.getAssessedAnswerCount = function () {
                                return vm.assessedAnswers.length;;
                            };

                            vm.getUnassessedAnswerCount = function () {
                                return vm.unassessedAnswers.length;
                            };

                            vm.getLockedAnswerCount = function () {
                                return vm.lockedAnswers.length;
                            }

                        }
                    });
                };

                vm.questionSelected = function (index) {
                    setSelectedReview(vm.reviews[index]);
                };

                var saveEvaluation = function (answer) {
                    var deferred = $q.defer();
                    answer.essayAnswer.evaluatedScore = answer.essayAnswer.score;
                    Assessment.saveEssayScore(answer).then(function () {
                        toast.info($translate.instant('sitnet_graded'));
                        if (vm.assessedAnswers.indexOf(answer) === -1) {
                            vm.unassessedAnswers.splice(vm.unassessedAnswers.indexOf(answer), 1);
                            vm.assessedAnswers.push(answer);
                        }
                        deferred.resolve();
                    }, function (err) {
                        // Roll back
                        answer.essayAnswer.evaluatedScore = answer.essayAnswer.score;
                        toast.error(err.data);
                        deferred.resolve();
                    });
                    return deferred.promise;
                };

                vm.saveAssessments = function (answers) {
                    var promises = []
                    answers.forEach(function (a) {
                        promises.push(saveEvaluation(a));
                    });
                    $q.all(promises).then(function() {
                        vm.reviews = angular.copy(vm.reviews);
                    })
                };

                vm.isFinalized = function (review) {
                    return QuestionReview.isFinalized(review);
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.selectedReview.question);
                };
            }


        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('questionFlow', {
        templateUrl: '/assets/app/review/questions/flow/questionFlow.template.html',
        bindings: {
            reviews: '<',
            onSelection: '&'
        },
        controller: ['QuestionReview',
            function (QuestionReview) {

                var vm = this;

                var init = function () {
                    vm.unfinished = vm.reviews.filter(function(r) {
                        return !QuestionReview.isFinalized(r);
                    });
                    vm.finished = vm.reviews.filter(QuestionReview.isFinalized);
                };

                vm.$onInit = function () {
                    init();
                };

                vm.$onChanges = function (props) {
                    if (props.reviews) {
                        init();
                    }
                };

                vm.questionSelected = function (review) {
                    vm.unfinished.concat(vm.finished).forEach(function (r) {
                        r.selected = r.question.id === review.question.id;
                    });
                    vm.onSelection({index: vm.reviews.indexOf(review)});
                }

            }


        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('questionFlowCategory', {
        templateUrl: '/assets/app/review/questions/flow/questionFlowCategory.template.html',
        bindings: {
            categoryTitle: '@',
            reviews: '<',
            allDone: '<',
            onSelection: '&'
        },
        controller: ['$sce', '$filter', 'QuestionReview',
            function ($sce, $filter, QuestionReview) {

                var vm = this;

                vm.displayQuestionText = function (review) {
                    var truncate = function (content, offset) {
                        return $filter('truncate')(content, offset);
                    };

                    var text = truncate(review.question.question, 50);
                    return $sce.trustAsHtml(text);
                };

                vm.isFinalized = function (review) {
                    return QuestionReview.isFinalized(review);
                };

                vm.getAssessedAnswerCount = function (review) {
                    return vm.allDone ? 0 : QuestionReview.getAssessedAnswerCount(review);
                };

                vm.selectQuestion = function (review) {
                    vm.onSelection({review: review});
                };


            }


        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('questionReview', {
        templateUrl: '/assets/app/review/questions/listing/questionReview.template.html',
        bindings: {
            review: '<',
            onSelection: '&'
        },
        controller: ['$sce', 'QuestionReview',
            function ($sce, QuestionReview) {

                var vm = this;

                vm.getAssessedAnswerCount = function () {
                    return QuestionReview.getAssessedAnswerCount(vm.review);
                };

                vm.sanitizeQuestion = function () {
                    return $sce.trustAsHtml(vm.review.question.question);
                };

                vm.reviewSelected = function () {
                    vm.onSelection({id: vm.review.question.id, selected: vm.review.selected});
                };


            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('questionReviews', {
        templateUrl: '/assets/app/review/questions/listing/questionReviews.template.html',
        bindings: {
            examId: '<'
        },
        controller: ['$location', 'QuestionReview',
            function ($location, QuestionReview) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reviews = QuestionReview.questionsApi.query({id: vm.examId});
                    vm.selectedReviews = [];
                    vm.selectionToggle = false;
                };

                vm.onReviewSelection = function (id, selected) {
                    var index = vm.selectedReviews.indexOf(id);
                    if (selected && index === -1) {
                        vm.selectedReviews.push(id);
                    } else if (index > -1) {
                        vm.selectedReviews.splice(index, 1);
                    }
                };

                var removeSelections = function () {
                    vm.reviews.forEach(function (r) {
                        r.selected = false;
                    });
                    vm.selectedReviews = [];
                };

                var addSelections = function () {
                    vm.reviews.forEach(function (r) {
                        r.selected = true;
                    });
                    vm.selectedReviews = vm.reviews.map(function (r) {
                        return r.question.id;
                    });
                };

                vm.selectAll = function () {
                    vm.selectionToggle ? addSelections() : removeSelections();
                };

                vm.startReview = function () {
                    $location.path('/assessments/' + vm.examId + '/questions').search('q', vm.selectedReviews);
                }

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam.editor')
    .service('QuestionReview', ['$resource',
        function ($resource) {

            var self = this;

            self.questionsApi = $resource('/app/exam/:id/questions', {
                id: '@id'
            });

            self.isFinalized = function (review) {
                return !review ? false : review.answers.length === self.getAssessedAnswerCount(review);
            };

            self.isAssessed = function (answer) {
                return answer.selected && answer.essayAnswer && parseFloat(answer.essayAnswer.score) >= 0;
            };

            self.isEvaluated = function (answer) {
                return answer.selected && answer.essayAnswer && parseFloat(answer.essayAnswer.evaluatedScore) >= 0;
            };


            self.getAssessedAnswerCount = function (review) {
                if (!review) {
                    return 0;
                }
                return review.answers.filter(function (a) {
                    return a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0; //TODO: check this
                }).length;
            };

        }]);
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.session')
    .component('eula', {
        template: '<div id="sitnet-dialog">\n' +
        '\n' +
        '    <div class="student-message-dialog-wrapper-padding">\n' +
        '        <div class="student-enroll-dialog-wrap">\n' +
        '            <div class="student-enroll-title">{{\'sitnet_accept_useragreement\' | translate}}</div>\n' +
        '        </div>\n' +
        '        <div class="modal-body">\n' +
        '            <div ng-bind-html="$ctrl.settings.eula.value">\n' +
        '            </div>\n' +
        '        </div>\n' +
        '        <div class="student-message-dialog-footer">\n' +
        '            <div class="student-message-dialog-button-save">\n' +
        '                <button class="btn btn-sm btn-primary" ng-click="$ctrl.ok()">\n' +
        '                    {{\'sitnet_button_accept\' | translate}}\n' +
        '                </button>\n' +
        '            </div>\n' +
        '            <div class="student-message-dialog-button-cancel">\n' +
        '                <button class="btn btn-sm btn-danger pull-left" ng-click="$ctrl.cancel()">{{\'sitnet_button_decline\' | translate}}\n' +
        '                </button>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n',
        bindings: {
            close: '&',
            dismiss: '&'
        },
        controller: ['Settings',
            function (Settings) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.settings = {
                        eula: Settings.agreement.get()
                    };
                };

                ctrl.cancel = function () {
                    ctrl.dismiss({$value: 'cancel'});
                };

                ctrl.ok = function () {
                    ctrl.close();
                }
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.session')
    .component("logout", {
        controller: ['Session',
            function (Session) {
                Session.logout();
            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.session')
    .component('session', {
        templateUrl: '/assets/app/session/session.template.html',
        controller: ['$location', 'Session', '$rootScope',
            function ($location, Session, $rootScope) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.user = Session.getUser();
                    ctrl.credentials = {};
                    Session.setLoginEnv(ctrl);
                };

                $rootScope.$on('devLogout', function () {
                    $location.url($location.path());
                    ctrl.user = Session.getUser();
                    ctrl.credentials = {};
                    Session.setLoginEnv(ctrl);
                });

                $rootScope.$on('examStarted', function () {
                    ctrl.hideNavBar = true;
                });

                $rootScope.$on('examEnded', function () {
                    ctrl.hideNavBar = false;
                });

                // dev-mode login, not usable with production environment
                ctrl.login = function () {
                    Session.login(ctrl.credentials.username, ctrl.credentials.password)
                        .then(function (user) {
                            ctrl.user = user;
                        });
                };

            }
        ]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'';
'use strict';
angular.module('app.session')
    .service('Session', ['$q', '$interval', '$sessionStorage', '$translate', '$injector', '$location',
        '$rootScope', '$timeout', 'tmhDynamicLocale', 'EXAM_CONF', 'toast',
        function ($q, $interval, $sessionStorage, $translate, $injector, $location, $rootScope, $timeout,
                  tmhDynamicLocale, EXAM_CONF, toast) {

            var self = this;

            var PING_INTERVAL = 60 * 1000;

            var _user;
            var _env;
            var _scheduler;

            // Services need to be accessed like this because of circular dependency issues
            var $http;
            var http = function () {
                $http = $http || $injector.get('$http');
                return $http;
            };
            var $modal;
            var modal = function () {
                $modal = $modal || $injector.get('$uibModal');
                return $modal;
            };
            var $route;
            var route = function () {
                $route = $route || $injector.get('$route');
                return $route;
            };
            var UserRes;
            var userRes = function () {
                UserRes = UserRes || $injector.get('UserRes');
                return UserRes;
            };

            self.getUser = function () {
                return _user;
            };

            self.getUserName = function () {
                if (_user) {
                    return _user.firstName + ' ' + _user.lastName;
                }
            };

            self.setUser = function (user) {
                _user = user;
            };

            var hasRole = function (user, role) {
                if (!user || !user.loginRole) {
                    return false;
                }
                return user.loginRole.name === role;
            };

            var init = function () {
                var deferred = $q.defer();
                if (!_env) {
                    http().get('/app/settings/environment').success(function (data) {
                        _env = data;
                        deferred.resolve();
                    });
                } else {
                    deferred.resolve();
                }
                return deferred.promise;
            };

            self.setLoginEnv = function (scope) {
                init().then(function () {
                    if (!_env.isProd) {
                        scope.loginTemplatePath = EXAM_CONF.TEMPLATES_PATH + 'session/templates/dev_login.html';
                    }
                });
            };

            var hasPermission = function (user, permission) {
                if (!user) {
                    return false;
                }
                return user.permissions.some(function (p) {
                    return p.type === permission;
                });
            };

            var onLogoutSuccess = function (data) {
                $rootScope.$broadcast('userUpdated');
                toast.success($translate.instant('sitnet_logout_success'));
                window.onbeforeunload = null;
                var localLogout = window.location.protocol + '//' + window.location.host + '/Shibboleth.sso/Logout';
                if (data && data.logoutUrl) {
                    window.location.href = data.logoutUrl + '?return=' + localLogout;
                } else if (!_env || _env.isProd) {
                    // redirect to SP-logout directly
                    window.location.href = localLogout;
                } else {
                    // DEV logout
                    $location.path('/');
                    $rootScope.$broadcast('devLogout');
                }
                $timeout(toast.clear, 300);
            };

            self.logout = function () {
                if (!_user) {
                    return;
                }
                http().post('/app/logout').success(function (data) {
                    delete $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY];
                    delete http().defaults.headers.common;
                    _user = undefined;
                    onLogoutSuccess(data);
                }).error(function (error) {
                    toast.error(error.data);
                });
            };

            self.translate = function (lang) {
                $translate.use(lang);
                tmhDynamicLocale.set(lang);
            };

            self.openEulaModal = function (user) {
                modal().open({
                    backdrop: 'static',
                    keyboard: true,
                    component: 'eula'
                }).result.then(function () {
                    userRes().updateAgreementAccepted.update(function () {
                        user.userAgreementAccepted = true;
                        self.setUser(user);
                        if ($location.url() === '/login' || $location.url() === '/logout') {
                            $location.path('/');
                        } else {
                            route().reload();
                        }
                    }, function (error) {
                        toast.error(error.data);
                    });

                }, function () {
                    $location.path('/logout');
                });
            };

            self.openRoleSelectModal = function (user) {
                var ctrl = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                    $scope.user = user;
                    $scope.ok = function (role) {
                        userRes().userRoles.update({id: user.id, role: role.name}, function () {
                            user.loginRole = role;
                            user.isAdmin = hasRole(user, 'ADMIN');
                            user.isTeacher = hasRole(user, 'TEACHER');
                            user.isStudent = hasRole(user, 'STUDENT');
                            user.isLanguageInspector = user.isTeacher && hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                            self.setUser(user);
                            $modalInstance.dismiss();
                            $rootScope.$broadcast('userUpdated');
                            if (user.isStudent && !user.userAgreementAccepted) {
                                self.openEulaModal(user);
                            } else if ($location.url() === '/login' || $location.url() === '/logout') {
                                $location.path('/');
                            } else {
                                route().reload();
                            }
                        }, function (error) {
                            toast.error(error.data);
                            $location.path('/logout');
                        });

                    };
                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                        $location.path('/logout');
                    };
                }];
                var m = modal().open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'session/templates/select_role.html',
                    backdrop: 'static',
                    keyboard: false,
                    controller: ctrl,
                    resolve: {
                        user: function () {
                            return user;
                        }
                    }
                });

                m.result.then(function () {
                    console.log('closed');
                });
            };

            var redirect = function () {
                if ($location.path() === '/' && _user.isLanguageInspector) {
                    $location.path('/inspections');
                } else if (_env && !_env.isProd) {
                    $location.path(_user.isLanguageInspector ? '/inspections' : '/');
                }
            };

            var onLoginSuccess = function () {
                self.restartSessionCheck();
                $rootScope.$broadcast('userUpdated');
                var welcome = function () {
                    toast.options.positionClass = 'toast-top-center';
                    toast.success($translate.instant('sitnet_welcome') + ' ' + _user.firstName + ' ' + _user.lastName);
                    $timeout(function () {
                        toast.options.positionClass = 'toast-top-right';
                    }, 2500)
                };
                $timeout(welcome, 2000);
                if (!_user.loginRole) {
                    self.openRoleSelectModal(_user);
                } else if (_user.isStudent && !_user.userAgreementAccepted) {
                    self.openEulaModal(_user);
                } else {
                    redirect();
                    route().reload();
                }
            };

            var onLoginFailure = function (message) {
                $location.path('/');
                toast.error(message);
            };

            var processLoggedInUser = function (user) {
                var header = {};
                header[EXAM_CONF.AUTH_HEADER] = user.token;
                http().defaults.headers.common = header;
                user.roles.forEach(function (role) {
                    switch (role.name) {
                        case 'ADMIN':
                            role.displayName = 'sitnet_admin';
                            role.icon = 'fa-cog';
                            break;
                        case 'TEACHER':
                            role.displayName = 'sitnet_teacher';
                            role.icon = 'fa-university';
                            break;
                        case 'STUDENT':
                            role.displayName = 'sitnet_student';
                            role.icon = 'fa-graduation-cap';
                            break;
                    }
                });

                _user = {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    lang: user.lang,
                    loginRole: user.roles.length === 1 ? user.roles[0] : undefined,
                    roles: user.roles,
                    isLoggedOut: false,
                    token: user.token,
                    userAgreementAccepted: user.userAgreementAccepted,
                    userIdentifier: user.userIdentifier,
                    permissions: user.permissions
                };
                _user.isAdmin = hasRole(_user, 'ADMIN');
                _user.isStudent = hasRole(_user, 'STUDENT');
                _user.isTeacher = hasRole(_user, 'TEACHER');
                _user.isLanguageInspector = _user.isTeacher && hasPermission(user, 'CAN_INSPECT_LANGUAGE');

                $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY] = _user;
                self.translate(_user.lang);
            };

            self.login = function (username, password) {
                var credentials = {
                    username: username,
                    password: password
                };
                var deferred = $q.defer();
                http().post('/app/login', credentials, {ignoreAuthModule: true}).then(
                    function (user) {
                        processLoggedInUser(user.data);
                        onLoginSuccess();
                        deferred.resolve(_user);
                    }, function (error) {
                        onLoginFailure(error.data);
                        deferred.reject();
                    });
                return deferred.promise;
            };

            self.switchLanguage = function (lang) {
                if (!_user) {
                    self.translate(lang);
                } else {
                    http().put('/app/user/lang', {lang: lang}).success(function () {
                        _user.lang = lang;
                        self.translate(lang);
                    }).error(function () {
                        toast.error('failed to switch language');
                    });
                }
            };

            var checkSession = function () {
                http().get('/app/checkSession').success(function (data) {
                    if (data === 'alarm') {
                        toast.options = {
                            timeOut: 0,
                            preventDuplicates: true,
                            onclick: function () {
                                http().put('/app/extendSession', {}).success(function () {
                                    toast.info($translate.instant('sitnet_session_extended'));
                                    toast.options.timeout = 1000;
                                });
                            }
                        };
                        toast.warning($translate.instant('sitnet_continue_session'),
                            $translate.instant('sitnet_session_will_expire_soon'));
                    } else if (data === 'no_session') {
                        if (_scheduler) {
                            $interval.cancel(_scheduler);
                        }
                        self.logout();
                    }
                });
            };

            self.restartSessionCheck = function () {
                if (_scheduler) {
                    $interval.cancel(_scheduler);
                }
                _scheduler = $interval(checkSession, PING_INTERVAL);
            };

            $rootScope.$on('$destroy', function () {
                if (_scheduler) {
                    $interval.cancel(_scheduler);
                }
            });

        }
    ]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

angular.module('app.software')
    .component('software', {
        templateUrl: '/assets/app/software/software.template.html',
        controller: ['SoftwareRes', '$translate', 'toast',
            function (SoftwareRes, $translate, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.softwares = SoftwareRes.softwares.query();
                };

                vm.updateSoftware = function (software) {
                    SoftwareRes.update.update({id: software.id}, software,
                        function (updated_software) {
                            software = updated_software;
                            toast.info($translate.instant('sitnet_software_updated'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.addSoftware = function (name) {
                    SoftwareRes.add.insert({name: name}, function (software) {
                            toast.info($translate.instant('sitnet_software_added'));
                            vm.softwares.push(software);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.removeSoftware = function (software) {
                    SoftwareRes.software.remove({id: software.id},
                        function () {
                            toast.info($translate.instant('sitnet_software_removed'));
                            if (vm.softwares.indexOf(software) > -1) {
                                vm.softwares.splice(vm.softwares.indexOf(software), 1);
                            }
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

            }]
    });;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

(function () {
    'use strict';
    angular.module('app.software')
        .factory('SoftwareRes', ['$resource', function ($resource) {
            return {
                machines: $resource("/app/software_machine/:mid",
                    {
                        mid: "@mid"
                    },
                    {
                        "reset": {method: "PUT"}
                    }),

                machine: $resource("/app/machine/:mid/software/:sid",
                    {
                        mid: "@mid",
                        sid: "@sid"
                    },
                    {
                        "add": {method: "PUT"},
                        "toggle": {method: "POST"}
                    }),

                softwares: $resource("/app/softwares",
                    {
                    },
                    {
                        "query": {method: "GET", isArray:true}
                    }),

                software: $resource("/app/softwares/:id",
                    {
                        id: "@id"
                    },
                    {
                        "query": {method: "GET"},
                        "remove": {method: "DELETE"}
                    }),

                add: $resource("/app/softwares/add/:name",
                    {
                        name: "@name"
                    },
                    {
                        "insert": {method: "POST"}
                    }),

                update: $resource("/app/softwares/update/:id/:name",
                    {
                        id: "@id",
                        name: "@name"
                    },
                    {
                        "update": {method: "PUT"}
                    })
            };
        }]);
}());
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.utility')
    .service('Attachment', ['$resource', '$uibModal', 'dialogs', '$translate', 'Files', 'toast',
        function ($resource, $modal, dialogs, $translate, Files, toast) {

            var questionAttachmentApi = $resource(
                '/app/attachment/question/:id',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {id: '@id'}}
                });
            var questionAnswerAttachmentApi = $resource(
                '/app/attachment/question/:qid/answer/:hash',
                {
                    qid: '@qid',
                    hash: '@hash'
                },
                {
                    'remove': {method: 'DELETE', params: {qid: '@qid', hash: '@hash'}}
                });
            var examAttachmentApi = $resource(
                '/app/attachment/exam/:id',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {id: '@id'}}
                });
            var feedbackAttachmentApi = $resource(
                '/app/attachment/exam/:id/feedback',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {eid: '@id'}}
                });
            var statementAttachmentApi = $resource(
                '/app/attachment/exam/:id/statement',
                {
                    id: '@id'
                },
                {
                    'remove': {method: 'DELETE', params: {eid: '@id'}}
                });


            var self = this;

            self.removeQuestionAttachment = function (question) {
                question.attachment.removed = true;
            };

            self.eraseQuestionAttachment = function (question) {
               return questionAttachmentApi.remove({id: question.id}).$promise;
            };

            self.removeQuestionAnswerAttachment = function (question, hash) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    questionAnswerAttachmentApi.remove({qid: question.id, hash: hash},
                        function (answer) {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            question.essayAnswer.objectVersion = answer.objectVersion;
                            delete question.essayAnswer.attachment;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.removeExamAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    examAttachmentApi.remove({id: exam.id},
                        function () {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            exam.attachment = null;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.removeFeedbackAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    feedbackAttachmentApi.remove({id: exam.id},
                        function () {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            exam.examFeedback.attachment = null;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.removeStatementAttachment = function (exam) {

                var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                dialog.result.then(function (btn) {
                    statementAttachmentApi.remove({id: exam.id},
                        function () {
                            toast.info($translate.instant('sitnet_attachment_removed'));
                            delete exam.languageInspection.statement.attachment;
                        }, function (error) {
                            toast.error(error.data);
                        });
                });
            };

            self.downloadQuestionAttachment = function (question) {
                if (question.attachment.id) {
                    Files.download('/app/attachment/question/' + question.id, question.attachment.fileName);
                }
            };

            self.downloadQuestionAnswerAttachment = function (question, hash) {
                Files.download('/app/attachment/question/' + question.id + '/answer/' + hash,
                    question.essayAnswer.attachment.fileName);
            };

            self.downloadExamAttachment = function (exam) {
                Files.download('/app/attachment/exam/' + exam.id, exam.attachment.fileName);
            };

            self.downloadFeedbackAttachment = function (exam) {
                Files.download('/app/attachment/exam/' + exam.id + '/feedback', exam.examFeedback.attachment.fileName);
            };

            self.downloadStatementAttachment = function (exam) {
                Files.download('/app/attachment/exam/' + exam.id + '/statement', exam.languageInspection.statement.attachment.fileName);
            };

            self.getFileSize = function (attachment) {
                return attachment ? Math.round(attachment.size / 1000) + ' kB' : null;
            };

            self.selectFile = function (isTeacherModal, resolve) {
                var resolution = angular.extend({}, resolve);
                resolution.isTeacherModal = isTeacherModal;
                return $modal.open({
                    backdrop: 'static',
                    keyboard: true,
                    animation: true,
                    component: 'attachmentSelector',
                    resolve: resolution
                }).result;
            };


        }
    ]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.utility')
    .component('attachmentSelector', {
        templateUrl: '/assets/app/utility/attachment/dialogs/attachmentSelector.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope', 'Files', function ($scope, Files) {

            var vm = this;

            vm.$onInit = function () {
                vm.title = vm.resolve.title;
                vm.isTeacherModal = vm.resolve.isTeacherModal;
                Files.getMaxFilesize().then(function (data) {
                    vm.maxFileSize = data.filesize;
                });
            };

            vm.ok = function () {
                vm.close({
                    $value: {'attachmentFile': vm.attachmentFile}
                });
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function () {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });

        }]
    });
;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.utility')
    .factory('DateTime', ['$translate', function ($translate) {

        var printExamDuration = function (exam) {

            if (exam && exam.duration) {
                var h = Math.floor(exam.duration / 60);
                var m = exam.duration % 60;
                if (h === 0) {
                    return m + " min";
                } else if (m === 0) {
                    return h + " h";
                } else {
                    return h + " h " + m + " min";
                }
            } else {
                return "";
            }
        };

        var getDateForWeekday = function (ordinal) {
            var now = new Date();
            var distance = ordinal - now.getDay();
            return new Date(now.setDate(now.getDate() + distance));
        };

        var getWeekdayNames = function () {
            var lang = $translate.use();
            var locale = lang.toLowerCase() + "-" + lang.toUpperCase();
            var options = {weekday: 'short'};
            return [
                getDateForWeekday(1).toLocaleDateString(locale, options),
                getDateForWeekday(2).toLocaleDateString(locale, options),
                getDateForWeekday(3).toLocaleDateString(locale, options),
                getDateForWeekday(4).toLocaleDateString(locale, options),
                getDateForWeekday(5).toLocaleDateString(locale, options),
                getDateForWeekday(6).toLocaleDateString(locale, options),
                getDateForWeekday(0).toLocaleDateString(locale, options)
            ];
        };

        return {
            printExamDuration: printExamDuration,
            getDateForWeekday: getDateForWeekday,
            getWeekdayNames: getWeekdayNames
        };
    }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.utility')
    .component('datePicker', {
        templateUrl: '/assets/app/utility/date/datePicker.template.html',
        bindings: {
            onUpdate: '&',
            initialDate: '<?',
            extra: '<?',
            onExtraAction: '&?',
            extraText: '@?',
            modelOptions: '<?',
            optional: '<?'
        },
        controller: [
            function () {

                var vm = this;

                vm.$onInit = function () {
                    if (angular.isUndefined(vm.modelOptions)) {
                        vm.modelOptions = {};
                    }
                    vm.date = angular.isUndefined(vm.initialDate) ? new Date() : vm.initialDate;
                    vm.showWeeks = true;
                    vm.dateOptions = {
                        startingDay: 1
                    };
                    vm.format = 'dd.MM.yyyy';
                };

                vm.openPicker = function ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    vm.opened = true;
                };

                vm.dateChanged = function () {
                    vm.onUpdate({date: vm.date});
                };

                vm.extraClicked = function () {
                    vm.onExtraAction({date: vm.date});
                };


            }]
    });


;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.utility')

    .directive('sortable', [function () {
        return {
            restrict: 'A',
            scope: {
                onMove: '&',
                objects: '=',
                selection: '@selection'
            },
            link: function (scope, element, attrs) {
                var startIndex = -1;
                element.sortable({
                    items: scope.selection,
                    accept: 'section-handle',
                    start: function (event, ui) {
                        // on start we define where the item is dragged from
                        startIndex = ($(ui.item).index());
                    },
                    stop: function (event, ui) {
                        // on stop we determine the new index of the
                        // item and store it there
                        var newIndex = ($(ui.item).index());
                        var objToMove = scope.objects[startIndex];
                        scope.objects.splice(startIndex, 1);
                        scope.objects.splice(newIndex, 0, objToMove);
                        // we move items in the array, propagate update to angular as well
                        // since we're outside its lifecycle
                        scope.onMove({object: objToMove, from: startIndex, to: newIndex});
                    },
                    axis: 'y'
                });
            }
        };
    }])

    .directive('droppable', ['$translate', '$parse', 'toast', function ($translate, $parse, toast) {
        return {
            scope: {
                objects: '=',
                identifier: '=',
                onMove: '&',
                onCreate: '&'
            },
            link: function (scope, element, attrs) {

                var startIndex = -1;

                attrs.$observe('dropDisabled', function () {
                    var dropDisabled = $parse(attrs.dropDisabled)(scope);
                    initDroppable(scope, element, dropDisabled);
                });

                function initDroppable(scope, element, dropDisabled) {
                    element.droppable({
                        drop: function (event, ui) {
                            if (ui.draggable.hasClass('section-handle')) {
                                event.revert = true;
                                return;
                            }
                            if (dropDisabled) {
                                toast.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                                event.revert = true;
                            }
                            if (!ui.draggable.hasClass('draggable') && !ui.draggable.hasClass('sortable-' + scope.identifier)) {
                                toast.warning($translate.instant('sitnet_move_between_sections_disabled'));
                                event.revert = true;
                            }
                        }
                    });

                    element.sortable({
                        disabled: dropDisabled,
                        items: '.sortable-' + scope.identifier,
                        start: function (event, ui) {
                            startIndex = ($(ui.item).index());
                        },
                        stop: function (event, ui) {
                            var newIndex = ($(ui.item).index());
                            var toMove = scope.objects[startIndex];
                            if (!toMove) {
                                event.revert = true;
                                return;
                            }
                            scope.objects.splice(startIndex, 1);
                            scope.objects.splice(newIndex, 0, toMove);

                            // we move items in the array, propagate update to angular as well
                            // since we're outside its digest
                            scope.onMove({from: startIndex, to: newIndex});
                        },
                        axis: 'y'
                    });

                    element.disableSelection();

                }
            }
        };
    }]);

;/*
 * Copyright (c) 2017. Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.utility')
    .factory('Files', ['$q', '$http', '$translate', '$timeout', 'SettingsResource', 'toast',
        function ($q, $http, $translate, $timeout, SettingsResource, toast) {
            var _supportsBlobUrls;
            var _maxFileSize;

            var svg = new Blob(
                ['<svg xmlns=\'http://www.w3.org/2000/svg\'></svg>'],
                {type: 'image/svg+xml;charset=utf-8'}
            );
            var img = new Image();
            img.onload = function () {
                _supportsBlobUrls = true;
            };
            img.onerror = function () {
                _supportsBlobUrls = false;
            };
            img.src = URL.createObjectURL(svg);

            var saveFile = function (data, fileName, contentType) {
                if (!_supportsBlobUrls) {
                    window.open('data:' + contentType + ';base64,' + data);
                } else {
                    var byteString = atob(data);
                    var ab = new ArrayBuffer(byteString.length);
                    var ia = new Uint8Array(ab);
                    for (var i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    var blob = new Blob([ia], {type: contentType});
                    saveAs(blob, fileName);
                }
            };

            var download = function (url, filename, params, post) {
                var res = post ? $http.post : $http.get;
                res(url, {params: params}).success(function (data, status, headers) {
                    var contentType = headers()['content-type'].split(';')[0];
                    saveFile(data, filename, contentType);
                }).error(function (error) {
                    toast.error(error.data || error);
                });
            };

            var downloadUrl = function (url, filename, params) {
                var deferred = $q.defer();
                $http.get(url, {params: params}).success(function (data, status, headers) {
                    var contentType = headers()['content-type'].split(';')[0];
                    return deferred.resolve({url: 'data:' + contentType + ';base64, ' + data});
                }).error(function (error) {
                    toast.error(error.data || error);
                    return deferred.reject();
                });
                return deferred.promise;
            };

            var open = function (file, filename) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var f = reader.result;
                    window.open(f);
                };
                reader.readAsDataURL(file);
            };

            var getMaxFilesize = function () {
                var deferred = $q.defer();

                if (_maxFileSize) {
                    $timeout(function () {
                        return deferred.resolve({'filesize': _maxFileSize});
                    }, 10);
                }
                SettingsResource.maxFilesize.get(function (data) {
                    _maxFileSize = data.filesize;
                    return deferred.resolve(data);
                }, function (error) {
                    return deferred.reject(error);
                });
                return deferred.promise;
            };

            var isFileTooBig = function (file) {
                if (file.size > _maxFileSize) {
                    toast.error($translate.instant('sitnet_file_too_large'));
                    return true;
                }
                return false;
            };

            var doUpload = function (url, file, params, parent, modal, callback) {
                if (isFileTooBig(file)) {
                    return;
                }
                var fd = new FormData();
                fd.append('file', file);
                for (var k in params) {
                    if (params.hasOwnProperty(k)) {
                        fd.append(k, params[k]);
                    }
                }

                $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                })
                    .success(callback)
                    .error(function (error) {
                        if (modal) {
                            modal.dismiss();
                        }
                        toast.error(error);
                    });
            };

            var upload = function (url, file, params, parent, modal, callback) {
                doUpload(url, file, params, parent, modal, function (attachment) {
                    if (modal) {
                        modal.dismiss();
                    }
                    if (parent) {
                        parent.attachment = attachment;
                    }
                    if (callback) {
                        callback();
                    }
                });
            };

            var uploadAnswerAttachment = function (url, file, params, parent, modal) {
                doUpload(url, file, params, parent, modal, function (answer) {
                    if (modal) {
                        modal.dismiss();
                    }
                    parent.objectVersion = answer.objectVersion;
                    parent.attachment = answer.attachment;
                });
            };

            return {
                download: download,
                downloadUrl: downloadUrl,
                upload: upload,
                uploadAnswerAttachment: uploadAnswerAttachment,
                getMaxFilesize: getMaxFilesize,
                isFileTooBig: isFileTooBig,
                open: open
            };
        }]);


