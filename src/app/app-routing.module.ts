import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AloneCabinetComponent} from './alone-cabinet/alone-cabinet.component';
import {MultiCabinetComponent} from './multi-cabinet/multi-cabinet.component';

const routes: Routes = [
  {path: '', redirectTo: '/alone-cabinet', pathMatch: 'full'},
  {path: 'alone-cabinet', component: AloneCabinetComponent},
  {path: 'multi-cabinet', component: MultiCabinetComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
