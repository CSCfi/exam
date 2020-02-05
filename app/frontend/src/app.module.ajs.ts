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
import './administrative';
import './assets/styles/main.scss';
import './exam/editor';
import './exam/printout';
import 'angular-animate';
import 'angular-dialog-service';
import 'angular-dynamic-locale';
import 'angular-resource';
import 'angular-translate';
import 'angular-ui-bootstrap';
import 'bootstrap';
import 'font-awesome/css/font-awesome.min.css';
import 'ngstorage';
import 'toastr/toastr.scss';

import { upgradeModule } from '@uirouter/angular-hybrid';
import uiRouter from '@uirouter/angularjs';
import * as angularJS from 'angular';

import { AppComponent } from './app.component';
import configs from './app.config';
import * as directives from './app.directive';
import * as filters from './app.filter';
import runBlock from './app.run';
import states from './app.states';
import DashboardModule from './dashboard/dashboard.module.ajs';
import EnrolmentModule from './enrolment/enrolment.module.ajs';
import CollaborativeExamModule from './exam/collaborative';
import MaturityModuleAjs from './maturity/maturity.module.ajs';
import NavigationModuleAjs from './navigation/navigation.module.ajs';
import SessionModuleAjs from './session/session.module.ajs';
import UtilityModule from './utility/utility.module.ajs';

export const ajsApp = angularJS
    .module('app', [
        'ngAnimate',
        'ngResource',
        uiRouter,
        upgradeModule.name,
        'ngStorage',
        'ui.bootstrap',
        'pascalprecht.translate',
        'tmh.dynamicLocale',
        'dialogs.services',
        'dialogs.controllers',
        SessionModuleAjs,
        NavigationModuleAjs,
        MaturityModuleAjs,
        UtilityModule,
        EnrolmentModule,
        DashboardModule,
        CollaborativeExamModule,
        'app.exam.editor',
        'app.enrolment',
        'app.maturity',
        'app.administrative',
    ])
    .config(configs)
    .config(states)
    .run(runBlock)
    .component('examApp', AppComponent)
    .filter('truncate', filters.TruncateFilter.factory())
    .filter('diffInMinutesTo', filters.DiffInMinutesFilter.factory())
    .filter('diffInDaysToNow', filters.DiffInDaysFilter.factory())
    .filter('offset', filters.OffsetFilter.factory())
    .filter('pagefill', filters.PageFillFilter.factory())
    .filter('adjustdst', filters.AdjustDstFilter.factory())
    .directive('dateValidator', directives.DateValidator.factory())
    .directive('ckEditor', directives.CkEditor.factory())
    .directive('fixedPrecision', directives.FixedPrecision.factory())
    .directive('uiBlur', directives.UiBlur.factory())
    .directive('uiChange', directives.UiChange.factory())
    .directive('fileModel', directives.FileModel.factory())
    .directive('fileSelector', directives.FileSelector.factory())
    .directive('mathjax', directives.MathJaxLoader.factory())
    .directive('focusOn', directives.FocusOn.factory())
    .directive('lowercase', directives.Lowercase.factory())
    .directive('sort', directives.Sort.factory())
    .directive('teacherList', directives.TeacherList.factory());
