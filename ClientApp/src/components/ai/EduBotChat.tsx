import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Button,
  Chip,
  Avatar,
  Slide,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

interface JobDto {
  id: string;
  title: string;
  companyName: string;
  location: string;
  minSalary?: number;
  maxSalary?: number;
  boardAffiliation?: string;
  subjectDepartment?: string;
  workMode?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'edubot';
  content: string;
  isOffTopic?: boolean;
  suggestedPrompts?: string[];
  matchingJobs?: JobDto[];
  timestamp: string;
}

const STARTER_PROMPTS = [
  '🔍 Find PGT / TGT Teaching Jobs',
  '🚀 Transition to Instructional Design',
  '📚 CTET & B.Ed Certification Guide',
  '🏫 How Recruiters Find Profiles',
  '💡 Demo Class Interview Tips',
  '💻 STEM & Robotics Trainer Roles',
];

const INITIAL_GREETING: ChatMessage = {
  id: 'greeting',
  sender: 'edubot',
  content: `Hello! I am **EduBot**, your dedicated AI Career & Education Assistant on **Edukey360**! 🎓

I specialize exclusively in the **Education & EduTech ecosystem**:
- 🎯 **Teaching Positions** (PGT, TGT, PRT, Professors, Coordinators)
- 🚀 **EduTech Roles** (Instructional Designers, Curriculum Specialists, Academic Counselors, LMS Admins)
- 📚 **Skills & Certifications** (CTET, B.Ed, NET, NEP 2020 integration, LMS mastery)
- 🏫 **Recruiter Tools** (Resdex candidate search, AI matching, posting jobs)

How can I assist your educational journey today? Choose a starter prompt below or ask your own question!`,
  suggestedPrompts: [
    'Explore CBSE Mathematics Jobs',
    'Instructional Designer skills roadmap',
    'How do schools search resumes on Resdex?',
    'What are the key requirements for CBSE teachers?',
  ],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

// Formats basic markdown elements: headers, bold, italics, bullet points, numbered lists, links
const RenderMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <Box sx={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <Box key={idx} sx={{ height: 6 }} />;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <Typography
              key={idx}
              variant="subtitle2"
              sx={{ fontWeight: 700, color: '#1e293b', mt: 1, mb: 0.5, fontSize: '0.98rem' }}
            >
              {formatInline(trimmed.replace('### ', ''))}
            </Typography>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <Typography
              key={idx}
              variant="subtitle1"
              sx={{ fontWeight: 700, color: '#0f172a', mt: 1.2, mb: 0.5 }}
            >
              {formatInline(trimmed.replace('## ', ''))}
            </Typography>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <Box
              key={idx}
              sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.4, pl: 0.5 }}
            >
              <Box
                component="span"
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: '#2563eb',
                  mt: '9px',
                  mr: 1,
                  flexShrink: 0,
                }}
              />
              <Box component="span" sx={{ color: '#334155' }}>
                {formatInline(trimmed.substring(2))}
              </Box>
            </Box>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <Box
              key={idx}
              sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.4, pl: 0.5 }}
            >
              <Typography
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#2563eb',
                  mr: 1,
                  flexShrink: 0,
                  minWidth: 18,
                }}
              >
                {numMatch[1]}.
              </Typography>
              <Box component="span" sx={{ color: '#334155' }}>
                {formatInline(numMatch[2])}
              </Box>
            </Box>
          );
        }

        return (
          <Typography key={idx} sx={{ mb: 0.3, color: '#334155', fontSize: '0.92rem' }}>
            {formatInline(trimmed)}
          </Typography>
        );
      })}
    </Box>
  );
};

// Inline parser for bold, italics, code, links
function formatInline(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      parts.push(content.substring(lastIdx, match.index));
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 600, color: '#0f172a' }}>
          {matchedStr.slice(2, -2)}
        </strong>
      );
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      parts.push(<em key={match.index}>{matchedStr.slice(1, -1)}</em>);
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            backgroundColor: '#f1f5f9',
            padding: '2px 4px',
            borderRadius: 4,
            fontSize: '0.85em',
            fontFamily: 'monospace',
          }}
        >
          {matchedStr.slice(1, -1)}
        </code>
      );
    } else if (matchedStr.startsWith('[') && matchedStr.includes('](')) {
      const label = matchedStr.substring(1, matchedStr.indexOf(']('));
      const url = matchedStr.substring(matchedStr.indexOf('](') + 2, matchedStr.length - 1);
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'underline' }}
        >
          {label}
        </a>
      );
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < content.length) {
    parts.push(content.substring(lastIdx));
  }

  return parts;
}

export default function EduBotChat() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputValue).trim();
    if (!message || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      // Build history
      const history = messages
        .filter((m) => m.id !== 'greeting')
        .slice(-6)
        .map((m) => ({
          sender: m.sender,
          content: m.content,
        }));

      const res = await api.post('/edubot/chat', {
        message,
        history,
      });

      const data = res.data;
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'edubot',
        content: data.response || 'I am happy to assist you with EduTech careers and teaching jobs!',
        isOffTopic: data.isOffTopic,
        suggestedPrompts: data.suggestedPrompts || [],
        matchingJobs: data.matchingJobs || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'edubot',
        content:
          'I apologize, but I encountered a momentary connection issue. Please feel free to rephrase your query or select one of the suggested education topics below!',
        suggestedPrompts: [
          'Find PGT / TGT Teaching Jobs',
          'Instructional Design Career Path',
          'CTET & B.Ed certification tips',
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_GREETING]);
  };

  const handleJobCardClick = (job: JobDto) => {
    setIsOpen(false);
    navigate(`/jobs?search=${encodeURIComponent(job.title || '')}`);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 20, sm: 28 },
            right: { xs: 16, sm: 28 },
            zIndex: 1400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 1,
          }}
        >
          {/* Subtle Attention Badge */}
          <Paper
            elevation={3}
            sx={{
              px: 1.5,
              py: 0.6,
              borderRadius: 5,
              bgcolor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
              },
            }}
            onClick={() => setIsOpen(true)}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#10b981',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.4, transform: 'scale(1.3)' },
                  '100%': { opacity: 1, transform: 'scale(1)' },
                },
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 0.3 }}>
              Ask EduBot 🎓
            </Typography>
          </Paper>

          {/* Main FAB Launcher */}
          <Tooltip title="Chat with EduBot (EduTech & Career Assist)" placement="left" arrow>
            <IconButton
              onClick={() => setIsOpen(true)}
              aria-label="Open EduBot Chat"
              sx={{
                width: { xs: 56, sm: 62 },
                height: { xs: 56, sm: 62 },
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)',
                color: '#ffffff',
                boxShadow: '0 12px 28px rgba(37, 99, 235, 0.45)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.08) rotate(-4deg)',
                  boxShadow: '0 16px 36px rgba(37, 99, 235, 0.6)',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                },
              }}
            >
              <SmartToyIcon sx={{ fontSize: { xs: 30, sm: 34 } }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
          <Paper
            elevation={12}
            sx={{
              position: 'fixed',
              bottom: { xs: 12, sm: 24 },
              right: { xs: 12, sm: 24 },
              width: { xs: 'calc(100vw - 24px)', sm: 420 },
              height: { xs: '84vh', sm: 640 },
              maxHeight: 'calc(100vh - 40px)',
              borderRadius: 3.5,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1500,
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              bgcolor: '#ffffff',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 70%, #1e3a8a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    bgcolor: '#2563eb',
                    color: '#ffffff',
                    width: 44,
                    height: 44,
                    boxShadow: '0 0 16px rgba(37, 99, 235, 0.5)',
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 26 }} />
                </Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
                      EduBot AI
                    </Typography>
                    <Chip
                      label="EduTech 360"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(59, 130, 246, 0.25)',
                        color: '#93c5fd',
                        border: '1px solid rgba(147, 197, 253, 0.3)',
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: '#10b981',
                        display: 'inline-block',
                      }}
                    />
                    Education, Jobs & Career Advisor
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Reset Chat" arrow>
                  <IconButton
                    size="small"
                    onClick={handleClearChat}
                    sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                  >
                    <DeleteSweepIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close" arrow>
                  <IconButton
                    size="small"
                    onClick={() => setIsOpen(false)}
                    sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Scope / Guardrail Notice Banner */}
            <Box
              sx={{
                px: 2,
                py: 0.8,
                bgcolor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 16, color: '#2563eb', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.74rem' }}>
                EduBot is specialized for <strong>Schools, Colleges, EduTech Careers & Hiring</strong>. Non-education queries are politely declined.
              </Typography>
            </Box>

            {/* Messages Scroll Area */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                bgcolor: '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'flex-start',
                      maxWidth: msg.sender === 'user' ? '86%' : '94%',
                      flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    {msg.sender === 'edubot' && (
                      <Avatar
                        sx={{
                          width: 30,
                          height: 30,
                          bgcolor: '#2563eb',
                          color: '#ffffff',
                          flexShrink: 0,
                          mt: 0.5,
                        }}
                      >
                        <SmartToyIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Message Bubble */}
                      <Paper
                        elevation={msg.sender === 'user' ? 2 : 1}
                        sx={{
                          p: 1.8,
                          borderRadius:
                            msg.sender === 'user'
                              ? '18px 18px 4px 18px'
                              : '4px 18px 18px 18px',
                          bgcolor: msg.sender === 'user' ? '#2563eb' : '#ffffff',
                          color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                          border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                          wordBreak: 'break-word',
                        }}
                      >
                        {/* Off-Topic Warning Alert */}
                        {msg.isOffTopic && (
                          <Box
                            sx={{
                              mb: 1.2,
                              p: 1,
                              borderRadius: 1.5,
                              bgcolor: '#fef3c7',
                              border: '1px solid #fde68a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.8,
                            }}
                          >
                            <AutoAwesomeIcon sx={{ fontSize: 16, color: '#b45309' }} />
                            <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600 }}>
                              EduTech Domain Guardrail Notice
                            </Typography>
                          </Box>
                        )}

                        {msg.sender === 'user' ? (
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </Typography>
                        ) : (
                          <RenderMarkdown text={msg.content} />
                        )}
                      </Paper>

                      {/* Matching Jobs Cards Carousel/Grid */}
                      {msg.matchingJobs && msg.matchingJobs.length > 0 && (
                        <Box sx={{ mt: 1.5, width: '100%' }}>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: '#475569', mb: 1, display: 'block' }}
                          >
                            🎯 Matching Positions on Edukey360:
                          </Typography>
                          <Stack spacing={1}>
                            {msg.matchingJobs.map((job) => (
                              <Card
                                key={job.id}
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  border: '1px solid #cbd5e1',
                                  bgcolor: '#ffffff',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    borderColor: '#2563eb',
                                    boxShadow: '0 4px 12px rgba(37,99,235,0.1)',
                                    transform: 'translateY(-1px)',
                                  },
                                }}
                              >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}
                                  >
                                    {job.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                    {job.companyName}
                                  </Typography>

                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                    {job.location && (
                                      <Chip
                                        icon={<LocationOnIcon sx={{ fontSize: '13px !important' }} />}
                                        label={job.location}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                    )}
                                    {job.boardAffiliation && (
                                      <Chip
                                        label={job.boardAffiliation}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                    )}
                                    {job.workMode && (
                                      <Chip
                                        label={job.workMode}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#f1f5f9' }}
                                      />
                                    )}
                                  </Box>

                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      pt: 0.5,
                                      borderTop: '1px dashed #e2e8f0',
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{ fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center' }}
                                    >
                                      <CurrencyRupeeIcon sx={{ fontSize: 13 }} />
                                      {job.minSalary && job.maxSalary
                                        ? `${(job.minSalary / 100000).toFixed(1)} - ${(job.maxSalary / 100000).toFixed(1)} LPA`
                                        : 'Competitive'}
                                    </Typography>

                                    <Button
                                      size="small"
                                      variant="contained"
                                      endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                                      onClick={() => handleJobCardClick(job)}
                                      sx={{
                                        fontSize: '0.72rem',
                                        py: 0.3,
                                        px: 1,
                                        textTransform: 'none',
                                        borderRadius: 1.5,
                                        bgcolor: '#2563eb',
                                      }}
                                    >
                                      View Opening
                                    </Button>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Suggested Follow-up Prompts */}
                      {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.6, maxWidth: '100%' }}>
                          {msg.suggestedPrompts.map((prompt, pIdx) => (
                            <Chip
                              key={pIdx}
                              label={prompt}
                              size="small"
                              onClick={() => handleSendMessage(prompt)}
                              disabled={isLoading}
                              sx={{
                                fontSize: '0.74rem',
                                bgcolor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  bgcolor: '#eff6ff',
                                  borderColor: '#3b82f6',
                                  color: '#1d4ed8',
                                },
                              }}
                            />
                          ))}
                        </Box>
                      )}

                      <Typography
                        variant="caption"
                        sx={{
                          mt: 0.4,
                          fontSize: '0.68rem',
                          color: '#94a3b8',
                          alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {msg.timestamp}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}

              {/* Typing / Loading indicator */}
              {isLoading && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: '#2563eb',
                      color: '#ffffff',
                    }}
                  >
                    <SmartToyIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                  <Paper
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: '4px 18px 18px 18px',
                      bgcolor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CircularProgress size={14} thickness={5} sx={{ color: '#2563eb' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                      EduBot is preparing insights...
                    </Typography>
                  </Paper>
                </Box>
              )}

              <div ref={messagesEndRef} />
            </Box>

            {/* Starter Prompts Bar (when only initial message exists) */}
            {messages.length === 1 && (
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', mb: 0.5, display: 'block' }}>
                  💡 Popular Inquiries:
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.6,
                    overflowX: 'auto',
                    pb: 0.5,
                    '::-webkit-scrollbar': { height: 4 },
                    '::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 4 },
                  }}
                >
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <Chip
                      key={idx}
                      label={prompt}
                      size="small"
                      onClick={() => handleSendMessage(prompt)}
                      sx={{
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          bgcolor: '#eff6ff',
                          borderColor: '#3b82f6',
                          color: '#1d4ed8',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Input Footer */}
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              sx={{
                p: 1.5,
                bgcolor: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Ask about teaching jobs, CTET, EdTech roles..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    fontSize: '0.88rem',
                    bgcolor: '#f8fafc',
                    '& fieldset': { borderColor: '#cbd5e1' },
                    '&:hover fieldset': { borderColor: '#94a3b8' },
                    '&.Mui-focused fieldset': { borderColor: '#2563eb' },
                  },
                }}
              />
              <IconButton
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                sx={{
                  bgcolor: '#2563eb',
                  color: '#ffffff',
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  flexShrink: 0,
                  '&:hover': {
                    bgcolor: '#1d4ed8',
                  },
                  '&.Mui-disabled': {
                    bgcolor: '#e2e8f0',
                    color: '#94a3b8',
                  },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        </Slide>
      )}
    </>
  );
}
