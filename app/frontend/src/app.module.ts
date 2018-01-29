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
require('angular-resource');
require('angular-route');
require('ngstorage');

import configs from './app.config';
import runBlock from './app.run';
import SessionModule from './session';
import NavigationModule from './navigation';
import UtilityModule from './utility';
import CalendarModule from './calendar';
import * as filters from './app.filter';
import * as directives from './app.directive';
import {
    CkEditor, FixedPrecision, ClozeTest, UiBlur, UiChange, FileModel, FileSelector, MathJaxLoader, FocusOn,
    Lowercase, Sort, TeacherList
} from './app.directive';

require('./utility');
require('./dashboard');
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
    SessionModule,
    NavigationModule,
    UtilityModule,
    CalendarModule,
    'app.enrolment',
    'app.dashboard',
    'app.administrative',
    'app.software'
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
    .directive('ckEditor', CkEditor.factory())
    .directive('fixedPrecision', FixedPrecision.factory())
    .directive('clozeTest', ClozeTest.factory())
    .directive('uiBlur', UiBlur.factory())
    .directive('uiChange', UiChange.factory())
    .directive('fileModel', FileModel.factory())
    .directive('fileSelector', FileSelector.factory())
    .directive('mathjax', MathJaxLoader.factory())
    .directive('focusOn', FocusOn.factory())
    .directive('lowercase', Lowercase.factory())
    .directive('sort', Sort.factory())
    .directive('teacherList', TeacherList.factory());
