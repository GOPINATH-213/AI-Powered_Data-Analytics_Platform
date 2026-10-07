import { Schema, model, Document, Types } from 'mongoose';

export interface IPendingClarification {
  originalQuestion: string;
  ambiguityType: 'COLUMN' | 'METRIC' | 'OPERATION';
  options: string[];
  partialQuery?: Record<string, any>;
  timestamp: Date;
}

export interface IMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
  structuredResult?: Record<string, any>;
  clarificationOptions?: string[];
  createdAt: Date;
}

export interface IAIConversation extends Document {
  userId: string;
  datasetId?: Types.ObjectId;
  combinedDatasetId?: Types.ObjectId;
  datasetVersion: number;
  title: string;
  isCustomTitle: boolean;
  messages: IMessage[];
  pendingClarification?: IPendingClarification | null;
  createdAt: Date;
  updatedAt: Date;
}

const PendingClarificationSchema = new Schema<IPendingClarification>(
  {
    originalQuestion: { type: String, required: true },
    ambiguityType: {
      type: String,
      enum: ['COLUMN', 'METRIC', 'OPERATION'],
      default: 'COLUMN'
    },
    options: [{ type: String }],
    partialQuery: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'model'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    structuredResult: {
      type: Schema.Types.Mixed,
      default: {},
    },
    clarificationOptions: [{ type: String }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const AIConversationSchema = new Schema<IAIConversation>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'Dataset',
      index: true,
    },
    combinedDatasetId: {
      type: Schema.Types.ObjectId,
      ref: 'CombinedDataset',
      index: true,
    },
    datasetVersion: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isCustomTitle: {
      type: Boolean,
      default: false,
    },
    messages: [MessageSchema],
    pendingClarification: {
      type: PendingClarificationSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Exclusivity validation: Enforce only one of datasetId or combinedDatasetId is populated
AIConversationSchema.pre('save', function (next) {
  if (this.datasetId && this.combinedDatasetId) {
    return next(new Error('A conversation cannot belong to both a single Dataset and a CombinedDataset simultaneously.'));
  }
  if (!this.datasetId && !this.combinedDatasetId) {
    return next(new Error('A conversation must specify either a datasetId or a combinedDatasetId.'));
  }
  next();
});

export const AIConversationModel = model<IAIConversation>('AIConversation', AIConversationSchema);
export default AIConversationModel;