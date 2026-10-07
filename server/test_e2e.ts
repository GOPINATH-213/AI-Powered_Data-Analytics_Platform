import { AIProviderService } from './src/services/AIProviderService';
import { AnalyticsQueryEngine, parseNumericValue } from './src/services/AnalyticsQueryEngine';
import { AIQueryValidationService } from './src/services/AIQueryValidationService';
import axios from 'axios';

// --- LAYER B MOCK: AI Provider Contract Mock (Mocks Gemini LLM HTTP behavior) ---
// This guarantees that if the LLM produces the valid response, the E2E pipeline succeeds.
const originalPost = axios.post;
(axios as any).post = async (url: string, data: any) => {
  const prompt = data.contents[0].parts[0].text.toLowerCase();
  
  if (prompt.includes('explain the calculated results')) {
    return { data: { candidates: [{ content: { parts: [{ text: "Mocked conversational response." }] } }] } };
  }

  // Parse questions from prompt
  const qMatch = prompt.match(/user question:\s*"([^"]+)"/i);
  const q = qMatch ? qMatch[1].toLowerCase() : '';
  const historyMatch = prompt.match(/conversation history context:\s*(.*)/i);
  const history = historyMatch ? JSON.parse(historyMatch[1]) : [];
  
  let intentObj: any = { intent: "DATA_PREVIEW" };

  if (q === 'what is the total revenue?' || q === 'tell me the total revenue.' || q === 'how much revenue was generated?' || q === 'what is the sum of revenue?' || q === 'calculate the total revenue.') {
    intentObj = { intent: "AGGREGATION", operation: "SUM", metric: "Revenue" };
  } else if (q === 'what is the average revenue?') {
    intentObj = { intent: "AGGREGATION", operation: "AVERAGE", metric: "Revenue" };
  } else if (q === 'what is the maximum revenue?') {
    intentObj = { intent: "AGGREGATION", operation: "MAX", metric: "Revenue" };
  } else if (q === 'what is the minimum revenue?') {
    intentObj = { intent: "AGGREGATION", operation: "MIN", metric: "Revenue" };
  } else if (q === 'give me an overview of this dataset.') {
    intentObj = { intent: "DATASET_OVERVIEW" };
  } else if (q === 'list all categories.') {
    intentObj = { intent: "DISTINCT_VALUES", column: "Category" };
  } else if (q === 'show revenue by category.') {
    intentObj = { intent: "GROUP_BY", operation: "SUM", metric: "Revenue", groupBy: "Category" };
  } else if (q === 'which one is highest?' && history.length > 0) {
    intentObj = { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "DESC", limit: 1 };
  } else if (q === 'what about the lowest?' && history.length > 0) {
    intentObj = { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "ASC", limit: 1 };
  } else if (q === 'show the top 2.' && history.length > 0) {
    intentObj = { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "DESC", limit: 2 };
  } else if (q === 'which category has the highest revenue?') {
    intentObj = { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "DESC", limit: 1 };
  } else if (q === 'show the top 5 categories by revenue.') {
    intentObj = { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "DESC", limit: 5 };
  } else if (q === 'show the bottom 5 categories by revenue.') {
    intentObj = { intent: "RANKING", operation: "SUM", metric: "Revenue", groupBy: "Category", sort: "ASC", limit: 5 };
  } else if (q === 'show only records where revenue is greater than 1000.') {
    intentObj = { intent: "FILTER", filters: [{ column: "Revenue", operator: "GREATER_THAN", value: 1000 }] };
  } else if (q === 'how many records are in this dataset?') {
    intentObj = { intent: "AGGREGATION", operation: "COUNT", metric: "Category" }; // any valid column
  } else if (q === 'what is the total salary?') {
    intentObj = { intent: "AGGREGATION", operation: "SUM", metric: "Salary" };
  } else if (q === 'what is the average customer happiness score?') {
    intentObj = { intent: "AGGREGATION", operation: "AVERAGE", metric: "CustomerHappiness" };
  } else if (q === 'show profit by employee department.') {
    intentObj = { intent: "GROUP_BY", operation: "SUM", metric: "Profit", groupBy: "Department" };
  } else if (q === 'what is the total amount?') {
    intentObj = { intent: "AGGREGATION", operation: "SUM", metric: "Amount" }; // Ambiguous trigger
  } else if (q === 'tell me a joke.' || q === 'who is the prime minister of india?' || q === 'write a python program.' || q === 'what is today\'s weather?') {
    intentObj = { intent: "OUT_OF_SCOPE" };
  } else if (q === 'what is the average profit?') {
    intentObj = { intent: "AGGREGATION", operation: "AVERAGE", metric: "Profit" };
  }

  return { data: { candidates: [{ content: { parts: [{ text: JSON.stringify(intentObj) }] } }] } };
};

process.env.GEMINI_API_KEY = "test_key_for_mock";

// --- LAYER A: ENGINE MOCK SETUP ---
const aiProvider = new AIProviderService();
const engine = new AnalyticsQueryEngine();

const datasetARows = [
  { Category: 'Electronics', Revenue: 100, Profit: 50, Region: 'North' },
  { Category: 'Office', Revenue: 200, Profit: 40, Region: 'South' },
  { Category: 'Fruits', Revenue: 300, Profit: 20, Region: 'East' },
]; // Total Rev = 600

const datasetBRows = [
  { Category: 'Electronics', Revenue: 1000, Profit: 500, Region: 'North' },
  { Category: 'Office', Revenue: 2000, Profit: 400, Region: 'South' },
  { Category: 'Fruits', Revenue: 3000, Profit: 200, Region: 'East' },
]; // Total Rev = 6000

engine.loadDatasetRows = async (dataset: any) => {
  return dataset.datasetId === 'dataset-a' ? datasetARows : datasetBRows;
};

// --- DATASETS ---
const contextA = {
  datasetId: 'dataset-a',
  datasetName: 'Sales Small',
  datasetType: 'single' as const,
  isCombined: false,
  currentVersion: 1,
  freshnessStatus: 'Up to Date',
  processingStatus: 'Processed',
  readinessScore: 100,
  columns: ['Category', 'Revenue', 'Profit', 'Region', 'Amount', 'Total Amount'],
  columnTypes: { Category: 'string', Revenue: 'number', Profit: 'number', Region: 'string', Amount: 'number', 'Total Amount': 'number' }
} as any;

const contextB = { ...contextA, datasetId: 'dataset-b', datasetName: 'Sales Large' } as any;

const questions = [
  "What is the total revenue?",
  "Give me an overview of this dataset.",
  "List all categories.",
  "Show revenue by category.",
  "Which category has the highest revenue?",
  "Show the top 5 categories by revenue.",
  "Show the bottom 5 categories by revenue.",
  "Show only records where revenue is greater than 1000.",
  "What is the average revenue?",
  "What is the maximum revenue?",
  "What is the minimum revenue?",
  "How many records are in this dataset?",
  "What is the total salary?",
  "What is the average customer happiness score?",
  "Show profit by employee department.",
  "What is the total amount?",
  "Who is the Prime Minister of India?",
  "Write a Python program.",
  "What is today's weather?",
  "Tell me a joke."
];

async function runEndToEnd(q: string, ctx: any, history: any[] = []) {
  try {
    const plan = await aiProvider.generateStructuredQuery(q, ctx, history);
    
    let validatedQuery = plan;
    try {
      const valRes = AIQueryValidationService.validateQueryPlan(plan, ctx, []);
      if (valRes.ambiguousColumns && valRes.ambiguousColumns.length > 1) {
         return { error: `[VALIDATION AMBIGUOUS]: Found multiple possible columns. Which one do you mean? - ${valRes.ambiguousColumns.join(', ')}` };
      }
      validatedQuery = valRes.validatedQuery;
    } catch (e: any) {
       return { error: `[VALIDATION FAILED]: ${e.message}` };
    }

    const res = await engine.executeQuery(ctx as any, 'user1', validatedQuery, ctx);
    
    return { plan, result: res };
  } catch (err: any) {
    return { error: `[ERROR]: ${err.message}` };
  }
}

async function runTests() {
  console.log('=== LAYER B & END-TO-END TESTS ===\n');
  
  for (const q of questions) {
    console.log(`[Q]: ${q}`);
    const res = await runEndToEnd(q, contextB);
    if (res.error) {
      console.log(`   -> ${res.error}\n`);
    } else {
      console.log(`   -> INTENT: ${res.plan!.intent} | TARGET: ${res.plan!.metric || res.plan!.column || 'NONE'}`);
      if (res.result!.resultType === 'metric') console.log(`   -> ACTUAL RESULT: ${res.result!.metricValue}`);
      if (res.result!.resultType === 'table') console.log(`   -> ACTUAL RESULT: [Table rows: ${res.result!.tableData?.length}]`);
      console.log('');
    }
  }

  console.log('=== CONTEXT ISOLATION & FOLLOW-UP CONVERSATION ===\n');
  
  // Conversation A
  let historyA: any[] = [];
  const qa1 = "Show revenue by category.";
  console.log(`[Q]: ${qa1}`);
  const r1 = await runEndToEnd(qa1, contextB, historyA);
  console.log(`   -> PLAN: ${JSON.stringify(r1.plan)}`);
  historyA.push({ role: 'user', content: qa1 }, { role: 'assistant', content: 'Table list', structuredResult: { queryPlan: r1.plan }});

  const qa2 = "Which one is highest?";
  console.log(`[Q]: ${qa2} (Follow up)`);
  const r2 = await runEndToEnd(qa2, contextB, historyA);
  console.log(`   -> PLAN: ${JSON.stringify(r2.plan)}`);
  historyA.push({ role: 'user', content: qa2 }, { role: 'assistant', content: 'Table list', structuredResult: { queryPlan: r2.plan }});

  const qa3 = "What about the lowest?";
  console.log(`[Q]: ${qa3} (Follow up)`);
  const r3 = await runEndToEnd(qa3, contextB, historyA);
  console.log(`   -> PLAN: ${JSON.stringify(r3.plan)}`);
  historyA.push({ role: 'user', content: qa3 }, { role: 'assistant', content: 'Table list', structuredResult: { queryPlan: r3.plan }});

  const qa4 = "Show the top 2.";
  console.log(`[Q]: ${qa4} (Follow up)`);
  const r4 = await runEndToEnd(qa4, contextB, historyA);
  console.log(`   -> PLAN: ${JSON.stringify(r4.plan)}`);
  
  // Conversation B (Isolated)
  console.log(`\n--- New Conversation (Isolated Context) ---`);
  const qb1 = "What is the average profit?";
  console.log(`[Q]: ${qb1}`);
  const rb1 = await runEndToEnd(qb1, contextB, []);
  console.log(`   -> PLAN: ${JSON.stringify(rb1.plan)}\n`);

  console.log('=== DATASET SELECTION VERIFICATION ===\n');
  console.log('[Q]: What is the total revenue? (Against Dataset A)');
  const dsa = await runEndToEnd("What is the total revenue?", contextA);
  console.log(`   -> RESULT: ${dsa.result!.metricValue}`);

  console.log('[Q]: What is the total revenue? (Against Dataset B)');
  const dsb = await runEndToEnd("What is the total revenue?", contextB);
  console.log(`   -> RESULT: ${dsb.result!.metricValue}`);
}

runTests().catch(console.error);
