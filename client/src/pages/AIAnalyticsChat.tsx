import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Table as TableIcon,
  BarChart3,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  structuredResult?: {
    summary?: string;
    resultType?: 'metric' | 'table' | 'chart' | 'text';
    metricValue?: any;
    tableData?: any[];
    chartData?: any[];
    chartConfig?: {
      chartType: 'bar' | 'line' | 'pie';
      xAxisKey: string;
      yAxisKey: string;
      title: string;
    };
    truncated?: boolean;
    infoMessage?: string;
  };
  createdAt?: string;
}

interface Conversation {
  _id: string;
  title: string;
  datasetVersion: number;
  updatedAt: string;
}

interface DatasetContext {
  datasetId: string;
  datasetName: string;
  datasetType: 'single' | 'combined';
  isCombined: boolean;
  currentVersion: number;
  freshnessStatus: string;
  processingStatus: string;
  readinessScore: number;
  columns: string[];
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#e11d48', '#be123c'];

export const AIAnalyticsChat: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();

  const [context, setContext] = useState<DatasetContext | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Thinking...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ambiguityOptions, setAmbiguityOptions] = useState<string[] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load context & suggestions on start
  useEffect(() => {
    if (datasetId) {
      fetchContext();
      fetchConversations();
      fetchSuggestions();
    }
  }, [datasetId]);

  // Load selected conversation details
  useEffect(() => {
    if (activeConvId) {
      fetchConversationDetails(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  const getAuthHeader = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchContext = async () => {
    try {
      const res = await axios.get(`/api/dataset-assessment/${datasetId}`, { headers: getAuthHeader() });
      const doc = res.data?.data?.dataset;
      const score = res.data?.data?.assessment?.analyticsReadinessScore || 0;
      if (doc) {
        setContext({
          datasetId: doc._id,
          datasetName: doc.datasetName,
          datasetType: doc.isCombined ? 'combined' : 'single',
          isCombined: !!doc.isCombined,
          currentVersion: doc.currentVersion || 1,
          freshnessStatus: doc.freshnessStatus || 'up_to_date',
          processingStatus: doc.processingStatus,
          readinessScore: score,
          columns: []
        });
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Failed to retrieve dataset context settings.');
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`/api/ai-analytics/conversations/${datasetId}`, { headers: getAuthHeader() });
      if (res.data?.status === 'success') {
        setConversations(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  const startEditTitle = () => {
    const activeConv = conversations.find(c => c._id === activeConvId);
    setEditedTitle(activeConv ? activeConv.title : 'Chat on ' + (context?.datasetName || ''));
    setIsEditingTitle(true);
    setTitleError(null);
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      setTitleError('Please enter a valid conversation name.');
      return;
    }
    const cleanTitle = editedTitle.trim();
    if (cleanTitle.length > 100) {
      setTitleError('Please enter a valid conversation name.');
      return;
    }
    setSavingTitle(true);
    setTitleError(null);
    try {
      const res = await axios.patch(
        `/api/ai-analytics/conversation/${activeConvId}`,
        { title: cleanTitle },
        { headers: getAuthHeader() }
      );
      if (res.data?.status === 'success') {
        setIsEditingTitle(false);
        fetchConversations();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Please enter a valid conversation name.';
      setTitleError(msg);
    } finally {
      setSavingTitle(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get(`/api/ai-analytics/suggestions/${datasetId}`, { headers: getAuthHeader() });
      if (res.data?.status === 'success') {
        setSuggestions(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load dynamic suggestions:', e);
    }
  };

  const fetchConversationDetails = async (convId: string) => {
    try {
      const res = await axios.get(`/api/ai-analytics/conversation/${convId}`, { headers: getAuthHeader() });
      if (res.data?.status === 'success') {
        setMessages(res.data.data.messages || []);
        setErrorMsg(null);
      }
    } catch (e) {
      console.error('Failed to load conversation details:', e);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const prompt = textToSend.trim();
    if (!prompt) return;

    setInput('');
    setAmbiguityOptions(null);
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setLoading(true);

    const stages = [
      'Understanding your question...',
      'Analyzing dataset context...',
      'Calculating results...',
      'Generating insights...'
    ];
    let stageIndex = 0;
    setLoadingStage(stages[0]);

    const stageInterval = setInterval(() => {
      if (stageIndex < stages.length - 1) {
        stageIndex++;
        setLoadingStage(stages[stageIndex]);
      }
    }, 1500);

    try {
      const res = await axios.post(
        '/api/ai-analytics/query',
        {
          datasetId,
          question: prompt,
          conversationId: activeConvId || undefined
        },
        { headers: getAuthHeader() }
      );

      clearInterval(stageInterval);

      if (res.data?.status === 'success') {
        const payload = res.data.data;
        if (!activeConvId) {
          setActiveConvId(payload.conversationId);
          fetchConversations();
        }

        if (payload.ambiguityOptions && payload.ambiguityOptions.length > 0) {
          setAmbiguityOptions(payload.ambiguityOptions);
        }

        // Reload conversation detail to keep full history aligned
        await fetchConversationDetails(payload.conversationId);
      }
    } catch (e: any) {
      clearInterval(stageInterval);
      const msg = e.response?.data?.message || 'We could not process that question right now. Please try again.';
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: msg
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setAmbiguityOptions(null);
    setErrorMsg(null);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation history?')) return;
    try {
      await axios.delete(`/api/ai-analytics/conversation/${convId}`, { headers: getAuthHeader() });
      fetchConversations();
      if (activeConvId === convId) {
        handleCreateNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const goBack = () => {
    if (context?.isCombined) {
      navigate(`/datasets/combine/${datasetId}`);
    } else {
      navigate(`/datasets/${datasetId}`);
    }
  };

  const isBlocked = context?.readinessScore !== undefined && context.readinessScore < 50;
  const isStale = context?.freshnessStatus === 'regeneration_required';
  const isProcessing = context?.processingStatus === 'processing';

  return (
    <div className="flex h-[calc(100vh-7rem)] border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
      {/* Left Sidebar Conversations List */}
      <div className="w-64 border-r border-border bg-background/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <span className="text-xs font-black tracking-wider uppercase text-foreground">Analyses</span>
          <button
            onClick={handleCreateNewChat}
            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-primary transition"
            title="Start New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No recent analytical chats found.
            </div>
          ) : (
            conversations.map(c => (
              <div
                key={c._id}
                onClick={() => setActiveConvId(c._id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs ${activeConvId === c._id ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'hover:bg-secondary text-muted-foreground'}`}
              >
                <div className="flex items-center gap-2 overflow-hidden mr-1">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(c._id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-600 transition p-0.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center Chat Console Window */}
      <div className="flex-1 flex flex-col bg-card relative">
        {/* Context Top Header row */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/30">
          <div className="space-y-0.5">
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <h2 className="text-sm font-black text-foreground mt-1 flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-primary" /> {context?.datasetName || 'AI Analytics Assistant'}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Type: <span className="font-semibold capitalize">{context?.datasetType || 'single'}</span> • Version: <span className="font-semibold">v{context?.currentVersion}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {context && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${isBlocked ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : isStale ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : isProcessing ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                {isBlocked ? '🔴 Blocked' : isStale ? '🟡 Ingestion Outdated' : isProcessing ? '⚪ Ingesting' : '🟢 AI Ready'}
              </span>
            )}
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Readiness Score</span>
              <span className={`text-xs font-black ${isBlocked ? 'text-rose-500' : 'text-emerald-500'}`}>{context?.readinessScore}%</span>
            </div>
          </div>
        </div>

        {/* Blocking notifications wrapper */}
        {isBlocked && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-500 text-xs flex gap-2.5 items-start">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">AI Access Blocked</span>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                This dataset did not pass the Analytics Readiness Assessment threshold (&ge; 50%). AI calculations are blocked.
              </p>
            </div>
          </div>
        )}

        {isStale && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs flex gap-2.5 items-start">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Regeneration Required</span>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Dataset metadata has changed. Please run the ingestion pipeline to refresh and re-enable AI querying.
              </p>
            </div>
          </div>
        )}

        {/* Chat Title Rename Bar */}
        {activeConvId && (
          <div className="px-4 py-2.5 border-b border-border bg-secondary/15 flex items-center justify-between text-xs text-muted-foreground font-semibold no-print-pdf">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-border bg-background rounded-lg text-xs text-foreground font-bold outline-none focus:border-primary"
                  placeholder="Conversation title..."
                  maxLength={100}
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/95 text-[10px] disabled:opacity-50"
                >
                  {savingTitle ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1.5 bg-secondary text-foreground font-bold rounded-lg hover:bg-secondary/90 text-[10px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Active Analysis: <span className="text-foreground font-extrabold">{conversations.find(c => c._id === activeConvId)?.title || 'Chat on ' + (context?.datasetName || '')}</span></span>
                <button
                  onClick={startEditTitle}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground text-[10px]"
                  title="Rename Conversation"
                >
                  ✏️
                </button>
              </div>
            )}
            {titleError && <span className="text-rose-500 font-bold text-[10px]">{titleError}</span>}
          </div>
        )}

        {/* Chat message dialog list container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div className="p-3 border border-rose-500/20 bg-rose-500/5 text-rose-500 rounded-xl text-xs flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col justify-center items-center text-center p-8 space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="font-black text-sm">Ask anything about this dataset</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Analyze columns, compile aggregations, query rankings, or render custom charts using natural English prompts.
                </p>
              </div>

              {suggestions.length > 0 && !isBlocked && !isStale && (
                <div className="flex flex-wrap gap-2 justify-center max-w-xl pt-4">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s)}
                      className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-xs rounded-xl transition font-medium"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const sr = m.structuredResult;
            return (
              <div key={idx} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${isUser ? 'bg-secondary border-border text-muted-foreground' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  {isUser ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                </div>

                <div className={`space-y-3 p-3.5 rounded-2xl text-xs leading-relaxed ${isUser ? 'bg-primary text-primary-foreground font-medium' : 'bg-secondary/45 border border-border text-foreground'}`}>
                  {/* Natural Language text response */}
                  <div>{m.content}</div>

                  {/* Render Structured Calculations */}
                  {sr && (
                    <div className="space-y-3 pt-2.5 border-t border-border/60">
                      {/* Metric calculation Card */}
                      {sr.resultType === 'metric' && sr.metricValue !== undefined && (
                        <div className="p-3 bg-card border border-border rounded-xl flex flex-col justify-center items-center shadow-sm">
                          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Result Value</span>
                          <span className="text-lg font-black text-primary mt-1">
                            {typeof sr.metricValue === 'number' ? sr.metricValue.toLocaleString() : sr.metricValue}
                          </span>
                          {sr.summary && <span className="text-[9px] text-muted-foreground mt-0.5">{sr.summary}</span>}
                        </div>
                      )}

                      {/* Structured Table component */}
                      {sr.resultType === 'table' && sr.tableData && sr.tableData.length > 0 && (
                        <div className="border border-border rounded-xl overflow-hidden bg-card max-w-full">
                          <div className="p-2 border-b border-border bg-muted/40 flex items-center gap-1.5">
                            <TableIcon className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-bold text-foreground">QueryResult Table</span>
                          </div>
                          <div className="overflow-x-auto max-h-60">
                            <table className="w-full text-[10px]">
                              <thead className="bg-muted/30 border-b border-border sticky top-0">
                                <tr>
                                  {Object.keys(sr.tableData[0]).map(h => (
                                    <th key={h} className="px-3 py-2 text-left font-bold text-muted-foreground capitalize">{h.replace(/_/g, ' ')}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {sr.tableData.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-muted/10">
                                    {Object.values(row).map((val: any, cIdx) => (
                                      <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-foreground">
                                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Structured chart block */}
                      {sr.resultType === 'chart' && sr.chartData && sr.chartData.length > 0 && sr.chartConfig && (
                        <div className="p-3 border border-border bg-card rounded-xl shadow-sm space-y-2">
                          <div className="flex items-center gap-1.5 pb-1 border-b border-border">
                            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-[10px] font-bold text-foreground">{sr.chartConfig.title}</span>
                          </div>

                          <div className="h-48 w-full text-[9px]">
                            <ResponsiveContainer width="100%" height="100%">
                              {sr.chartConfig.chartType === 'line' ? (
                                <LineChart data={sr.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                                  <XAxis dataKey={sr.chartConfig.xAxisKey} stroke="#888888" />
                                  <YAxis stroke="#888888" />
                                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                                  <Line type="monotone" dataKey={sr.chartConfig.yAxisKey} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                              ) : sr.chartConfig.chartType === 'pie' ? (
                                <PieChart>
                                  <Pie
                                    data={sr.chartData}
                                    dataKey={sr.chartConfig.yAxisKey}
                                    nameKey={sr.chartConfig.xAxisKey}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={65}
                                    label
                                  >
                                    {sr.chartData.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                                </PieChart>
                              ) : (
                                <BarChart data={sr.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                                  <XAxis dataKey={sr.chartConfig.xAxisKey} stroke="#888888" />
                                  <YAxis stroke="#888888" />
                                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                                  <Bar dataKey={sr.chartConfig.yAxisKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Truncation & Limit notifications */}
                      {sr.truncated && sr.infoMessage && (
                        <div className="p-2 border border-blue-500/20 bg-blue-500/5 text-blue-500 rounded-lg text-[9px] flex gap-1.5 items-center">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          <span>{sr.infoMessage}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loader Stage processing status */}
          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border bg-primary/10 border-primary/20 text-primary">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="p-3.5 bg-secondary/45 border border-border rounded-2xl text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>{loadingStage}</span>
              </div>
            </div>
          )}

          {/* Ambiguity Quick select pills */}
          {!loading && ambiguityOptions && (
            <div className="p-3 border border-indigo-500/20 bg-indigo-500/5 rounded-xl text-xs space-y-2 max-w-[85%] ml-11">
              <span className="font-bold text-indigo-500 block">Select the correct column to analyze:</span>
              <div className="flex flex-wrap gap-2">
                {ambiguityOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(`Analyze ${opt}`)}
                    className="px-3 py-1 bg-background hover:bg-secondary border border-indigo-500/35 text-indigo-500 text-[10px] font-bold rounded-lg transition"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom prompt input row */}
        <div className="p-4 border-t border-border bg-background/20 flex gap-2 items-center">
          <textarea
            placeholder="Type your question (e.g. what is the total revenue?)..."
            value={input}
            disabled={loading || isBlocked || isStale || isProcessing}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(input);
              }
            }}
            className="flex-1 min-h-[2.5rem] max-h-24 px-4 py-2 border border-border bg-background rounded-xl text-xs outline-none focus:border-primary resize-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage(input)}
            disabled={loading || !input.trim() || isBlocked || isStale || isProcessing}
            className="p-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl transition shadow-md disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default AIAnalyticsChat;