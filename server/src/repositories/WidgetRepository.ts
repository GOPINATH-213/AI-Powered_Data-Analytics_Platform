import { DashboardWidgetModel, IDashboardWidget } from '../models/DashboardWidget';
import { Types } from 'mongoose';

export class WidgetRepository {
  async findById(id: string | Types.ObjectId): Promise<IDashboardWidget | null> {
    return DashboardWidgetModel.findById(id);
  }

  async findByDashboardId(dashboardId: string | Types.ObjectId): Promise<IDashboardWidget[]> {
    return DashboardWidgetModel.find({ dashboardId });
  }

  async create(data: Partial<IDashboardWidget>): Promise<IDashboardWidget> {
    return DashboardWidgetModel.create(data);
  }

  async update(id: string | Types.ObjectId, data: Partial<IDashboardWidget>): Promise<IDashboardWidget | null> {
    return DashboardWidgetModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string | Types.ObjectId): Promise<boolean> {
    const result = await DashboardWidgetModel.findByIdAndDelete(id);
    return result !== null;
  }

  async deleteByDashboardId(dashboardId: string | Types.ObjectId): Promise<void> {
    await DashboardWidgetModel.deleteMany({ dashboardId });
  }
}

export const widgetRepository = new WidgetRepository();
export default widgetRepository;
