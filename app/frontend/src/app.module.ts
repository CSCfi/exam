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
import * as angular from 'angular';
import 'angular-resource';
import 'angular-route';
import 'angular-animate';
import 'angular-ui-bootstrap';
import 'ngstorage';
import 'angular-translate';
import 'angular-dialog-service';

import configs from './app.config';
import runBlock from './app.run';
import SessionModule from './session';
import NavigationModule from './navigation';
import UtilityModule from './utility';
import DashboardModule from './dashboard';
import * as filters from './app.filter';
import * as directives from './app.directive';

import './enrolment'; // TODO: make a proper exportable module
import './maturity'; // TODO: make a proper exportable module


import 'toastr/toastr.scss';
import 'font-awesome/css/font-awesome.min.css';
import './assets/styles/main.scss';

angular.module('app', [
    'ngAnimate',
    'ngResource',
    'ngRoute',
    'ngStorage',
    'ui.bootstrap',
    'pascalprecht.translate',
    'dialogs.services',
    'dialogs.controllers',
    SessionModule,
    NavigationModule,
    UtilityModule,
    DashboardModule,
    'app.enrolment',
    'app.maturity'
]).config(configs)
    .run(runBlock)
    .filter('truncate', filters.TruncateFilter)
    .filter('diffInMinutesTo', filters.DiffInMinutesFilter)
    .filter('diffInDaysToNow', filters.DiffInDaysFilter)
    .filter('offset', filters.OffsetFilter)
    .filter('pagefill', filters.PageFillFilter)
    .filter('adjustdst', filters.AdjustDstFilter)
    .directive('dateValidator', directives.DateValidator.factory())
    .directive('uniqueValue', directives.UniquenessValidator.factory())
    .directive('ckEditor', directives.CkEditor.factory())
    .directive('fixedPrecision', directives.FixedPrecision.factory())
    .directive('clozeTest', directives.ClozeTest.factory())
    .directive('uiBlur', directives.UiBlur.factory())
    .directive('uiChange', directives.UiChange.factory())
    .directive('fileModel', directives.FileModel.factory())
    .directive('fileSelector', directives.FileSelector.factory())
    .directive('mathjax', directives.MathJaxLoader.factory())
    .directive('focusOn', directives.FocusOn.factory())
    .directive('lowercase', directives.Lowercase.factory())
    .directive('sort', directives.Sort.factory())
    .directive('teacherList', directives.TeacherList.factory());
