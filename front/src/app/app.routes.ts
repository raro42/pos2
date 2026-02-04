import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { roleGuard, adminGuard, tableAccessGuard, orderAccessGuard } from './auth/role.guard';

export const routes: Routes = [
  // Public routes
  { path: 'login', loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./auth/register.component').then(m => m.RegisterComponent) },
  { path: 'menu/:token', loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent) },

  // Protected routes - accessible by all authenticated users
  { path: '', canActivate: [authGuard], loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },

  // Products - all roles can view, but editing is handled in component
  { path: 'products', canActivate: [authGuard], loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent) },
  { path: 'catalog', canActivate: [authGuard], loadComponent: () => import('./catalog/catalog.component').then(m => m.CatalogComponent) },

  // Tables - owner, admin, waiter, receptionist
  { path: 'tables', canActivate: [authGuard, tableAccessGuard], loadComponent: () => import('./tables/tables.component').then(m => m.TablesComponent) },
  { path: 'tables/canvas', canActivate: [authGuard, adminGuard], loadComponent: () => import('./tables/tables-canvas.component').then(m => m.TablesCanvasComponent) },

  // Orders - all roles can view (but actions are permission-controlled)
  { path: 'orders', canActivate: [authGuard, orderAccessGuard], loadComponent: () => import('./orders/orders.component').then(m => m.OrdersComponent) },

  // Admin-only routes
  { path: 'translations', redirectTo: 'settings', pathMatch: 'full' },
  { path: 'settings', canActivate: [authGuard, adminGuard], loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'users', canActivate: [authGuard, adminGuard], loadComponent: () => import('./users/users.component').then(m => m.UsersComponent) },

  // Inventory module (lazy loaded) - admin only
  { path: 'inventory', canActivate: [authGuard, adminGuard], loadChildren: () => import('./inventory/inventory.routes').then(m => m.INVENTORY_ROUTES) },

  { path: '**', redirectTo: '' }
];
