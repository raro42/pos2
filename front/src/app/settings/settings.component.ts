import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, TenantSettings } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <app-sidebar>
        <div class="settings-container">
      <div class="page-header">
        <h1>Business Profile Settings</h1>
        <p class="subtitle">Manage your business information and branding</p>
      </div>

      @if (loading()) {
        <div class="loading">Loading settings...</div>
      } @else {
        <form (ngSubmit)="saveSettings()" class="settings-form">
          <!-- Logo Upload -->
          <div class="form-section">
            <h2>Logo</h2>
            <div class="logo-upload">
              @if (logoPreview() || settings()?.logo_filename) {
                <div class="logo-preview">
                  <div class="logo-image-wrapper">
                    <img [src]="logoPreview() || getLogoUrl()" alt="Business Logo" />
                    @if (settings()?.logo_size_formatted && !logoPreview()) {
                      <div class="file-size">{{ settings()!.logo_size_formatted }}</div>
                    } @else if (logoFile) {
                      <div class="file-size">{{ formatFileSize(logoFile.size) }}</div>
                    }
                  </div>
                  <button type="button" class="remove-logo" (click)="removeLogo()">Remove</button>
                </div>
              }
              <div class="upload-area">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  (change)="onLogoSelected($event)"
                  style="display: none"
                />
                <label for="logo-upload" class="upload-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Logo
                </label>
                <p class="upload-hint">Recommended: Square image, max 2MB (JPG, PNG, WebP)</p>
              </div>
            </div>
          </div>

          <!-- Basic Information -->
          <div class="form-section">
            <h2>Basic Information</h2>
            <div class="form-group">
              <label for="name">Business Name *</label>
              <input
                type="text"
                id="name"
                [(ngModel)]="formData.name"
                name="name"
                required
                placeholder="Your Business Name"
              />
            </div>

            <div class="form-group">
              <label for="business_type">Business Type</label>
              <select id="business_type" [(ngModel)]="formData.business_type" name="business_type">
                <option [value]="null">Select type...</option>
                <option value="restaurant">Restaurant</option>
                <option value="bar">Bar</option>
                <option value="cafe">Café</option>
                <option value="retail">Retail Store</option>
                <option value="service">Service Business</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea
                id="description"
                [(ngModel)]="formData.description"
                name="description"
                rows="4"
                placeholder="A brief description of your business..."
              ></textarea>
            </div>
          </div>

          <!-- Contact Information -->
          <div class="form-section">
            <h2>Contact Information</h2>
            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                [(ngModel)]="formData.phone"
                name="phone"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div class="form-group">
              <label for="whatsapp">WhatsApp Number</label>
              <input
                type="tel"
                id="whatsapp"
                [(ngModel)]="formData.whatsapp"
                name="whatsapp"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                [(ngModel)]="formData.email"
                name="email"
                placeholder="contact@yourbusiness.com"
              />
            </div>

            <div class="form-group">
              <label for="address">Address</label>
              <input
                type="text"
                id="address"
                [(ngModel)]="formData.address"
                name="address"
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div class="form-group">
              <label for="website">Website</label>
              <input
                type="url"
                id="website"
                [(ngModel)]="formData.website"
                name="website"
                placeholder="https://www.yourbusiness.com"
              />
            </div>
          </div>

          <!-- Opening Hours -->
          <div class="form-section">
            <h2>Opening Hours</h2>
            <p class="section-hint">Enter opening hours as JSON. Example: {{ openingHoursExample }}</p>
            <div class="form-group">
              <label for="opening_hours">Opening Hours (JSON)</label>
              <textarea
                id="opening_hours"
                [(ngModel)]="formData.opening_hours"
                name="opening_hours"
                rows="8"
                [placeholder]="openingHoursPlaceholder"
              ></textarea>
            </div>
          </div>

          <!-- Payment Settings -->
          <div class="form-section">
            <h2>Payment Settings</h2>
            <div class="form-group">
              <label for="currency">Currency</label>
              <input
                type="text"
                id="currency"
                [(ngModel)]="formData.currency"
                name="currency"
                placeholder="€, $, £, ¥, etc."
                maxlength="10"
              />
              <p class="field-hint">Enter the currency symbol used for pricing (e.g., €, $, £, ¥)</p>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  id="immediate_payment_required"
                  [(ngModel)]="formData.immediate_payment_required"
                  name="immediate_payment_required"
                />
                <span>Immediate payment required</span>
              </label>
              <p class="field-hint">When enabled, customers must pay to place an order.</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="cancel()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>

          @if (error()) {
            <div class="error-message">{{ error() }}</div>
          }
          @if (success()) {
            <div class="success-message">{{ success() }}</div>
          }
        </form>
      }
        </div>
    </app-sidebar>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: var(--space-6);

      h1 {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-2);
      }

      .subtitle {
        color: var(--color-text-muted);
        font-size: 0.9375rem;
      }
    }

    .loading {
      text-align: center;
      padding: var(--space-8);
      color: var(--color-text-muted);
    }

    .settings-form {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }

    .form-section {
      margin-bottom: var(--space-8);

      &:last-of-type {
        margin-bottom: var(--space-6);
      }

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-4);
        padding-bottom: var(--space-2);
        border-bottom: 1px solid var(--color-border);
      }

      .section-hint {
        font-size: 0.875rem;
        color: var(--color-text-muted);
        margin-bottom: var(--space-3);
      }
    }

    .form-group {
      margin-bottom: var(--space-4);

      label {
        display: block;
        font-size: 0.9375rem;
        font-weight: 500;
        color: var(--color-text);
        margin-bottom: var(--space-2);
      }

      input[type="text"],
      input[type="tel"],
      input[type="email"],
      input[type="url"],
      select,
      textarea {
        width: 100%;
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 0.9375rem;
        color: var(--color-text);
        background: var(--color-bg);
        transition: border-color 0.15s ease;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        &::placeholder {
          color: var(--color-text-muted);
        }
      }

      textarea {
        font-family: inherit;
        resize: vertical;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
        font-weight: 500;

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--color-primary);
        }
      }

      .field-hint {
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin-top: var(--space-1);
        margin-left: calc(18px + var(--space-2));
      }
    }

    .logo-upload {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .logo-preview {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-bg);
    }

    .logo-image-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
    }

    .logo-image-wrapper img {
      max-width: 200px;
      max-height: 200px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: var(--radius-md);
      background: white;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
    }

    .file-size {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      text-align: center;
      margin-top: var(--space-1);

      .remove-logo {
        padding: var(--space-2) var(--space-4);
        background: var(--color-error);
        color: white;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 0.875rem;
        transition: opacity 0.15s ease;

        &:hover {
          opacity: 0.9;
        }
      }
    }

    .upload-area {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .upload-button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: opacity 0.15s ease;
      width: fit-content;

      &:hover {
        opacity: 0.9;
      }
    }

    .upload-hint {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .form-actions {
      display: flex;
      gap: var(--space-3);
      justify-content: flex-end;
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border);
    }

    .btn-primary,
    .btn-secondary {
      padding: var(--space-3) var(--space-5);
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;

      &:hover:not(:disabled) {
        opacity: 0.9;
      }
    }

    .btn-secondary {
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);

      &:hover:not(:disabled) {
        background: var(--color-bg);
      }
    }

    .error-message {
      margin-top: var(--space-4);
      padding: var(--space-3);
      background: #fee;
      color: #c33;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
    }

    .success-message {
      margin-top: var(--space-4);
      padding: var(--space-3);
      background: #efe;
      color: #3c3;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  settings = signal<TenantSettings | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  logoPreview = signal<string | null>(null);
  logoFile: File | null = null;

  openingHoursExample = '{"monday": {"open": "09:00", "close": "22:00", "closed": false}}';
  openingHoursPlaceholder = '{"monday": {"open": "09:00", "close": "22:00", "closed": false}, ...}';

  formData: Partial<TenantSettings> = {
    name: '',
    business_type: null,
    description: null,
    phone: null,
    whatsapp: null,
    email: null,
    address: null,
    website: null,
    opening_hours: null,
    currency: null,
    immediate_payment_required: false,
  };

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.formData = {
          name: settings.name || '',
          business_type: settings.business_type || null,
          description: settings.description || null,
          phone: settings.phone || null,
          whatsapp: settings.whatsapp || null,
          email: settings.email || null,
          address: settings.address || null,
          website: settings.website || null,
          opening_hours: settings.opening_hours || null,
          currency: settings.currency || null,
          immediate_payment_required: settings.immediate_payment_required || false,
        };
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load settings. Please try again.');
        this.loading.set(false);
        console.error('Error loading settings:', err);
      }
    });
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) {
        this.error.set('File size must be less than 2MB');
        return;
      }
      this.logoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      this.error.set(null);
    }
  }

  removeLogo() {
    this.logoFile = null;
    this.logoPreview.set(null);
    // Note: To actually remove from server, we'd need a DELETE endpoint
    // For now, just clear the preview
  }

  getLogoUrl(): string | null {
    const settings = this.settings();
    if (!settings?.logo_filename || !settings.id) return null;
    return this.api.getTenantLogoUrl(settings.logo_filename, settings.id);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  saveSettings() {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    // First upload logo if selected
    if (this.logoFile) {
      this.api.uploadTenantLogo(this.logoFile).subscribe({
        next: (updatedSettings) => {
          this.settings.set(updatedSettings);
          this.logoFile = null;
          this.logoPreview.set(null);
          // Then update other settings
          this.updateSettings();
        },
        error: (err) => {
          this.error.set('Failed to upload logo. Please try again.');
          this.saving.set(false);
          console.error('Error uploading logo:', err);
        }
      });
    } else {
      this.updateSettings();
    }
  }

  private updateSettings() {
    this.api.updateTenantSettings(this.formData).subscribe({
      next: (updatedSettings) => {
        this.settings.set(updatedSettings);
        this.success.set('Settings saved successfully!');
        this.saving.set(false);
        setTimeout(() => this.success.set(null), 3000);
      },
      error: (err) => {
        this.error.set('Failed to save settings. Please try again.');
        this.saving.set(false);
        console.error('Error updating settings:', err);
      }
    });
  }

  cancel() {
    this.router.navigate(['/']);
  }
}
