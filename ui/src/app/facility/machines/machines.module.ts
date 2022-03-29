import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { UIRouterModule } from '@uirouter/angular';
import { UtilityModule } from '../../utility/utility.module';
import { MachineComponent } from './machine.component';
import { MachineListComponent } from './machineList.component';
import { MachineService } from './machines.service';

@NgModule({
    imports: [CommonModule, TranslateModule, NgbModule, UtilityModule, UIRouterModule],
    providers: [MachineService],
    declarations: [MachineListComponent, MachineComponent],
    exports: [MachineListComponent],
})
export class MachineModule {}
