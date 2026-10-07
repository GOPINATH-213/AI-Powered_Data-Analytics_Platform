import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { aiAnalyticsService } from '../services/AIAnalyticsService';
import { AIConversationModel } from '../models/AIConversation';

const router = Router();

// Apply auth verification to all routes
router.use(protect as any);

/**
 * Submit natural language question
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { datasetId, question, conversationId } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.uid || (req as any).user?.id;

    if (!datasetId || !question) {
      return res.status(400).json({ status: 'error', message: 'datasetId and question prompt are required parameters.' });
    }

    const payload = await aiAnalyticsService.processQuery(userId, datasetId, question, conversationId);
    return res.status(200).json({ status: 'success', data: payload });
  } catch (error: any) {
    console.error('[AI Analytics Query Route Error]:', error);
    return res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'An error occurred while analyzing your query.'
    });
  }
});

/**
 * Fetch past chat threads list
 */
router.get('/conversations/:datasetId', async (req: Request, res: Response) => {
  try {
    const { datasetId } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.uid || (req as any).user?.id;

    const list = await AIConversationModel.find({
      userId,
      $or: [
        { datasetId: datasetId as any },
        { combinedDatasetId: datasetId as any }
      ]
    })
      .select('_id title datasetVersion updatedAt pendingClarification')
      .sort({ updatedAt: -1 });

    return res.status(200).json({ status: 'success', data: list });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Fetch conversation details
 */
router.get('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.uid || (req as any).user?.id;

    const conversation = await AIConversationModel.findOne({ _id: conversationId, userId });
    if (!conversation) {
      return res.status(404).json({ status: 'error', message: 'Conversation not found.' });
    }

    return res.status(200).json({ status: 'success', data: conversation });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Delete/archive thread
 */
router.delete('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.uid || (req as any).user?.id;

    const deleted = await AIConversationModel.findOneAndDelete({ _id: conversationId, userId });
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Conversation not found or unauthorized.' });
    }

    return res.status(200).json({ status: 'success', message: 'Conversation deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Rename/Edit conversation title
 */
router.patch('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.uid || (req as any).user?.id;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ status: 'fail', message: 'Please enter a valid conversation name.' });
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 100) {
      return res.status(400).json({ status: 'fail', message: 'Please enter a valid conversation name.' });
    }

    const conversation = await AIConversationModel.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ status: 'fail', message: 'Conversation not found.' });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({ status: 'fail', message: 'Unauthorized conversation access.' });
    }

    conversation.title = trimmedTitle;
    conversation.isCustomTitle = true;
    await conversation.save();

    return res.status(200).json({ status: 'success', data: conversation });
  } catch (error: any) {
    return res.status(400).json({ status: 'fail', message: 'Please enter a valid conversation name.' });
  }
});

/**
 * Load Dynamic Suggestions
 */
router.get('/suggestions/:datasetId', async (req: Request, res: Response) => {
  try {
    const { datasetId } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.uid || (req as any).user?.id;

    const suggestions = await aiAnalyticsService.getSuggestedQuestions(datasetId, userId);
    return res.status(200).json({ status: 'success', data: suggestions });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;