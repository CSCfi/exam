/*
 * Copyright (c) 2018 Exam Consortium
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
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TruncatingPipe } from '../utility/truncate/truncate.pipe';
import { AttachmentSelectorComponent } from './attachment/dialogs/attachmentSelector.component';
import { AttachmentService } from './attachment/attachment.service';
import { DateTimeService } from './date/date.service';
import { DatePickerComponent } from './date/datePicker.component';
import { ConfirmationDialogComponent } from './dialogs/confirmationDialog.component';
import { ConfirmationDialogService } from './dialogs/confirmationDialog.service';
import { SortableDirective } from './dragndrop/sortable.directive';
import { FileService } from './file/file.service';
import { HistoryBackComponent } from './history/historyBack.component';
import { LanguageService } from './language/language.service';
import { UserService } from './user/user.service';

@NgModule({
    imports: [
        TranslateModule,
    ],
    declarations: [
        AttachmentSelectorComponent,
        ConfirmationDialogComponent,
        DatePickerComponent,
        HistoryBackComponent,
        SortableDirective,
        TruncatingPipe,
    ],
    entryComponents: [
        AttachmentSelectorComponent,
        ConfirmationDialogComponent,
        DatePickerComponent,
        HistoryBackComponent
    ],
    providers: [
        AttachmentService,
        ConfirmationDialogService,
        DatePickerComponent,
        DateTimeService,
        FileService,
        LanguageService,
        UserService
    ]
})
export class UtilityModule { }
