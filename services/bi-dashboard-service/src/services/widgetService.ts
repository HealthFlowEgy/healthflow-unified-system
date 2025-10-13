/**
 * Widget Service
 * Manage dashboard widgets and their data
 */

import { db } from '../config/database';
import { dashboardWidgets, userDashboardPreferences } from '../models/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface WidgetData {
  type: string;
  title: string;
  config: any;
  dataSource: string;
  refreshInterval?: number;
  position?: { x: number; y: number; w: number; h: number };
}

interface WidgetQuery {
  widgetType: string;
  parameters?: any;
  tenantId: string;
}

class WidgetService {
  /**
   * Create widget
   */
  async createWidget(data: WidgetData, userId: string, tenantId: string): Promise<any> {
    const widget = await db.insert(dashboardWidgets).values({
      id: uuidv4(),
      widgetType: data.type,
      title: data.title,
      config: JSON.stringify(data.config),
      dataSource: data.dataSource,
      refreshInterval: data.refreshInterval || 300,
      position: data.position ? JSON.stringify(data.position) : null,
      createdBy: userId,
      tenantId,
      createdAt: new Date()
    }).returning();

    return widget[0];
  }

  /**
   * Get widget data
   */
  async getWidgetData(query: WidgetQuery): Promise<any> {
    switch (query.widgetType) {
      case 'metric_card':
        return await this.getMetricCardData(query);
      case 'line_chart':
        return await this.getLineChartData(query);
      case 'bar_chart':
        return await this.getBarChartData(query);
      case 'pie_chart':
        return await this.getPieChartData(query);
      case 'data_table':
        return await this.getDataTableData(query);
      case 'list':
        return await this.getListData(query);
      default:
        throw new Error(`Unknown widget type: ${query.widgetType}`);
    }
  }

  /**
   * Get metric card data
   */
  private async getMetricCardData(query: WidgetQuery): Promise<any> {
    const { dataSource, parameters } = query;

    // Mock implementation - would query actual services
    const metrics: Record<string, any> = {
      total_prescriptions: {
        value: 1234,
        change: 12.5,
        trend: 'up'
      },
      total_users: {
        value: 567,
        change: 8.3,
        trend: 'up'
      },
      total_appointments: {
        value: 890,
        change: -2.1,
        trend: 'down'
      },
      revenue: {
        value: 45678,
        change: 15.7,
        trend: 'up',
        format: 'currency'
      }
    };

    return metrics[dataSource] || { value: 0, change: 0, trend: 'neutral' };
  }

  /**
   * Get line chart data
   */
  private async getLineChartData(query: WidgetQuery): Promise<any> {
    // Mock time series data
    const days = 30;
    const data = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 100) + 50
      });
    }

    return {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Trend',
        data: data.map(d => d.value)
      }]
    };
  }

  /**
   * Get bar chart data
   */
  private async getBarChartData(query: WidgetQuery): Promise<any> {
    // Mock categorical data
    return {
      labels: ['Category A', 'Category B', 'Category C', 'Category D'],
      datasets: [{
        label: 'Count',
        data: [45, 67, 89, 34]
      }]
    };
  }

  /**
   * Get pie chart data
   */
  private async getPieChartData(query: WidgetQuery): Promise<any> {
    // Mock distribution data
    return {
      labels: ['Segment 1', 'Segment 2', 'Segment 3', 'Segment 4'],
      datasets: [{
        data: [30, 25, 25, 20],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }]
    };
  }

  /**
   * Get data table data
   */
  private async getDataTableData(query: WidgetQuery): Promise<any> {
    // Mock table data
    return {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
        { key: 'date', label: 'Date' }
      ],
      rows: [
        { id: 1, name: 'Item 1', status: 'Active', date: '2025-01-01' },
        { id: 2, name: 'Item 2', status: 'Pending', date: '2025-01-02' },
        { id: 3, name: 'Item 3', status: 'Completed', date: '2025-01-03' }
      ]
    };
  }

  /**
   * Get list data
   */
  private async getListData(query: WidgetQuery): Promise<any> {
    // Mock list data
    return {
      items: [
        { id: 1, title: 'Item 1', subtitle: 'Description 1', icon: 'check' },
        { id: 2, title: 'Item 2', subtitle: 'Description 2', icon: 'warning' },
        { id: 3, title: 'Item 3', subtitle: 'Description 3', icon: 'info' }
      ]
    };
  }

  /**
   * Save user dashboard layout
   */
  async saveDashboardLayout(userId: string, layout: any, tenantId: string): Promise<any> {
    // Check if preferences exist
    const existing = await db.query.userDashboardPreferences.findFirst({
      where: and(
        eq(userDashboardPreferences.userId, userId),
        eq(userDashboardPreferences.tenantId, tenantId)
      )
    });

    if (existing) {
      // Update
      const updated = await db
        .update(userDashboardPreferences)
        .set({
          layout: JSON.stringify(layout),
          updatedAt: new Date()
        })
        .where(eq(userDashboardPreferences.id, existing.id))
        .returning();
      
      return updated[0];
    } else {
      // Create
      const created = await db.insert(userDashboardPreferences).values({
        id: uuidv4(),
        userId,
        layout: JSON.stringify(layout),
        theme: 'light',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return created[0];
    }
  }

  /**
   * Get user dashboard layout
   */
  async getDashboardLayout(userId: string, tenantId: string): Promise<any> {
    const preferences = await db.query.userDashboardPreferences.findFirst({
      where: and(
        eq(userDashboardPreferences.userId, userId),
        eq(userDashboardPreferences.tenantId, tenantId)
      )
    });

    if (preferences && preferences.layout) {
      return JSON.parse(preferences.layout as string);
    }

    // Return default layout
    return this.getDefaultLayout();
  }

  /**
   * Get default dashboard layout
   */
  private getDefaultLayout(): any {
    return {
      widgets: [
        { id: 'w1', type: 'metric_card', x: 0, y: 0, w: 3, h: 2, dataSource: 'total_prescriptions' },
        { id: 'w2', type: 'metric_card', x: 3, y: 0, w: 3, h: 2, dataSource: 'total_users' },
        { id: 'w3', type: 'metric_card', x: 6, y: 0, w: 3, h: 2, dataSource: 'total_appointments' },
        { id: 'w4', type: 'metric_card', x: 9, y: 0, w: 3, h: 2, dataSource: 'revenue' },
        { id: 'w5', type: 'line_chart', x: 0, y: 2, w: 6, h: 4, dataSource: 'prescription_trend' },
        { id: 'w6', type: 'pie_chart', x: 6, y: 2, w: 6, h: 4, dataSource: 'status_distribution' }
      ]
    };
  }
}

export const widgetService = new WidgetService();

