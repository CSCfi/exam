import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SettingsComponent } from './settings.component';

@NgModule({
    entryComponents: [SettingsComponent],
    declarations: [SettingsComponent],
    imports: [TranslateModule, CommonModule, FormsModule, NgbModule],
    exports: [SettingsComponent],
})
export class SettingsModule {}
