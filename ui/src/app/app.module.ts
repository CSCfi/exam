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
import './assets/styles/main.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'toastr/toastr.scss';

import { CommonModule, Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CalendarModule } from './calendar/calendar.module';
import { StudentDashboardModule } from './dashboard/student/studentDashboard.module';
import { EnrolmentModule } from './enrolment/enrolment.module';
import { ExaminationModule } from './examination/examination.module';
import { AuthInterceptor } from './interceptors/httpAuthInterceptor';
import { ErrorInterceptor } from './interceptors/httpErrorInterceptor';
import { ExaminationInterceptor } from './interceptors/httpExaminationInterceptor';
import { NavigationModule } from './navigation/navigation.module';
import { SessionModule } from './session/session.module';
import { SessionService } from './session/session.service';
import { UtilityModule } from './utility/utility.module';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, '/assets/assets/i18n/');
}

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        CommonModule,
        HttpClientModule,
        FormsModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient],
            },
        }),
        NgbModule,
        AppRoutingModule,
        UtilityModule,
        SessionModule,
        NavigationModule,
        StudentDashboardModule,
        ExaminationModule,
        EnrolmentModule,
        CalendarModule,
    ],
    declarations: [AppComponent],
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
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
