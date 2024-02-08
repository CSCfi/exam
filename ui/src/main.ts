import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import '@angular/compiler'; // needed for dynamic cloze test component compilation
import { enableProdMode, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ToastrModule } from 'ngx-toastr';
import { AppComponent } from './app/app.component';
import { APP_ROUTES } from './app/app.routes';
import { AuthInterceptor } from './app/interceptors/auth-interceptor';
import { ErrorInterceptor } from './app/interceptors/error-interceptor';
import { ExaminationInterceptor } from './app/interceptors/examination-interceptor';
import { SessionService } from './app/session/session.service';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(
            CommonModule,
            TranslateModule.forRoot({
                loader: {
                    provide: TranslateLoader,
                    deps: [HttpClient],
                    useFactory: (http: HttpClient) => new TranslateHttpLoader(http, '/assets/i18n/'),
                },
            }),
            ToastrModule.forRoot({ preventDuplicates: true }),
        ),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ExaminationInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        {
            provide: LOCALE_ID,
            deps: [SessionService],
            useFactory: (srv: SessionService) => srv.getLocale(),
        },
        provideRouter(APP_ROUTES),
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations(),
    ],
}).catch((err) => console.error(err));
