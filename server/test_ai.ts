import { AIProviderService } from './src/services/AIProviderService';
import { AnalyticsQueryEngine, parseNumericValue } from './src/services/AnalyticsQueryEngine';
import { AIQueryValidationService } from './src/services/AIQueryValidationService';

const aiProvider = new AIProviderService();
const engine = new AnalyticsQueryEngine();

// Mock loadDatasetRows
engine.loadDatasetRows = async () => [
  { Category: 'Electronics', Revenue: 3000, Profit: 500, Region: 'North', Date: '2026-01-01', Salary: null, CustomerID: 'C1' },
  { Category: 'Office', Revenue: 2100, Profit: 400, Region: 'South', Date: '2026-01-02', Salary: null, CustomerID: 'C2' },
  { Category: 'Fruits', Revenue: 1300, Profit: 200, Region: 'East', Date: '2026-01-03', Salary: null, CustomerID: 'C3' },
  { Category: 'Electronics', Revenue: 1100, Profit: 150, Region: 'West', Date: '2026-01-04', Salary: null, CustomerID: 'C4' }
];

const context = {
  datasetId: 'test-dataset',
  datasetName: 'Sales Analytics',
  datasetType: 'single' as const,
  isCombined: false,
  currentVersion: 1,
  freshnessStatus: 'Up to Date',
  processingStatus: 'Processed',
  readinessScore: 100,
  columns: ['Category', 'Revenue', 'Profit', 'Region', 'Date', 'CustomerID'],
  columnTypes: {
    Category: 'string',
    Revenue: 'number',
    Profit: 'number',
    Region: 'string',
    Date: 'date',
    CustomerID: 'string'
  }
} as any;

const questions = [
  {
    q: "What is the total revenue?",
    plan: { intent: "AGGREGATION", operation: "SUM", metric: "Revenue" }
  },
  {
    q: "Give me an overview of this dataset.",
    plan: { intent: "DATASET_OVERVIEW" }
  },
  {
    q: "List all categories.",
    plan: { intent: "DISTINCT_VALUES", column: "Category" }
  },
  {
    q: "Show revenue by category.",
    plan: { intent: "GROUP_BY", operation: "SUM", metric: "Revenue", groupBy: "Category" }
  },
  {
    q: "Which category has the highest revenue?",
    plan: { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "DESC", limit: 1 }
  },
  {
    q: "Show the top 5 categories by revenue.",
    plan: { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "DESC", limit: 5 }
  },
  {
    q: "Show only records where revenue is greater than 1000.",
    plan: { intent: "FILTER", filters: [{ column: "Revenue", operator: "GREATER_THAN", value: 1000 }] }
  },
  {
    q: "How many records are in this dataset?",
    plan: { intent: "AGGREGATION", operation: "COUNT", metric: "Category" }
  },
  {
    q: "What is the average revenue?",
    plan: { intent: "AGGREGATION", operation: "AVERAGE", metric: "Revenue" }
  },
  {
    q: "What is the minimum revenue?",
    plan: { intent: "AGGREGATION", operation: "MIN", metric: "Revenue" }
  },
  {
    q: "What is the maximum revenue?",
    plan: { intent: "AGGREGATION", operation: "MAX", metric: "Revenue" }
  },
  {
    q: "What is the total salary?",
    plan: { intent: "AGGREGATION", operation: "SUM", metric: "Salary" }
  },
  {
    q: "What is the average customer happiness score?",
    plan: { intent: "AGGREGATION", operation: "AVERAGE", metric: "CustomerHappiness" }
  },
  {
    q: "Show profit by employee department.",
    plan: { intent: "GROUP_BY", operation: "SUM", metric: "Profit", groupBy: "Department" }
  },
  {
    q: "Show the bottom 5 categories by revenue.",
    plan: { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "ASC", limit: 5 }
  }
];

// Mock Gemini generateNaturalLanguageResponse so it doesn't fail with API errors
aiProvider.generateNaturalLanguageResponse = async (question, summary, result, ctx) => {
  return `Answer calculated: ${summary}. JSON Data: ${JSON.stringify(result).substring(0, 100)}`;
};

async function runTests() {
  console.log('--- RUNNING AI REGRESSION SUITE ---');
  for (const item of questions) {
    const q = item.q;
    const plan = item.plan as any;
    console.log(`\n[Q]: ${q}`);
    try {
      console.log(`[INTENT]: ${plan.intent}`);
      console.log(`[PLAN]: ${JSON.stringify(plan)}`);
      
      let validatedQuery = plan;
      try {
        const valRes = AIQueryValidationService.validateQueryPlan(plan, context, []);
        if (valRes.ambiguousColumns && valRes.ambiguousColumns.length > 1) {
           console.log(`[VALIDATION]: Ambiguous columns detected: ${valRes.ambiguousColumns.join(', ')}`);
           continue;
        }
        validatedQuery = valRes.validatedQuery;
      } catch (e: any) {
         console.log(`[VALIDATION FAILED]: ${e.message}`);
         continue;
      }

      const res = await engine.executeQuery({} as any, 'user1', validatedQuery, context);
      console.log(`[RESULT TYPE]: ${res.resultType}`);
      console.log(`[RESULT SUMMARY]: ${res.summary}`);
      if (res.resultType === 'metric') console.log(`[METRIC VALUE]: ${res.metricValue}`);
      if (res.resultType === 'table' || res.resultType === 'chart') console.log(`[DATA ROWS]: ${JSON.stringify(res.tableData || res.chartData)}`);
      
      const aiResponse = await aiProvider.generateNaturalLanguageResponse(q, res.summary, res.resultType === 'metric' ? res.metricValue : (res.tableData || res.chartData), context);
      console.log(`[AI RESPONSE]: ${aiResponse}`);
    } catch (err: any) {
      console.log(`[ERROR]: ${err.message}`);
    }
  }
}

runTests().catch(console.error);
