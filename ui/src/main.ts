import { enableProdMode, importProvidersFrom, LOCALE_ID } from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import '@angular/compiler'; // needed for dynamic cloze test component compilation
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule } from './app/app-routing.module';
import { AppComponent } from './app/app.component';
import { HttpLoaderFactory } from './app/app.module';
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
                    useFactory: HttpLoaderFactory,
                    deps: [HttpClient],
                },
            }),
            ToastrModule.forRoot({ preventDuplicates: true }),
            AppRoutingModule,
        ),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ExaminationInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        {
            provide: LOCALE_ID,
            deps: [SessionService],
            useFactory: (srv: SessionService) => srv.getLocale(),
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations(),
    ],
}).catch((err) => console.error(err));
