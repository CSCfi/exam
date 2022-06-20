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
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LOCALE_ID, NgModule } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StudentDashboardModule } from './dashboard/student/student-dashboard.module';
import { EnrolmentModule } from './enrolment/enrolment.module';
import { ExaminationModule } from './examination/examination.module';
import { AuthInterceptor } from './interceptors/auth-interceptor';
import { ErrorInterceptor } from './interceptors/error-interceptor';
import { ExaminationInterceptor } from './interceptors/examination-interceptor';
import { NavigationModule } from './navigation/navigation.module';
import { SessionModule } from './session/session.module';
import { SessionService } from './session/session.service';
import { SharedModule } from './shared/shared.module';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, '/assets/i18n/');
}

@NgModule({
    imports: [
        CommonModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient],
            },
        }),
        ToastrModule.forRoot({ preventDuplicates: true }),
        AppRoutingModule,
        SharedModule,
        SessionModule,
        NavigationModule,
        StudentDashboardModule,
        ExaminationModule,
        EnrolmentModule,
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
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
