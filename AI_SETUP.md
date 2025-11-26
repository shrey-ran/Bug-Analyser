# 🤖 AI Analysis Setup Guide

## Overview
This bug tracking system uses **AI-powered analysis** to automatically analyze bug reports and provide:
- Root cause analysis
- Bug categorization
- Suggested solutions
- Expected vs. actual behavior comparison

## Supported AI Providers

The system supports **two AI providers** with automatic fallback:

### 1. **Google Gemini** (Recommended - Free tier available)
- **Model**: `gemini-pro`
- **Get API Key**: https://makersuite.google.com/app/apikey
- **Free Tier**: ✅ Yes (60 requests/minute)
- **Priority**: 🥇 First choice

### 2. **OpenAI** (Alternative)
- **Model**: `gpt-4o-mini`
- **Get API Key**: https://platform.openai.com/api-keys
- **Free Tier**: ❌ No (requires payment)
- **Priority**: 🥈 Second choice (if Gemini fails)

### 3. **Rule-Based Fallback** (No API key needed)
- Uses pattern matching and keyword analysis
- **Priority**: 🥉 Third choice (if both AI providers fail)

## Setup Instructions

### Step 1: Get an API Key

**Option A: Google Gemini (Free)**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

**Option B: OpenAI (Paid)**
1. Go to https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

### Step 2: Configure the Application

Open the `.env` file in the project root and add your API key:

```bash
# For Gemini (recommended)
GEMINI_API_KEY=AIzaSyBrpdHPFeMNYgmspRhYuQ6hWmZFTB14pYI

# OR for OpenAI
OPENAI_API_KEY=sk-your-actual-key-here
```

**Note**: You only need **ONE** API key. The system will use:
1. Gemini (if `GEMINI_API_KEY` is set)
2. OpenAI (if Gemini fails or `OPENAI_API_KEY` is set)
3. Rule-based analysis (if no API keys or both fail)

### Step 3: Restart Services

```bash
docker compose down
docker compose up -d
```

## Verify AI is Working

### Method 1: Check Logs
```bash
docker logs summarise-trainer-1 --tail 50
```

Look for:
- `[INFO] Processed inference request for report XXX` ✅
- `[WARNING] No AI API keys set` ⚠️ (means no API keys configured)

### Method 2: Submit a Test Bug Report
1. Go to http://localhost:3000/submit
2. Fill in the bug report form:
   - **Title**: Test crash on save button
   - **Description**: App crashes with white screen when clicking save
   - **Stack Trace**: 
     ```
     TypeError: Cannot read property 'data' of undefined
     at handleSave (App.js:42)
     ```
3. Submit and check the Review page
4. The AI analysis should appear within 5-10 seconds

### Expected AI Analysis Output:
- ✅ **Bug Category**: crash, null-reference, etc.
- ✅ **Root Cause**: Detailed explanation of WHY the bug occurs
- ✅ **Suggested Solution**: Specific code fixes
- ✅ **Model Info**: Shows which AI model was used (gemini-pro, gpt-4o-mini, or rule-based-analyzer)

## Troubleshooting

### Issue: "Using fallback rule-based analysis"
**Cause**: No valid API keys configured  
**Solution**: Add `GEMINI_API_KEY` or `OPENAI_API_KEY` to `.env` file and restart

### Issue: "Gemini API failed" or "OpenAI API error"
**Cause**: Invalid or expired API key  
**Solution**: 
1. Verify your API key is correct
2. Check if you have quota remaining
3. For OpenAI: Ensure billing is set up

### Issue: Analysis never completes
**Cause**: Trainer service not running or network issues  
**Solution**:
```bash
# Check trainer status
docker ps | grep trainer

# Check trainer logs
docker logs summarise-trainer-1

# Restart trainer
docker compose restart trainer
```

## Cost Considerations

### Google Gemini
- **Free Tier**: 60 requests/minute
- **Cost**: FREE for most use cases
- **Recommended for**: Development, small teams

### OpenAI GPT-4o-mini
- **Cost**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Example**: ~$0.001 per bug analysis (very cheap)
- **Recommended for**: Production, high-quality analysis

### Rule-Based Fallback
- **Cost**: FREE
- **Quality**: Basic pattern matching
- **Recommended for**: Testing without API keys

## Current Configuration Status

✅ **Your API keys are already configured!**

```
OPENAI_API_KEY=sk-proj-m1Qe79MEm1...  ✅ Set
GEMINI_API_KEY=AIzaSyBrpdHPFeMNY...   ✅ Set
```

The system will:
1. Try **Gemini** first (free, fast)
2. Fall back to **OpenAI** if Gemini fails
3. Use rule-based analysis as last resort

You're all set! 🚀

## Testing the AI

Try submitting different types of bugs to see AI analysis:

1. **Crash Bug**: "App crashes on button click" → Should detect `crash` category
2. **Network Error**: "API timeout on login" → Should detect `network-error` 
3. **Null Reference**: "Cannot read property of undefined" → Should detect `null-reference`
4. **UI Bug**: "Button not visible on mobile" → Should detect `ui-rendering`

The AI will provide detailed root cause analysis and specific solutions for each! 🎯
