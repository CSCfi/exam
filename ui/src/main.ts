import { enableProdMode, LOCALE_ID, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { HttpLoaderFactory } from './app/app.module';
import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { CalendarModule } from './app/calendar/calendar.module';
import { EnrolmentModule } from './app/enrolment/enrolment.module';
import { ExaminationModule } from './app/examination/examination.module';
import { StudentDashboardModule } from './app/dashboard/student/student-dashboard.module';
import { NavigationModule } from './app/navigation/navigation.module';
import { SessionModule } from './app/session/session.module';
import { SharedModule } from './app/shared/shared.module';
import { AppRoutingModule } from './app/app-routing.module';
import { ToastrModule } from 'ngx-toastr';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SessionService } from './app/session/session.service';
import { ErrorInterceptor } from './app/interceptors/error-interceptor';
import { ExaminationInterceptor } from './app/interceptors/examination-interceptor';
import { AuthInterceptor } from './app/interceptors/auth-interceptor';
import { HTTP_INTERCEPTORS, withInterceptorsFromDi, provideHttpClient, HttpClient } from '@angular/common/http';
import '@angular/compiler'; // needed for dynamic cloze test component compilation

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(CommonModule, TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient],
            },
        }), ToastrModule.forRoot({ preventDuplicates: true }), AppRoutingModule, SharedModule, SessionModule, NavigationModule, StudentDashboardModule, ExaminationModule, EnrolmentModule, CalendarModule),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ExaminationInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        {
            provide: LOCALE_ID,
            deps: [SessionService],
            useFactory: (srv: SessionService) => srv.getLocale(),
        },
        provideHttpClient(withInterceptorsFromDi()),
    ]
})
  .catch(err => console.error(err));
