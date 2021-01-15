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
import 'angular';
import 'angular-translate';

import { CommonModule, Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UpgradeModule } from '@angular/upgrade/static';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';

import { CalendarModule } from './calendar/calendar.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EnrolmentModule } from './enrolment/enrolment.module';
import { ExamModule } from './exam/exam.module';
import { ExaminationModule } from './examination/examination.module';
import { AuthInterceptor } from './interceptors/httpAuthInterceptor';
import { MaturityModule } from './maturity/maturity.module';
import { NavigationModule } from './navigation/navigation.module';
import { QuestionModule } from './question/question.module';
import { ReviewModule } from './review/review.module';
import { SessionModule } from './session/session.module';
import { SessionService } from './session/session.service';
import { UtilityModule } from './utility/utility.module';
<<<<<<< HEAD
import { AdministrativeModule } from './administrative/administrative.module';
=======
import { ExaminationInterceptor } from './interceptors/httpExaminationInterceptor';
import { ErrorInterceptor } from './interceptors/httpErrorInterceptor';
>>>>>>> Http interceptor & exan summary migration

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        CommonModule,
        HttpClientModule,
        FormsModule,
        TranslateModule.forRoot(),
        UIRouterUpgradeModule.forRoot(),
        NgbModule,
        UpgradeModule,
        SessionModule,
        NavigationModule,
        DashboardModule,
        ExamModule,
        ExaminationModule,
        EnrolmentModule,
        QuestionModule,
        UtilityModule,
        ReviewModule,
        CalendarModule,
        MaturityModule,
        AdministrativeModule,
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ExaminationInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        {
            provide: LOCALE_ID,
            deps: [SessionService],
            useFactory: (srv: SessionService) => srv.getLocale(),
        },
        Location,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        // Provider for AJS translator, needed for switching language so that the change is visible also to AJS modules
        {
            provide: '$translate',
            useFactory: ($injector: any) => $injector.get('$translate'),
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
