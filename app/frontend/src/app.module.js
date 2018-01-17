/*
 * Copyright (c) 2017 Exam Consortium
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

require('angular');
require('angular-resource');
require('angular-route');
require('ngstorage');

import configs from './app.config';
import constants from './app.constant';
import run from './app.run';
require('./session');
require('./utility');
require('./dashboard');
require('./navigation');
require('./reservation');
require('./maturity');
require('./enrolment/enrolment.module');
require('./administrative/administrative.module');
require('./software/software.module');

require('toastr/toastr.scss');
require('font-awesome/css/font-awesome.min.css');
require('./assets/styles/main.scss');

angular.module('app', [
    'ngResource',
    'ngRoute',
    'ngStorage',
    'app.session',
    'app.navigation',
    'app.enrolment',
    'app.dashboard',
    'app.administrative',
    'app.software'
]).constant('EXAM_CONF', constants).config(configs).run(run);

require('./app.directive');
require('./app.filter');
