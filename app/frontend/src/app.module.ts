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

// Angular ->
import { CommonModule, Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { StorageServiceModule } from 'angular-webstorage-service';

import { AuthInterceptor } from './httpInterceptor';
import { SessionService } from './session/session.service';
import { FileService } from './utility/file/file.service';
import { WindowRef } from './utility/window/window.service';
import { SortableDirective } from './utility/dragndrop/sortable.directive';
import { LanguageSelectorComponent } from './exam/editor/common/languageSelector.component';
import { LanguageService } from './utility/language/language.service';
import { ConfirmationDialogComponent } from './utility/dialogs/confirmationDialog.component';
import { ExamService } from './exam/exam.service';
import { QuestionService } from './question/question.service';
import { ConfirmationDialogService } from './utility/dialogs/confirmationDialog.service';
import { AttachmentService } from './utility/attachment/attachment.service';
import { SectionsListComponent } from './exam/editor/sections/sectionsList.component';
import { SectionComponent } from './exam/editor/sections/section.component.upgrade';
import { AttachmentSelectorComponent } from './utility/attachment/dialogs/attachmentSelector.component';
import { NavigationModule } from './navigation/navigation.module';
import { SessionModule } from './session/session.module';
import { QuestionModule } from './question/question.module';
import { UtilityModule } from './utility/utility.module';

@NgModule({
    imports: [
        BrowserModule,
        CommonModule,
        HttpClientModule,
        FormsModule,
        TranslateModule.forRoot(),
        NgbModule,
        StorageServiceModule,
        UpgradeModule,
        SessionModule,
        NavigationModule,
        QuestionModule,
        UtilityModule
    ],
    exports: [
        CommonModule,
        FormsModule
    ],
    declarations: [
        LanguageSelectorComponent,
        ConfirmationDialogComponent,
        SortableDirective,
        SectionsListComponent,
        SortableDirective,
        SectionComponent,
        AttachmentSelectorComponent
    ],
    entryComponents: [
        LanguageSelectorComponent,
        SectionsListComponent,
        AttachmentSelectorComponent,
        ConfirmationDialogComponent
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
        AttachmentService,
        FileService,
        ExamService,
        QuestionService,
        ConfirmationDialogService,
        SessionService,
        LanguageService
    ]
})
export class AppModule {
    /*
        Bootstrap the AngularJS app
    */
    constructor(private upgrade: UpgradeModule) { }
    ngDoBootstrap() {
        this.upgrade.bootstrap(document.body, ['app'], { strictDi: true });
    }
}

