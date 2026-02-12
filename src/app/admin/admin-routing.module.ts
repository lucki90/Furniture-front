import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PriceListComponent } from './price/components/price-list/price-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'prices',
    pathMatch: 'full'
  },
  {
    path: 'prices',
    component: PriceListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
