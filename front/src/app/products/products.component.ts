import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService, Product, User } from '../services/api.service';

@Component({
    selector: 'app-products',
    standalone: true,
    imports: [FormsModule, DecimalPipe, RouterLink, RouterLinkActive],
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
          <h1>Products</h1>
          @if (!showAddForm() && !editingProduct()) {
            <button class="btn btn-primary" (click)="showAddForm.set(true)">
              + Add Product
            </button>
          }
        </div>

        <div class="content-body">
          <!-- Add/Edit Form -->
          @if (showAddForm() || editingProduct()) {
            <div class="form-card">
              <div class="form-header">
                <h3>{{ editingProduct() ? 'Edit Product' : 'Add New Product' }}</h3>
                <button class="close-btn" (click)="cancelForm()">×</button>
              </div>
              <form (submit)="saveProduct($event)">
                <div class="form-row">
                  <div class="form-group">
                    <label for="name">Product Name</label>
                    <input 
                      id="name" 
                      type="text" 
                      [(ngModel)]="formData.name" 
                      name="name" 
                      required
                      placeholder="Enter product name"
                    >
                  </div>
                  <div class="form-group">
                    <label for="price">Price ($)</label>
                    <input 
                      id="price" 
                      type="number" 
                      step="0.01"
                      [(ngModel)]="formData.price" 
                      name="price" 
                      required
                      placeholder="0.00"
                    >
                  </div>
                  <div class="form-actions">
                    <button type="button" class="btn btn-secondary" (click)="cancelForm()">Cancel</button>
                    <button type="submit" class="btn btn-primary" [disabled]="saving()">
                      {{ saving() ? 'Saving...' : (editingProduct() ? 'Update' : 'Add') }}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          }

          <!-- Error Message -->
          @if (error()) {
            <div class="error-banner">
              {{ error() }}
              <button (click)="error.set('')">×</button>
            </div>
          }

          <!-- Loading State -->
          @if (loading()) {
            <div class="loading-state">
              <p>Loading products...</p>
            </div>
          } @else if (products().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📦</div>
              <h3>No products yet</h3>
              <p>Add your first product to get started</p>
              <button class="btn btn-primary" (click)="showAddForm.set(true)">+ Add Product</button>
            </div>
          } @else {
            <!-- Products Table -->
            <div class="table-container">
              <table class="products-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (product of products(); track product.id) {
                    <tr>
                      <td>{{ product.name }}</td>
                      <td class="price">\${{ (product.price_cents / 100) | number:'1.2-2' }}</td>
                      <td class="actions">
                        <button class="btn-icon edit" (click)="startEdit(product)" title="Edit">
                          ✏️
                        </button>
                        <button 
                          class="btn-icon delete" 
                          (click)="confirmDelete(product)" 
                          title="Delete"
                          [disabled]="deleting() === product.id"
                        >
                          {{ deleting() === product.id ? '⏳' : '🗑️' }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Delete Confirmation Modal -->
          @if (productToDelete()) {
            <div class="modal-overlay" (click)="productToDelete.set(null)">
              <div class="modal" (click)="$event.stopPropagation()">
                <h3>Delete Product?</h3>
                <p>Are you sure you want to delete "{{ productToDelete()?.name }}"? This action cannot be undone.</p>
                <div class="modal-actions">
                  <button class="btn btn-secondary" (click)="productToDelete.set(null)">Cancel</button>
                  <button class="btn btn-danger" (click)="deleteProduct()">Delete</button>
                </div>
              </div>
            </div>
          }
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
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .close-btn:hover {
      color: white;
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .content-header h1 {
      margin: 0;
      color: white;
      font-size: 1.75rem;
    }

    .content-body {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 16px;
      padding: 1.5rem;
    }

    /* Form Card */
    .form-card {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .form-header h3 {
      margin: 0;
      color: white;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .form-group {
      flex: 1;
      min-width: 200px;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
    }

    .form-group input {
      width: 100%;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 1rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
    }

    /* Table */
    .table-container {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .products-table {
      width: 100%;
      border-collapse: collapse;
    }

    .products-table th,
    .products-table td {
      padding: 1rem;
      text-align: left;
      color: white;
    }

    .products-table th {
      background: rgba(255, 255, 255, 0.05);
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.7);
    }

    .products-table tr:not(:last-child) td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .products-table tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }

    .price {
      font-weight: 600;
      color: #10b981;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-icon.delete:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    .btn-icon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Empty & Loading States */
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px dashed rgba(255, 255, 255, 0.1);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: white;
    }

    .empty-state p,
    .loading-state p {
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 1.5rem 0;
    }

    /* Error Banner */
    .error-banner {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-banner button {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1.25rem;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .modal {
      background: #2d2d44;
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 400px;
      width: 90%;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal h3 {
      margin: 0 0 0.5rem 0;
      color: white;
    }

    .modal p {
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 1.5rem 0;
    }

    .modal-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    /* Buttons */
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
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

      .sidebar .close-btn {
        display: block;
      }

      .main-content {
        margin-left: 0;
        padding: 80px 1rem 1rem;
      }

      .form-row {
        flex-direction: column;
      }

      .form-group {
        width: 100%;
        min-width: unset;
      }

      .form-actions {
        width: 100%;
        justify-content: stretch;
      }

      .form-actions .btn {
        flex: 1;
      }
    }
  `]
})
export class ProductsComponent implements OnInit {
    private api = inject(ApiService);
    private router = inject(Router);

    products = signal<Product[]>([]);
    loading = signal(true);
    saving = signal(false);
    deleting = signal<number | null>(null);
    showAddForm = signal(false);
    editingProduct = signal<Product | null>(null);
    productToDelete = signal<Product | null>(null);
    error = signal('');
    user = signal<User | null>(null);
    sidebarOpen = signal(false);

    formData = { name: '', price: 0 };

    ngOnInit() {
        this.api.user$.subscribe(user => this.user.set(user));
        this.loadProducts();
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

    loadProducts() {
        this.loading.set(true);
        this.error.set('');
        this.api.getProducts().subscribe({
            next: (products) => {
                this.products.set(products);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Load products error:', err);
                if (err.status === 401) {
                    this.router.navigate(['/login']);
                } else {
                    this.error.set(err.error?.detail || 'Failed to load products');
                }
                this.loading.set(false);
            }
        });
    }

    startEdit(product: Product) {
        this.editingProduct.set(product);
        this.formData = {
            name: product.name,
            price: product.price_cents / 100
        };
        this.showAddForm.set(false);
    }

    cancelForm() {
        this.showAddForm.set(false);
        this.editingProduct.set(null);
        this.formData = { name: '', price: 0 };
    }

    saveProduct(event: Event) {
        event.preventDefault();
        if (!this.formData.name || this.formData.price <= 0) return;

        this.saving.set(true);
        const productData = {
            name: this.formData.name,
            price_cents: Math.round(this.formData.price * 100)
        };

        const editing = this.editingProduct();
        if (editing?.id) {
            this.api.updateProduct(editing.id, productData).subscribe({
                next: (updated) => {
                    this.products.update(list =>
                        list.map(p => p.id === updated.id ? updated : p)
                    );
                    this.cancelForm();
                    this.saving.set(false);
                },
                error: (err) => {
                    this.error.set(err.error?.detail || 'Failed to update product');
                    this.saving.set(false);
                }
            });
        } else {
            this.api.createProduct(productData as Product).subscribe({
                next: (product) => {
                    this.products.update(list => [...list, product]);
                    this.cancelForm();
                    this.saving.set(false);
                },
                error: (err) => {
                    this.error.set(err.error?.detail || 'Failed to create product');
                    this.saving.set(false);
                }
            });
        }
    }

    confirmDelete(product: Product) {
        this.productToDelete.set(product);
    }

    deleteProduct() {
        const product = this.productToDelete();
        if (!product?.id) return;

        this.deleting.set(product.id);
        this.productToDelete.set(null);

        this.api.deleteProduct(product.id).subscribe({
            next: () => {
                this.products.update(list => list.filter(p => p.id !== product.id));
                this.deleting.set(null);
            },
            error: (err) => {
                this.error.set(err.error?.detail || 'Failed to delete product');
                this.deleting.set(null);
            }
        });
    }
}
