import { Types } from 'mongoose';
import { AIConversationModel, IAIConversation, IMessage } from '../models/AIConversation';
import { datasetContextService, DatasetContext } from './DatasetContextService';
import { aiProviderService, StructuredQuery } from './AIProviderService';
import { analyticsQueryEngine } from './AnalyticsQueryEngine';
import { AIQueryValidationService } from './AIQueryValidationService';
import { datasetRepository } from '../repositories/DatasetRepository';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { ValidationError, NotFoundError } from '../utils/errors';

export class AIAnalyticsService {
  /**
   * Main entrypoint to process a user question, calculate results deterministically, and explain them.
   */
  async processQuery(
    userId: string,
    datasetId: string,
    question: string,
    conversationId?: string
  ): Promise<{
    conversationId: string;
    answer: string;
    querySummary: string;
    resultType: 'metric' | 'table' | 'chart' | 'text';
    metricValue?: any;
    tableData?: any[];
    chartConfig?: any;
    truncated: boolean;
    infoMessage?: string;
    ambiguityOptions?: string[];
  }> {
    // 1. Fetch and validate context
    const context = await datasetContextService.getDatasetContext(datasetId, userId);

    if (context.processingStatus !== 'processed') {
      throw new ValidationError('This dataset is currently processing. AI analytics is disabled until ingestion completes.');
    }

    if (context.readinessScore < 50) {
      throw new ValidationError('This dataset did not pass the Analytics Readiness Assessment and AI Analytics is blocked.');
    }

    if (context.freshnessStatus === 'regeneration_required') {
      throw new ValidationError('This dataset requires regeneration. Please run the ingestion pipeline to refresh analysis.');
    }

    // 2. Retrieve or initiate Mongoose conversation
    let conversation: IAIConversation | null = null;
    if (conversationId) {
      conversation = await AIConversationModel.findById(conversationId);
      if (!conversation) {
        throw new NotFoundError('Conversation session not found.');
      }
      if (conversation.userId !== userId) {
        throw new ValidationError('Unauthorized conversation access.');
      }
      if (conversation.datasetVersion !== context.currentVersion) {
        return {
          conversationId: conversation._id.toString(),
          answer: 'Dataset version changed. Previous AI responses were generated using an earlier version of this dataset. Please run the ingestion pipeline for the active version and start a new analysis.',
          querySummary: 'Dataset version mismatch.',
          resultType: 'text',
          truncated: false
        };
      }
    } else {
      const isComb = context.isCombined;
      conversation = new AIConversationModel({
        userId,
        datasetId: isComb ? undefined : new Types.ObjectId(datasetId),
        combinedDatasetId: isComb ? new Types.ObjectId(datasetId) : undefined,
        datasetVersion: context.currentVersion,
        title: `Chat on ${context.datasetName}`,
        messages: [],
        pendingClarification: null
      });
      await conversation.save();
    }

    let activeQuestion = question.trim();

    // 3. Resolve pending clarification if user is answering a column selection prompt
    if (conversation.pendingClarification && conversation.pendingClarification.options.length > 0) {
      const selected = conversation.pendingClarification.options.find(
        opt => opt.toLowerCase() === activeQuestion.toLowerCase()
      );

      if (selected) {
        activeQuestion = `${conversation.pendingClarification.originalQuestion} by ${selected}`;
        conversation.pendingClarification = null;
      }
    }

    // 4. Translate question to Structured Query JSON via AI Provider
    const history = conversation.messages.map(m => ({ role: m.role, content: m.content }));
    const structuredQuery = await aiProviderService.generateStructuredQuery(activeQuestion, context, history);

    // 5. Validate structured query plan
    const previousSignatures = (conversation.messages || [])
      .filter(m => (m.role === 'assistant' || m.role === 'model') && m.structuredResult?.queryPlan)
      .map(m => AIQueryValidationService.calculateSignature(m.structuredResult!.queryPlan));

    let validatedQuery = structuredQuery;
    try {
      const validation = AIQueryValidationService.validateQueryPlan(structuredQuery, context, previousSignatures);

      // Handle Column Ambiguity
      if (validation.ambiguousColumns && validation.ambiguousColumns.length > 1) {
        conversation.pendingClarification = {
          originalQuestion: activeQuestion,
          ambiguityType: 'COLUMN',
          options: validation.ambiguousColumns,
          partialQuery: structuredQuery,
          timestamp: new Date()
        };

        const clarificationMsg: IMessage = {
          role: 'assistant',
          content: 'Select the correct column to analyze:\n' + validation.ambiguousColumns.join('\n'),
          clarificationOptions: validation.ambiguousColumns,
          createdAt: new Date()
        };

        conversation.messages.push({
          role: 'user',
          content: question,
          createdAt: new Date()
        });
        conversation.messages.push(clarificationMsg);
        await conversation.save();

        return {
          conversationId: conversation._id.toString(),
          answer: clarificationMsg.content,
          querySummary: 'Ambiguous column request detected.',
          resultType: 'text',
          truncated: false,
          ambiguityOptions: validation.ambiguousColumns
        };
      }

      validatedQuery = validation.validatedQuery;
    } catch (err: any) {
      const isRepeated = err.message === 'REPEATED_PLAN_DETECTED';
      const msgText = isRepeated
        ? "I couldn't confidently determine how to analyze that question from this dataset. Please try rephrasing it or specify the column you want to analyze."
        : (err.message || "I couldn't confidently determine how to analyze that question from this dataset.");

      const failedMsg: IMessage = {
        role: 'assistant',
        content: msgText,
        createdAt: new Date()
      };

      conversation.messages.push({ role: 'user', content: question, createdAt: new Date() });
      conversation.messages.push(failedMsg);
      await conversation.save();

      return {
        conversationId: conversation._id.toString(),
        answer: msgText,
        querySummary: isRepeated ? 'Repeated query plan mapping rejected.' : 'Query plan validation failed.',
        resultType: 'text',
        truncated: false,
        ambiguityOptions: context.columns.slice(0, 5)
      };
    }

    // 6. Load dataset model
    let datasetModel: any = await datasetRepository.findById(datasetId);
    if (!datasetModel) {
      datasetModel = await combinedDatasetRepository.findById(datasetId);
    }

    // 7. Execute aggregation on backend query engine
    const execution = await analyticsQueryEngine.executeQuery(datasetModel, userId, validatedQuery, context);

    // Validate Response Relevance
    const isRelevancePassed = AIQueryValidationService.validateResponseRelevance(validatedQuery.intent, execution);
    if (!isRelevancePassed) {
      return {
        conversationId: conversation._id.toString(),
        answer: "I couldn't confidently determine how to analyze that question from this dataset. Please try rephrasing it or specify the column you want to analyze.",
        querySummary: 'Response relevance check failed.',
        resultType: 'text',
        truncated: false,
        ambiguityOptions: context.columns.slice(0, 5)
      };
    }

    // 8. Generate Natural Language Explanation
    const explanation = await aiProviderService.generateNaturalLanguageResponse(
      activeQuestion,
      execution.summary,
      execution.resultType === 'metric' ? execution.metricValue : (execution.chartData || execution.tableData || []),
      context
    );

    // 9. Append messages and update title
    const userMsg: IMessage = {
      role: 'user',
      content: question,
      createdAt: new Date()
    };

    const assistantMsg: IMessage = {
      role: 'assistant',
      content: explanation,
      structuredResult: {
        summary: execution.summary,
        resultType: execution.resultType,
        metricValue: execution.metricValue,
        tableData: execution.tableData,
        chartData: execution.chartData,
        chartConfig: execution.chartConfig,
        truncated: execution.truncated,
        infoMessage: execution.infoMessage,
        queryPlan: validatedQuery
      },
      createdAt: new Date()
    };

    if (!conversation.isCustomTitle && conversation.messages.length === 0) {
      let suggestedTitle = `Chat on ${context.datasetName}`;
      const lowerQ = activeQuestion.toLowerCase();
      if (lowerQ.includes('revenue') || lowerQ.includes('sales')) {
        suggestedTitle = 'Revenue Analysis';
        if (lowerQ.includes('by')) suggestedTitle = 'Sales Breakdown';
      } else if (lowerQ.includes('overview') || lowerQ.includes('summarize')) {
        suggestedTitle = 'Dataset Overview';
      } else if (lowerQ.includes('profit')) {
        suggestedTitle = 'Profit Analysis';
      } else if (lowerQ.includes('categories') || lowerQ.includes('list')) {
        suggestedTitle = 'Category Listing';
      }
      conversation.title = suggestedTitle;
    }

    conversation.messages.push(userMsg);
    conversation.messages.push(assistantMsg);
    conversation.pendingClarification = null; // Clear pending state upon successful plan resolution
    await conversation.save();

    return {
      conversationId: conversation._id.toString(),
      answer: explanation,
      querySummary: execution.summary,
      resultType: execution.resultType,
      metricValue: execution.metricValue,
      tableData: execution.tableData,
      chartConfig: execution.chartConfig || (execution.resultType === 'chart' ? { chartType: 'bar', xAxisKey: 'category', yAxisKey: 'value' } : undefined),
      truncated: execution.truncated,
      infoMessage: execution.infoMessage
    };
  }

  /**
   * Returns Dynamic list of suggestions based on columns present in the dataset.
   */
  async getSuggestedQuestions(datasetId: string, userId: string): Promise<string[]> {
    const context = await datasetContextService.getDatasetContext(datasetId, userId);
    const suggestions: string[] = [];

    const numericCol = Object.keys(context.columnTypes).find(k => context.columnTypes[k] === 'number');
    const categoricalCol = Object.keys(context.columnTypes).find(k => context.columnTypes[k] === 'string' && k.toLowerCase() !== 'date');

    if (numericCol) {
      suggestions.push(`What is the total ${numericCol.replace(/_/g, ' ')}?`);
      if (categoricalCol) {
        suggestions.push(`Show ${numericCol.replace(/_/g, ' ')} by ${categoricalCol.replace(/_/g, ' ')} as a bar chart.`);
        suggestions.push(`Who are the top 5 ${categoricalCol.replace(/_/g, ' ')} by ${numericCol.replace(/_/g, ' ')}?`);
      }
    }

    const dateCol = Object.keys(context.columnTypes).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('month'));
    if (dateCol && numericCol) {
      suggestions.push(`Show monthly ${numericCol.replace(/_/g, ' ')} trend.`);
    }

    suggestions.push('What are the key business insights in this dataset?');

    return suggestions.slice(0, 4);
  }
}

export const aiAnalyticsService = new AIAnalyticsService();
export default aiAnalyticsService;