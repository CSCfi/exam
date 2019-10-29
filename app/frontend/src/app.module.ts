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
import '@babel/polyfill';
import 'angular';
import 'angular-translate';

import { CommonModule, Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { CalendarModule } from './calendar/calendar.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EnrolmentModule } from './enrolment/enrolment.module';
import { ExamModule } from './exam/exam.module';
import { AuthInterceptor } from './httpInterceptor';
import { MaturityModule } from './maturity/maturity.module';
import { NavigationModule } from './navigation/navigation.module';
import { QuestionModule } from './question/question.module';
import { ReviewModule } from './review/review.module';
import { SessionModule } from './session/session.module';
import { SessionService } from './session/session.service';
import { UtilityModule } from './utility/utility.module';

// NOTE! AngularJS needs to be imported before Angular. Do not change this order of imports.
// Angular ->
@NgModule({
    imports: [
        BrowserModule,
        CommonModule,
        HttpClientModule,
        FormsModule,
        TranslateModule.forRoot(),
        UIRouterUpgradeModule.forRoot(),
        NgbModule,
        StorageServiceModule,
        UpgradeModule,
        SessionModule,
        NavigationModule,
        DashboardModule,
        ExamModule,
        EnrolmentModule,
        QuestionModule,
        UtilityModule,
        ReviewModule,
        CalendarModule,
        MaturityModule,
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        {
            provide: LOCALE_ID,
            deps: [SessionService],
            useFactory: srv => srv.getLocale(),
        },
        Location,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        // Provider for AJS translator, needed for switching language so that the change is visible also to AJS modules
        {
            provide: '$translate',
            useFactory: ($injector: any) => $injector.get('$translate'),
            deps: ['$injector'],
        },
        // Provider for AJS StateParams, needed until having switched to new router
        {
            provide: '$stateParams',
            useFactory: ($injector: any) => $injector.get('$stateParams'),
            deps: ['$injector'],
        },
        // Provider for AJS State Service, needed until having switched to new router
        {
            provide: '$state',
            useFactory: ($injector: any) => $injector.get('$state'),
            deps: ['$injector'],
        },
        // Provider for AJS Location service, needed until having switched to new router
        {
            provide: '$location',
            useFactory: ($injector: any) => $injector.get('$location'),
            deps: ['$injector'],
        },
    ],
})
export class AppModule {
    /*
        Bootstrap the AngularJS app
    */
    constructor(private upgrade: UpgradeModule) {}
    ngDoBootstrap() {
        // eslint-disable-next-line
        this.upgrade.bootstrap(document.body, ['app'], { strictDi: true });
    }
}
