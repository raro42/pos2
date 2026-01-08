import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService, User } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="layout" [class.sidebar-open]="sidebarOpen()">
      <!-- Mobile Header -->
      <header class="mobile-header">
        <button class="menu-btn" (click)="toggleSidebar()">
          <span class="menu-icon">☰</span>
        </button>
        <h1>POS System</h1>
      </header>

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>POS System</h2>
          <button class="close-btn" (click)="toggleSidebar()">×</button>
        </div>
        
        <nav class="nav-menu">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item" (click)="closeSidebar()">
            <span class="nav-icon">🏠</span>
            <span class="nav-text">Home</span>
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
            <span class="nav-icon">📦</span>
            <span class="nav-text">Products</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            @if (user()) {
              <span class="user-email">{{ user()?.email }}</span>
              <span class="user-tenant">Tenant #{{ user()?.tenant_id }}</span>
            }
          </div>
          <button class="logout-btn" (click)="logout()">
            <span class="nav-icon">🚪</span>
            <span class="nav-text">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Overlay for mobile -->
      <div class="overlay" (click)="closeSidebar()"></div>

      <!-- Main Content -->
      <main class="main-content">
        <div class="content-header">
          <h1>Welcome</h1>
        </div>

        <div class="content-body">
          <div class="welcome-card">
            <div class="welcome-icon">👋</div>
            <h2>Welcome to POS System</h2>
            @if (user()) {
              <p class="welcome-user">Logged in as <strong>{{ user()?.email }}</strong></p>
            }
            <p class="welcome-text">Manage your point of sale operations from this dashboard.</p>
            
            <div class="quick-actions">
              <a routerLink="/products" class="action-card">
                <span class="action-icon">📦</span>
                <span class="action-label">Products</span>
                <span class="action-desc">Manage your inventory</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%);
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, #252542 0%, #1a1a2e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
      left: 0;
      top: 0;
      z-index: 1000;
      box-shadow: 4px 0 15px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 1.25rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .close-btn {
      display: none;
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
    }

    .nav-menu {
      flex: 1;
      padding: 1rem 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 0.875rem 1.5rem;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }

    .nav-item.active {
      background: rgba(102, 126, 234, 0.15);
      color: #667eea;
      border-left-color: #667eea;
    }

    .nav-icon {
      margin-right: 0.75rem;
      font-size: 1.25rem;
    }

    .nav-text {
      font-size: 0.95rem;
    }

    .sidebar-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-info {
      margin-bottom: 1rem;
    }

    .user-email {
      display: block;
      font-size: 0.9rem;
      color: white;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-tenant {
      display: block;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Main Content */
    .main-content {
      flex: 1;
      margin-left: 260px;
      padding: 2rem;
    }

    .content-header {
      margin-bottom: 2rem;
    }

    .content-header h1 {
      margin: 0;
      color: white;
      font-size: 1.75rem;
    }

    .content-body {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 16px;
      padding: 2rem;
    }

    /* Welcome Card */
    .welcome-card {
      text-align: center;
      max-width: 600px;
      margin: 0 auto;
    }

    .welcome-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .welcome-card h2 {
      color: white;
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
    }

    .welcome-user {
      color: rgba(255, 255, 255, 0.8);
      margin: 0 0 0.5rem 0;
    }

    .welcome-user strong {
      color: #667eea;
    }

    .welcome-text {
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 2rem 0;
    }

    /* Quick Actions */
    .quick-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 2rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.2s ease;
      min-width: 150px;
    }

    .action-card:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .action-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }

    .action-label {
      color: white;
      font-weight: 600;
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }

    .action-desc {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.8rem;
    }

    /* Mobile Header */
    .mobile-header {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: #1a1a2e;
      padding: 0 1rem;
      align-items: center;
      z-index: 999;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .mobile-header h1 {
      margin: 0;
      font-size: 1.25rem;
      color: white;
    }

    .menu-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      margin-right: 1rem;
    }

    .overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .mobile-header {
        display: flex;
      }

      .sidebar {
        transform: translateX(-100%);
      }

      .sidebar-open .sidebar {
        transform: translateX(0);
      }

      .sidebar-open .overlay {
        display: block;
      }

      .close-btn {
        display: block;
      }

      .main-content {
        margin-left: 0;
        padding: 80px 1rem 1rem;
      }

      .quick-actions {
        flex-direction: column;
      }

      .action-card {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  user = signal<User | null>(null);
  sidebarOpen = signal(false);

  ngOnInit() {
    this.api.user$.subscribe(user => this.user.set(user));
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
