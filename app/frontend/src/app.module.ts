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
import 'angular-ui-bootstrap';
import 'font-awesome/css/font-awesome.min.css';
import 'ngstorage';
import 'toastr/toastr.scss';

import './administrative';
import './assets/styles/main.scss';
import './enrolment';
import './exam/printout';
import './maturity';

// Angular ->
import { CommonModule, Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { StorageServiceModule } from 'angular-webstorage-service';

import { AppComponent } from './app.component';
import configs from './app.config';
import * as directives from './app.directive';
import * as filters from './app.filter';
import runBlock from './app.run';
import DashboardModule from './dashboard';
import CollaborativeExamModule from './exam/collaborative';
import { AuthInterceptor } from './httpInterceptor';
import NavigationModule from './navigation';
import { NavigationComponent } from './navigation/navigation.component';
import { NavigationService } from './navigation/navigation.service';
import SessionModule from './session';
import { DevLoginComponent } from './session/dev/devLogin.component';
import { SessionService } from './session/session.service';
import UtilityModule from './utility';
import { FileService } from './utility/file/file.service';
import { WindowRef } from './utility/window/window.service';

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
    SessionModule,
    NavigationModule,
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

/*
    Bootstrap the AngularJS app
 */
@NgModule({
    imports: [
        BrowserModule,
        CommonModule,
        HttpClientModule,
        FormsModule,
        TranslateModule.forRoot(),
        NgbDropdownModule,
        NgbModalModule,
        StorageServiceModule,
        UpgradeModule,
    ],
    declarations: [
        NavigationComponent,
        DevLoginComponent
    ],
    entryComponents: [
        DevLoginComponent,
        NavigationComponent
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        Location,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        {
            // Provider for AJS translator so we can use it inside Angular
            provide: '$translate',
            useFactory: ($injector: any) => $injector.get('$translate'),
            deps: ['$injector']
        },
        WindowRef,
        FileService,
        SessionService,
        NavigationService
    ]
})
export class AppModule {
    constructor(private upgrade: UpgradeModule) { }
    ngDoBootstrap() {
        this.upgrade.bootstrap(document.body, ['app'], { strictDi: true });
    }
}

