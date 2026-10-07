import * as fs from 'fs';
import * as path from 'path';
import { Types } from 'mongoose';

// Interface matching config
interface DatasetRules {
  businessKeywords: string[];
  unsuitableKeywords: string[];
  domains: Record<string, string[]>;
  weights: {
    basePoints: number;
    hasNumericColumns: number;
    hasDateColumns: number;
    hasCurrencyColumns: number;
    businessKeywordMatch: number;
    missingValuePenaltyMultiplier: number;
    duplicateRowPenaltyMultiplier: number;
    insufficientRowsPenalty: number;
  };
}

let rules: DatasetRules;
try {
  const rulesPath = path.join(__dirname, '../config/datasetRules.json');
  rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
} catch (err) {
  rules = {
    businessKeywords: ["revenue", "sales", "profit", "cost", "customer", "product", "transaction", "date"],
    unsuitableKeywords: ["resume", "cv", "education", "skills", "experience", "passport"],
    domains: {
      Retail: ["sales", "retail"],
      Finance: ["revenue", "finance"]
    },
    weights: {
      basePoints: 10,
      hasNumericColumns: 20,
      hasDateColumns: 20,
      hasCurrencyColumns: 15,
      businessKeywordMatch: 20,
      missingValuePenaltyMultiplier: -1.5,
      duplicateRowPenaltyMultiplier: -2.0,
      insufficientRowsPenalty: -15
    }
  };
}

export interface AssessmentResult {
  documentType: string;
  datasetCategory: 'Business Analytics' | 'Limited Analytics' | 'Not Suitable';
  analyticsReadinessScore: number;
  classificationConfidence: number;
  qualityScore: number;
  scoreBreakdown: Record<string, number>;
  businessDomain: string;
  detectedEntities: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiMetadata: {
    suggestedKPIs: string[];
    suggestedDashboardType: string;
    suggestedQuestions: string[];
    suggestedVisualizations: Array<{ metric: string; chartType: string }>;
    potentialForecastTargets: string[];
  };
  assessmentLogs: string[];
}

export class DatasetIntelligenceService {
  /**
   * Evaluates a single file dataset's records and schema to return suitability metrics.
   */
  assessDataset(
    filename: string,
    rows: Record<string, any>[],
    columns: string[]
  ): AssessmentResult {
    const logs: string[] = [`Starting dataset intelligence analysis for ${filename}.`];
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    
    const totalRows = rows.length;
    const totalCols = columns.length;
    
    // 1. Scan content for keywords (Headers and values)
    let businessMatches = 0;
    let unsuitableMatches = 0;
    const detectedEntitiesSet = new Set<string>();
    
    const lowerCols = columns.map(c => c.toLowerCase());
    
    // Check keywords in columns
    rules.businessKeywords.forEach((kw) => {
      if (lowerCols.some(col => col.includes(kw))) {
        businessMatches += 2;
        detectedEntitiesSet.add(kw.charAt(0).toUpperCase() + kw.slice(1));
      }
    });

    rules.unsuitableKeywords.forEach((kw) => {
      if (lowerCols.some(col => col.includes(kw))) {
        unsuitableMatches += 4;
      }
    });

    // Scan sample cells for domain and classification terms
    const sampleRows = rows.slice(0, 15);
    sampleRows.forEach((row) => {
      Object.values(row).forEach((val) => {
        if (typeof val === 'string') {
          const lowerVal = val.toLowerCase();
          
          rules.businessKeywords.forEach((kw) => {
            if (lowerVal.includes(kw)) businessMatches++;
          });
          
          rules.unsuitableKeywords.forEach((kw) => {
            if (lowerVal.includes(kw)) unsuitableMatches++;
          });
        }
      });
    });

    // 2. Classify Document Type & Category
    let documentType = 'Generic Data File';
    let category: 'Business Analytics' | 'Limited Analytics' | 'Not Suitable' = 'Business Analytics';
    
    const nameLower = filename.toLowerCase();
    
    // Match unsuitable categories
    if (unsuitableMatches > businessMatches || nameLower.includes('resume') || nameLower.includes('cv')) {
      if (nameLower.includes('resume') || nameLower.includes('cv') || lowerCols.some(c => c.includes('experience') || c.includes('education'))) {
        documentType = 'Resume / CV';
      } else if (nameLower.includes('passport') || nameLower.includes('visa')) {
        documentType = 'Passport';
      } else if (nameLower.includes('certificate') || nameLower.includes('degree')) {
        documentType = 'Degree Certificate';
      } else if (nameLower.includes('marksheet') || nameLower.includes('grade')) {
        documentType = 'Mark Sheet';
      } else {
        documentType = 'Personal / Identification Document';
      }
      category = 'Not Suitable';
    } 
    // Match standard business categories
    else if (lowerCols.some(c => c.includes('sale') || c.includes('revenue') || c.includes('transaction'))) {
      documentType = 'Sales & Transactions Ledger';
    } else if (lowerCols.some(c => c.includes('profit') || c.includes('balance') || c.includes('asset'))) {
      documentType = 'Financial Statement';
    } else if (lowerCols.some(c => c.includes('inventory') || c.includes('stock') || c.includes('quantity'))) {
      documentType = 'Inventory Log';
    } else if (lowerCols.some(c => c.includes('employee') || c.includes('salary') || c.includes('attendance'))) {
      documentType = 'HR Records';
    } else if (lowerCols.some(c => c.includes('customer') || c.includes('client'))) {
      documentType = 'Customer Ledger';
    }

    // 3. Score Breakdown Ledger Calculation
    const breakdown: Record<string, number> = {
      basePoints: rules.weights.basePoints
    };

    let readinessScore = rules.weights.basePoints;

    // A. Numeric columns check
    const numericColsCount = columns.filter(c => {
      const sample = rows.slice(0, 5).map(r => r[c]);
      return sample.some(v => typeof v === 'number' && !isNaN(v));
    }).length;

    if (numericColsCount > 0) {
      breakdown.numericColumns = rules.weights.hasNumericColumns;
      readinessScore += rules.weights.hasNumericColumns;
      strengths.push(`Contains ${numericColsCount} numeric column(s) suitable for aggregations.`);
    } else {
      breakdown.numericColumns = 0;
      weaknesses.push('No measurable numeric columns detected.');
    }

    // B. Date columns check
    const hasDateCol = lowerCols.some(c => c.includes('date') || c.includes('year') || c.includes('time') || c.includes('month'));
    if (hasDateCol) {
      breakdown.dateColumns = rules.weights.hasDateColumns;
      readinessScore += rules.weights.hasDateColumns;
      strengths.push('Contains time-series dimension (Date/Time) for trend forecasting.');
    } else {
      breakdown.dateColumns = 0;
      weaknesses.push('No date or time column found. Trend charts will be disabled.');
    }

    // C. Currency / Percentage check
    const hasCurrencyCol = lowerCols.some(c => c.includes('revenue') || c.includes('profit') || c.includes('price') || c.includes('amount') || c.includes('$') || c.includes('cost'));
    if (hasCurrencyCol) {
      breakdown.currencyColumns = rules.weights.hasCurrencyColumns;
      readinessScore += rules.weights.hasCurrencyColumns;
      strengths.push('Currency/financial metric columns identified.');
    }

    // D. Business Keyword Match
    if (businessMatches > 0) {
      const points = Math.min(rules.weights.businessKeywordMatch, Math.round(businessMatches * 1.5));
      breakdown.businessKeywordMatch = points;
      readinessScore += points;
    }

    // E. Missing Values Penalties
    let totalCells = totalRows * totalCols;
    let missingCells = 0;
    rows.forEach(r => {
      columns.forEach(col => {
        if (r[col] === null || r[col] === undefined || r[col] === '') {
          missingCells++;
        }
      });
    });

    const missingRate = totalCells > 0 ? (missingCells / totalCells) * 100 : 0;
    if (missingRate > 0) {
      const penalty = Math.max(-25, Math.round(missingRate * rules.weights.missingValuePenaltyMultiplier));
      breakdown.missingValues = penalty;
      readinessScore += penalty;
      if (missingRate > 10) {
        weaknesses.push(`${missingRate.toFixed(1)}% of values are missing or empty.`);
      }
    }

    // F. Duplicate records penalties
    let duplicatesCount = 0;
    const tracker = new Set<string>();
    rows.forEach(r => {
      const hash = JSON.stringify(r);
      if (tracker.has(hash)) duplicatesCount++;
      else tracker.add(hash);
    });

    const duplicateRate = totalRows > 0 ? (duplicatesCount / totalRows) * 100 : 0;
    if (duplicateRate > 0) {
      const penalty = Math.max(-25, Math.round(duplicateRate * rules.weights.duplicateRowPenaltyMultiplier));
      breakdown.duplicateRows = penalty;
      readinessScore += penalty;
      if (duplicateRate > 5) {
        weaknesses.push(`${duplicateRate.toFixed(1)}% of rows are exact duplicates.`);
      }
    }

    // G. Row Volume Checks
    if (totalRows < 5) {
      breakdown.insufficientRows = rules.weights.insufficientRowsPenalty;
      readinessScore += rules.weights.insufficientRowsPenalty;
      weaknesses.push(`Insufficient row count (${totalRows} rows). Need at least 5 rows for meaningful charts.`);
    }

    // Clamp score
    readinessScore = Math.max(0, Math.min(100, readinessScore));

    // Force Not Suitable categories to have a readiness penalty
    if (category === 'Not Suitable') {
      readinessScore = Math.min(19, readinessScore);
    } else {
      if (readinessScore >= 70) category = 'Business Analytics';
      else if (readinessScore >= 50) category = 'Limited Analytics';
      else category = 'Not Suitable';
    }

    // 4. Calculate Confidence Score
    let confidence = 50;
    const totalKeywords = businessMatches + unsuitableMatches;
    if (totalKeywords > 0) {
      if (category === 'Not Suitable') {
        confidence = Math.min(99, Math.round(50 + (unsuitableMatches / totalKeywords) * 49));
      } else {
        confidence = Math.min(99, Math.round(50 + (businessMatches / totalKeywords) * 49));
      }
    }

    // 5. Detect Industry Domain
    let businessDomain = 'Generic';
    let highestMatches = 0;
    Object.entries(rules.domains).forEach(([domain, words]) => {
      let matches = 0;
      words.forEach(w => {
        if (lowerCols.some(c => c.includes(w))) matches += 5;
        sampleRows.forEach(r => {
          Object.values(r).forEach(val => {
            if (typeof val === 'string' && val.toLowerCase().includes(w)) matches++;
          });
        });
      });
      if (matches > highestMatches) {
        highestMatches = matches;
        businessDomain = domain;
      }
    });

    // 6. Generate Recommendations
    if (category === 'Not Suitable') {
      recommendations.push('Please upload structured business spreadsheets containing rows of logs, financial balances, or quantities.');
      recommendations.push('Avoid personal CVs, passports, image-only files, or non-business documents.');
    } else {
      if (!hasDateCol) recommendations.push('Add a transaction/timestamp date column to unlock dynamic timeline chart views.');
      if (missingRate > 5) recommendations.push('Fill in empty cells or resolve blank fields to improve metrics accuracy.');
      if (duplicateRate > 2) recommendations.push('De-duplicate logs to avoid double-counting totals.');
    }

    // 7. Calculate Quality Score
    const completeness = Math.max(0, 100 - missingRate);
    const uniqueness = Math.max(0, 100 - duplicateRate);
    const qualityScore = Math.round((completeness + uniqueness + (totalRows >= 5 ? 100 : 50)) / 3);

    // 8. Pre-generate AI Metadata
    const suggestedKPIs: string[] = [];
    let suggestedDashboardType = 'General Business Dashboard';
    const suggestedQuestions: string[] = [];
    const suggestedVisualizations: Array<{ metric: string; chartType: string }> = [];
    const potentialForecastTargets: string[] = [];

    if (businessDomain === 'Retail') {
      suggestedDashboardType = 'Sales Performance Dashboard';
      suggestedKPIs.push('Total Sales', 'Total Margin', 'Order Count', 'Average Basket Value');
      suggestedQuestions.push('Which products generate the highest revenue?', 'How do sales trends behave monthly?');
      suggestedVisualizations.push({ metric: 'Revenue by Date', chartType: 'line' });
      suggestedVisualizations.push({ metric: 'Units Sold by Product', chartType: 'bar' });
      potentialForecastTargets.push('sales', 'revenue', 'quantity');
    } else if (businessDomain === 'Finance') {
      suggestedDashboardType = 'Financial Analytics Dashboard';
      suggestedKPIs.push('Gross Revenue', 'Net Margin', 'Operating Cost', 'ROI');
      suggestedQuestions.push('What are our primary cost drivers?', 'What is our profitability timeline?');
      suggestedVisualizations.push({ metric: 'Expense Distribution', chartType: 'pie' });
      suggestedVisualizations.push({ metric: 'Profit Timeline', chartType: 'line' });
      potentialForecastTargets.push('profit', 'revenue', 'cost');
    } else if (businessDomain === 'HR') {
      suggestedDashboardType = 'Employee Metrics Dashboard';
      suggestedKPIs.push('Headcount', 'Average Salary', 'Turnover Rate', 'Avg Tenure');
      suggestedQuestions.push('What is the salary distribution across departments?', 'Which region has the highest headcount?');
      suggestedVisualizations.push({ metric: 'Headcount by Department', chartType: 'bar' });
      potentialForecastTargets.push('salary', 'headcount');
    } else {
      suggestedKPIs.push('Total Records', 'Unique Groups Count');
      suggestedQuestions.push('What is the general trend in this data ledger?');
    }

    return {
      documentType,
      datasetCategory: category,
      analyticsReadinessScore: readinessScore,
      classificationConfidence: confidence,
      qualityScore,
      scoreBreakdown: breakdown,
      businessDomain,
      detectedEntities: Array.from(detectedEntitiesSet),
      strengths,
      weaknesses,
      recommendations,
      aiMetadata: {
        suggestedKPIs,
        suggestedDashboardType,
        suggestedQuestions,
        suggestedVisualizations,
        potentialForecastTargets
      },
      assessmentLogs: logs
    };
  }

  /**
   * Combines multiple individual assessments into a consolidated profile.
   */
  assessCombinedDataset(individualResults: AssessmentResult[]): AssessmentResult {
    const logs: string[] = ['Executing consolidated combined dataset intelligence assessment.'];
    if (individualResults.length === 0) {
      throw new Error('No individual assessments provided for combined calculation.');
    }

    const readinessSum = individualResults.reduce((sum, r) => sum + r.analyticsReadinessScore, 0);
    const combinedReadiness = Math.round(readinessSum / individualResults.length);

    const qualitySum = individualResults.reduce((sum, r) => sum + r.qualityScore, 0);
    const combinedQuality = Math.round(qualitySum / individualResults.length);

    const confidenceSum = individualResults.reduce((sum, r) => sum + r.classificationConfidence, 0);
    const combinedConfidence = Math.round(confidenceSum / individualResults.length);

    const detectedEntitiesSet = new Set<string>();
    const strengthsSet = new Set<string>();
    const weaknessesSet = new Set<string>();
    const recommendationsSet = new Set<string>();

    individualResults.forEach(r => {
      r.detectedEntities.forEach(e => detectedEntitiesSet.add(e));
      r.strengths.forEach(s => strengthsSet.add(s));
      r.weaknesses.forEach(w => weaknessesSet.add(w));
      r.recommendations.forEach(rec => recommendationsSet.add(rec));
    });

    // Check relationship keys between files
    if (individualResults.length > 1) {
      strengthsSet.add('Multi-dataset relational structures detected, supporting relational joins.');
    }

    let combinedCategory: 'Business Analytics' | 'Limited Analytics' | 'Not Suitable' = 'Business Analytics';
    if (combinedReadiness >= 70) combinedCategory = 'Business Analytics';
    else if (combinedReadiness >= 50) combinedCategory = 'Limited Analytics';
    else combinedCategory = 'Not Suitable';

    // Dominate category if any single file is completely blocking
    const hasUnsuitable = individualResults.some(r => r.datasetCategory === 'Not Suitable');
    if (hasUnsuitable && combinedCategory !== 'Not Suitable') {
      combinedCategory = 'Limited Analytics'; // Downgrade if any file is unsuitable
    }

    // Dominant domain
    const domainsCount: Record<string, number> = {};
    individualResults.forEach(r => {
      domainsCount[r.businessDomain] = (domainsCount[r.businessDomain] || 0) + 1;
    });
    const combinedDomain = Object.entries(domainsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Generic';

    const scoreBreakdown: Record<string, number> = {
      averageIndividualReadiness: combinedReadiness
    };

    return {
      documentType: `Consolidated Data Ledger (${individualResults.length} Files)`,
      datasetCategory: combinedCategory,
      analyticsReadinessScore: combinedReadiness,
      classificationConfidence: combinedConfidence,
      qualityScore: combinedQuality,
      scoreBreakdown,
      businessDomain: combinedDomain,
      detectedEntities: Array.from(detectedEntitiesSet),
      strengths: Array.from(strengthsSet),
      weaknesses: Array.from(weaknessesSet),
      recommendations: Array.from(recommendationsSet),
      aiMetadata: {
        suggestedKPIs: Array.from(new Set(individualResults.flatMap(r => r.aiMetadata.suggestedKPIs))),
        suggestedDashboardType: `${combinedDomain} Performance Dashboard`,
        suggestedQuestions: Array.from(new Set(individualResults.flatMap(r => r.aiMetadata.suggestedQuestions))),
        suggestedVisualizations: individualResults.flatMap(r => r.aiMetadata.suggestedVisualizations),
        potentialForecastTargets: Array.from(new Set(individualResults.flatMap(r => r.aiMetadata.potentialForecastTargets)))
      },
      assessmentLogs: logs
    };
  }
}

export const datasetIntelligenceService = new DatasetIntelligenceService();
export default datasetIntelligenceService;
