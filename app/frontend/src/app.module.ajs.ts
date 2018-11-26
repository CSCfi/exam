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
// NOTE! AngularJS needs to be imported before Angular. Do not change this order of imports.
import * as angularJS from 'angular';
import 'angular-translate';
import 'angular-animate';
import 'angular-dialog-service';
import 'angular-dynamic-locale';
import 'angular-resource';
import 'angular-route';
import 'bootstrap';
import 'angular-ui-bootstrap';
import 'font-awesome/css/font-awesome.min.css';
import 'ngstorage';
import 'toastr/toastr.scss';

import './administrative';
import './assets/styles/main.scss';
import './enrolment';
import './exam/printout';
import './maturity';

import { AppComponent } from './app.component';
import configs from './app.config';
import * as directives from './app.directive';
import * as filters from './app.filter';
import runBlock from './app.run';
import DashboardModule from './dashboard';
import CollaborativeExamModule from './exam/collaborative';
import NavigationModuleAjs from './navigation/navigation.module.ajs';
import SessionModuleAjs from './session/session.module.ajs';
import UtilityModule from './utility/utility.module.ajs';

angularJS.module('app', [
    'ngAnimate',
    'ngResource',
    'ngRoute',
    'ngStorage',
    'ui.bootstrap',
    'pascalprecht.translate',
    'tmh.dynamicLocale',
    'dialogs.services',
    'dialogs.controllers',
    SessionModuleAjs,
    NavigationModuleAjs,
    UtilityModule,
    DashboardModule,
    CollaborativeExamModule,
    'app.enrolment',
    'app.maturity',
    'app.administrative'
]).config(configs)
    .run(runBlock)
    .component('examApp', AppComponent)
    .filter('truncate', filters.TruncateFilter.factory())
    .filter('diffInMinutesTo', filters.DiffInMinutesFilter.factory())
    .filter('diffInDaysToNow', filters.DiffInDaysFilter.factory())
    .filter('offset', filters.OffsetFilter.factory())
    .filter('pagefill', filters.PageFillFilter.factory())
    .filter('adjustdst', filters.AdjustDstFilter.factory())
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
