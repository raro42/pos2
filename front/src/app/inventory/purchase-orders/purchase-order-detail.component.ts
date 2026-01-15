/**
 * Purchase Order Detail Component
 *
 * View and receive goods for a purchase order.
 * Follows app design patterns.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SidebarComponent } from '../../shared/sidebar.component';
import { InventoryService } from '../inventory.service';
import { PurchaseOrder, ReceiveGoodsInput, ReceivedItemInput, PurchaseOrderStatus } from '../inventory.types';

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent, TranslateModule],
  template: `
    <app-sidebar>
      @if (loading()) {
        <div class="empty-state"><p>{{ 'common.loading' | translate }}</p></div>
      } @else if (order()) {
        <div class="page-header">
          <div>
            <a routerLink="/inventory/purchase-orders" class="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              {{ 'common.back' | translate }}
            </a>
            <h1>{{ order()!.order_number }}</h1>
          </div>
          @if (canReceive()) {
            <button class="btn btn-primary" (click)="showReceiveModal.set(true)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 2 13.5 11 9 8"/>
                <path d="M22 2L15 22l-4-9-9-4z"/>
              </svg>
              {{ 'inventory.purchaseOrders.receiveGoods' | translate }}
            </button>
          }
        </div>

        <div class="content">
          <!-- Order Info Cards -->
          <div class="info-row">
            <div class="info-card">
              <span class="info-label">{{ 'inventory.purchaseOrders.table.supplier' | translate }}</span>
              <span class="info-value">{{ order()!.supplier?.name || order()!.supplier_name || '-' }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'inventory.purchaseOrders.detail.orderDate' | translate }}</span>
              <span class="info-value">{{ formatDate(order()!.order_date) }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'inventory.purchaseOrders.detail.expectedDate' | translate }}</span>
              <span class="info-value">{{ order()!.expected_date ? formatDate(order()!.expected_date!) : '-' }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'inventory.purchaseOrders.form.total' | translate }}</span>
              <span class="info-value price">{{ formatCurrency(order()!.total_cents) }}</span>
            </div>
            <div class="info-card">
              <span class="info-label">{{ 'inventory.purchaseOrders.table.status' | translate }}</span>
              <span class="status-badge" [class]="order()!.status">{{ formatStatus(order()!.status) | translate }}</span>
            </div>
          </div>

          <!-- Line Items -->
          <div class="section">
            <h2>{{ 'inventory.purchaseOrders.detail.lineItems' | translate }}</h2>
            <div class="table-card">
              <table>
                <thead>
                  <tr>
                    <th>{{ 'inventory.purchaseOrders.form.item' | translate }}</th>
                    <th>{{ 'inventory.purchaseOrders.detail.ordered' | translate }}</th>
                    <th>{{ 'inventory.purchaseOrders.detail.received' | translate }}</th>
                    <th>{{ 'inventory.purchaseOrders.detail.unitCost' | translate }}</th>
                    <th>{{ 'inventory.purchaseOrders.form.total' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of order()!.items; track item.id) {
                    <tr>
                      <td>
                        <strong>{{ item.inventory_item_name }}</strong>
                        <small class="text-muted">{{ item.inventory_item_sku }}</small>
                      </td>
                      <td>{{ item.quantity_ordered }} {{ 'common.units.' + item.unit | translate }}</td>
                      <td>
                        <span [class.complete]="item.quantity_received >= item.quantity_ordered">
                          {{ item.quantity_received }}
                        </span>
                      </td>
                      <td>{{ formatCurrency(item.unit_cost_cents) }}</td>
                      <td class="price">{{ formatCurrency(item.line_total_cents) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          @if (order()!.notes) {
            <div class="notes-section">
              <h3>{{ 'inventory.purchaseOrders.form.notes' | translate }}</h3>
              <p>{{ order()!.notes }}</p>
            </div>
          }
        </div>

        <!-- Receive Goods Modal -->
        @if (showReceiveModal()) {
          <div class="modal-overlay" (click)="showReceiveModal.set(false)">
            <div class="modal modal-lg" (click)="$event.stopPropagation()">
              <div class="form-header">
                <h3>{{ 'inventory.purchaseOrders.receiveGoods' | translate }}</h3>
                <button class="icon-btn" (click)="showReceiveModal.set(false)">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="receive-table-wrapper">
                <table class="receive-table">
                  <thead>
                    <tr>
                      <th>{{ 'inventory.purchaseOrders.form.item' | translate }}</th>
                      <th>{{ 'inventory.purchaseOrders.detail.ordered' | translate }}</th>
                      <th>{{ 'inventory.purchaseOrders.detail.alreadyReceived' | translate }}</th>
                      <th>{{ 'inventory.purchaseOrders.detail.receiveNow' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of order()!.items; track item.id; let i = $index) {
                      <tr>
                        <td>{{ item.inventory_item_name }}</td>
                        <td>{{ item.quantity_ordered }}</td>
                        <td>{{ item.quantity_received }}</td>
                        <td>
                          <input
                            type="number"
                            [(ngModel)]="receiveQuantities[i]"
                            min="0"
                            [max]="item.quantity_ordered - item.quantity_received"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="form-group">
                <label for="receive_notes">{{ 'inventory.purchaseOrders.form.notes' | translate }}</label>
                <input type="text" id="receive_notes" [(ngModel)]="receiveNotes" [placeholder]="'inventory.purchaseOrders.form.notesPlaceholder' | translate" />
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="showReceiveModal.set(false)">{{ 'common.cancel' | translate }}</button>
                <button class="btn btn-primary" (click)="submitReceive()" [disabled]="receiving()">
                  {{ receiving() ? ('inventory.purchaseOrders.detail.processing' | translate) : ('inventory.purchaseOrders.detail.confirmReceipt' | translate) }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    </app-sidebar>
  `,
