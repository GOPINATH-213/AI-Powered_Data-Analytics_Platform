export interface KPIRule {
  name: string;
  canApply(columns: string[]): boolean;
  calculate(rows: Record<string, any>[]): number;
}

// 1. Total Revenue Rule
export class TotalRevenueRule implements KPIRule {
  public name = 'Total Revenue';
  private targetCol = '';

  canApply(columns: string[]): boolean {
    const candidate = columns.find((c) => {
      const name = c.toLowerCase();
      return name === 'revenue' || name === 'sales' || name === 'sales_amount' || name === 'amount' || name === 'total_amount';
    });
    if (candidate) {
      this.targetCol = candidate;
      return true;
    }
    return false;
  }

  calculate(rows: Record<string, any>[]): number {
    return rows.reduce((sum, row) => sum + (Number(row[this.targetCol]) || 0), 0);
  }
}

// 2. Total Profit Rule
export class TotalProfitRule implements KPIRule {
  public name = 'Total Profit';
  private targetCol = '';

  canApply(columns: string[]): boolean {
    const candidate = columns.find((c) => {
      const name = c.toLowerCase();
      return name === 'profit' || name === 'margin' || name === 'net_margin' || name === 'earnings';
    });
    if (candidate) {
      this.targetCol = candidate;
      return true;
    }
    return false;
  }

  calculate(rows: Record<string, any>[]): number {
    return rows.reduce((sum, row) => sum + (Number(row[this.targetCol]) || 0), 0);
  }
}

// 3. Customer Count Rule
export class CustomerCountRule implements KPIRule {
  public name = 'Customer Count';
  private targetCol = '';

  canApply(columns: string[]): boolean {
    const candidate = columns.find((c) => {
      const name = c.toLowerCase();
      return name.includes('customer') || name.includes('client') || name.includes('buyer');
    });
    if (candidate) {
      this.targetCol = candidate;
      return true;
    }
    return false;
  }

  calculate(rows: Record<string, any>[]): number {
    const uniques = new Set(rows.map((r) => r[this.targetCol]).filter(Boolean));
    return uniques.size;
  }
}

// 4. Product Count Rule
export class ProductCountRule implements KPIRule {
  public name = 'Product Count';
  private targetCol = '';

  canApply(columns: string[]): boolean {
    const candidate = columns.find((c) => {
      const name = c.toLowerCase();
      return name.includes('product') || name.includes('item') || name.includes('sku');
    });
    if (candidate) {
      this.targetCol = candidate;
      return true;
    }
    return false;
  }

  calculate(rows: Record<string, any>[]): number {
    const uniques = new Set(rows.map((r) => r[this.targetCol]).filter(Boolean));
    return uniques.size;
  }
}

// 5. Total Transactions (Row count fallback rule)
export class TotalTransactionsRule implements KPIRule {
  public name = 'Total Transactions';

  canApply(): boolean {
    return true; // Always applicable as a fallback
  }

  calculate(rows: Record<string, any>[]): number {
    return rows.length;
  }
}

export class KPIEngineService {
  private rules: KPIRule[] = [
    new TotalRevenueRule(),
    new TotalProfitRule(),
    new CustomerCountRule(),
    new ProductCountRule(),
    new TotalTransactionsRule(),
  ];

  /**
   * Evaluates rules against columns list and computes matched metrics.
   */
  async calculateKPIs(
    rows: Record<string, any>[],
    columns: string[]
  ): Promise<{ metrics: { name: string; value: number; method: string }[]; logs: string[] }> {
    const logs: string[] = [];
    const metrics: { name: string; value: number; method: string }[] = [];

    logs.push('Evaluating KPI Business Rules.');

    this.rules.forEach((rule) => {
      if (rule.canApply(columns)) {
        const val = rule.calculate(rows);
        metrics.push({
          name: rule.name,
          value: parseFloat(val.toFixed(2)),
          method: 'SUM_DISTINCT_RULE',
        });
        logs.push(`Computed Metric "${rule.name}": ${val.toFixed(2)}`);
      }
    });

    return { metrics, logs };
  }
}

export const kpiEngineService = new KPIEngineService();
export default kpiEngineService;
