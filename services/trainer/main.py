from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime
import json
import os
import httpx
import google.generativeai as genai

app = FastAPI(
    title="Multimodal Bug Summarizer - Trainer Service",
    description="AI-powered bug report summarization service",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class InferenceInput(BaseModel):
    description: Optional[str] = ""
    stacktrace_text: Optional[str] = ""
    env: Optional[Dict[str, Any]] = {}
    image_paths: Optional[List[str]] = []

class InferenceRequest(BaseModel):
    id: str
    input: InferenceInput

class SummaryResponse(BaseModel):
    environment: str
    actualBehavior: str
    expectedBehavior: str
    bugCategory: str
    rootCause: str
    suggestedSolution: str

class ModelInfo(BaseModel):
    name: str
    version: str

class InferenceResponse(BaseModel):
    id: str
    summary: SummaryResponse
    model: ModelInfo
    timestamp: str

@app.get("/")
def root():
    return {
        "service": "Multimodal Bug Summarizer - Trainer",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "trainer"
    }

@app.post("/inference", response_model=InferenceResponse)
async def inference(request: InferenceRequest):
    """
    Process a bug report and generate AI-powered summary using OpenAI API.
    Falls back to rule-based analysis if API key is not configured.
    """
    try:
        # Extract input data
        input_data = request.input
        description = input_data.description or ""
        stacktrace = input_data.stacktrace_text or ""
        env = input_data.env or {}
        
        # Generate environment summary
        environment_text = ""
        if env:
            env_parts = []
            if env.get('os'):
                env_parts.append(f"OS: {env['os']}")
            if env.get('browser'):
                browser_version = f" {env['browser']}"
                if env.get('browserVersion'):
                    browser_version += f" {env['browserVersion']}"
                env_parts.append(f"Browser:{browser_version}")
            environment_text = ", ".join(env_parts) if env_parts else "Environment not specified"
        else:
            environment_text = "No environment information provided"
        
        # Check if OpenAI API key is available
        openai_api_key = os.getenv("OPENAI_API_KEY")
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        # Try Gemini first, then OpenAI, then fallback to rules
        if gemini_api_key:
            # Use Gemini API for intelligent analysis
            try:
                summary = await analyze_with_gemini(description, stacktrace, environment_text, gemini_api_key)
                model_name = "gemini-2.0-flash"
            except Exception as e:
                print(f"[WARNING] Gemini API failed: {str(e)}, trying OpenAI...")
                if openai_api_key:
                    summary = await analyze_with_openai(description, stacktrace, environment_text, openai_api_key)
                    model_name = "gpt-4o-mini"
                else:
                    print("[WARNING] No OpenAI key, using fallback rule-based analysis.")
                    summary = analyze_with_rules(description, stacktrace, environment_text)
                    model_name = "rule-based-analyzer"
        elif openai_api_key:
            # Use OpenAI API for intelligent analysis
            summary = await analyze_with_openai(description, stacktrace, environment_text, openai_api_key)
            model_name = "gpt-4o-mini"
        else:
            # Fall back to rule-based analysis
            print("[WARNING] No AI API keys set. Using fallback rule-based analysis.")
            summary = analyze_with_rules(description, stacktrace, environment_text)
            model_name = "rule-based-analyzer"
        
        # Create response
        response = InferenceResponse(
            id=request.id,
            summary=summary,
            model=ModelInfo(
                name=model_name,
                version="1.0"
            ),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
        
        print(f"[INFO] Processed inference request for report {request.id} - Category: {summary.bugCategory}")
        
        return response
        
    except Exception as e:
        print(f"[ERROR] Failed to process inference request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process inference request: {str(e)}"
        )


async def analyze_with_openai(description: str, stacktrace: str, environment: str, api_key: str) -> SummaryResponse:
    """Use OpenAI API to analyze bug report and generate intelligent summary."""
    
    # Construct prompt for OpenAI
    prompt = f"""You are an expert software debugging assistant. Analyze this bug report and provide a structured summary with root cause analysis.

Bug Description:
{description}

Stack Trace:
{stacktrace}

Environment:
{environment}

Provide a JSON response with these exact fields:
- actualBehavior: What is actually happening (1-2 sentences)
- expectedBehavior: What should happen instead (1-2 sentences)
- bugCategory: One of [crash, null-reference, network-error, authentication, ui-rendering, performance, memory-leak, logic-error, validation-error, configuration-error]
- rootCause: Deep analysis of WHY this bug is happening. Look at error messages, stack traces, and patterns to identify the underlying cause. Be specific about which module/component/function is failing and why. (2-3 sentences)
- suggestedSolution: Specific, actionable steps to fix this bug based on the root cause (2-3 sentences with code examples if relevant)

Think like a developer debugging: trace the error back to its source, identify the failing component, and explain the mechanism of failure."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a bug analysis expert. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                }
            )
            
            if response.status_code != 200:
                print(f"[ERROR] OpenAI API error: {response.status_code} - {response.text}")
                raise Exception(f"OpenAI API returned {response.status_code}")
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            analysis = json.loads(content)
            
            return SummaryResponse(
                environment=environment,
                actualBehavior=analysis.get("actualBehavior", "Unable to determine"),
                expectedBehavior=analysis.get("expectedBehavior", "Unable to determine"),
                bugCategory=analysis.get("bugCategory", "unknown"),
                rootCause=analysis.get("rootCause", "Root cause analysis unavailable"),
                suggestedSolution=analysis.get("suggestedSolution", "Please review the error logs")
            )
            
    except Exception as e:
        print(f"[ERROR] OpenAI analysis failed: {str(e)}, falling back to rules")
        return analyze_with_rules(description, stacktrace, environment)


async def analyze_with_gemini(description: str, stacktrace: str, environment: str, api_key: str) -> SummaryResponse:
    """Use Google Gemini API to analyze bug report and generate intelligent summary."""
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Construct prompt for Gemini
    prompt = f"""You are an expert software debugging assistant. Analyze this bug report and provide a structured summary with root cause analysis.

Bug Description:
{description}

Stack Trace:
{stacktrace}

Environment:
{environment}

Provide a JSON response with these exact fields:
- actualBehavior: What is actually happening (1-2 sentences)
- expectedBehavior: What should happen instead (1-2 sentences)
- bugCategory: One of [crash, null-reference, network-error, authentication, ui-rendering, performance, memory-leak, logic-error, validation-error, configuration-error, server-error, routing-error]
- rootCause: Deep analysis of WHY this bug is happening. Examine error messages, stack traces, and patterns to identify the underlying cause. Be specific about which module/component/function is failing and explain the mechanism of failure. Consider: null pointers, race conditions, unhandled exceptions, incorrect state, API failures, configuration issues, etc. (2-3 sentences)
- suggestedSolution: Specific, actionable steps to fix this bug based on the root cause (2-3 sentences with code examples if relevant)

Think like a senior developer debugging: trace the error back to its source, identify the failing component, explain WHY it's failing, and provide targeted solutions. Respond ONLY with valid JSON, no markdown formatting."""

    try:
        # Use Gemini 2.0 Flash model (latest stable version)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate response
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                top_p=0.95,
                top_k=40,
                max_output_tokens=1024,
            )
        )
        
        # Parse JSON response
        content = response.text.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        analysis = json.loads(content)
        
        return SummaryResponse(
            environment=environment,
            actualBehavior=analysis.get("actualBehavior", "Unable to determine"),
            expectedBehavior=analysis.get("expectedBehavior", "Unable to determine"),
            bugCategory=analysis.get("bugCategory", "unknown"),
            rootCause=analysis.get("rootCause", "Root cause analysis unavailable"),
            suggestedSolution=analysis.get("suggestedSolution", "Please review the error logs")
        )
        
    except Exception as e:
        print(f"[ERROR] Gemini analysis failed: {str(e)}")
        raise e


def analyze_with_rules(description: str, stacktrace: str, environment: str) -> SummaryResponse:
    """Fallback rule-based analysis when AI API is not available."""
    
    text = f"{description} {stacktrace}".lower()
    
    bug_category = "unknown"
    actual_behavior = "Application exhibits unexpected behavior"
    expected_behavior = "Application should function normally"
    root_cause = "Unable to determine root cause from available information"
    suggested_solution = "Please review the error logs and stack trace for more details"
    
    # Pattern matching for bug categorization and solutions
    if "500" in text or "internal server error" in text:
        bug_category = "server-error"
        actual_behavior = "Server returns 500 Internal Server Error"
        expected_behavior = "Server should handle requests without errors"
        root_cause = "Server-side exception thrown during request processing. Likely caused by unhandled error in backend code, database connection failure, or misconfigured middleware."
        if "upload" in text or "entity too large" in text or "file" in text:
            root_cause = "File upload exceeds server-configured maximum size limit. The server's request body size limit is smaller than the uploaded file."
            suggested_solution = "Increase server file upload limit. In Express: use multer with limits: { fileSize: 10 * 1024 * 1024 }. In nginx: set client_max_body_size 10M; Add proper validation and user-friendly error messages for file size limits."
        else:
            suggested_solution = "Check server logs for the root cause. Add proper error handling and logging. Implement graceful error responses with meaningful messages. Review recent code changes that might have introduced the error."
    
    elif "404" in text or "not found" in text:
        bug_category = "routing-error"
        actual_behavior = "Resource or route not found (404 error)"
        expected_behavior = "All routes should be properly configured"
        root_cause = "Requested route or API endpoint is not registered in the router configuration. Could be caused by typo in URL, missing route definition, or incorrect base path."
        suggested_solution = "Verify route definitions in your router configuration. Check for typos in URLs. Ensure API endpoints are correctly registered. For SPAs, configure server to redirect all routes to index.html."
    
    elif "crash" in text or "white screen" in text or "blank screen" in text:
        bug_category = "crash"
        actual_behavior = "Application crashes or displays blank/white screen"
        expected_behavior = "Application should remain stable and display content"
        
        if "save" in text or "button" in text:
            root_cause = "Null or undefined object accessed during save operation. Likely caused by form data not being properly validated or state being accessed before initialization."
            suggested_solution = "Add null checks: `if (data && data.property)` before accessing. Use optional chaining: `data?.property`. Add error boundaries: wrap components with try-catch. Verify form data is properly validated before saving."
        elif "undefined" in text or "null" in text or "cannot read property" in text:
            root_cause = "Attempting to access property on null or undefined object. This happens when component renders before data is loaded, or when an object is not properly initialized in state."
            suggested_solution = "Fix null/undefined reference. Add defensive checks: `const value = object?.property ?? defaultValue`. Ensure all required data is loaded before component renders. Use PropTypes or TypeScript for type checking."
        else:
            root_cause = "Unhandled exception thrown in component rendering or event handler. Could be caused by type mismatch, missing dependency, or logic error in recent code changes."
            suggested_solution = "Add React Error Boundaries to catch crashes. Check browser console for detailed stack trace. Review recent code changes. Add logging to identify the crash point. Ensure all async operations have error handling."
    
    elif "cannot read property" in text or "undefined" in text or "typeerror" in text:
        bug_category = "null-reference"
        actual_behavior = "Attempting to access property of null or undefined object"
        expected_behavior = "All objects should be properly initialized before use"
        root_cause = "Object is null or undefined when property access is attempted. This occurs when data hasn't loaded yet, API response is missing expected fields, or component state is accessed before initialization."
        suggested_solution = "Add null/undefined checks: `if (obj && obj.property)`. Use optional chaining: `obj?.property`. Provide default values: `const value = obj?.property || defaultValue`. Check that API data is loaded before rendering."
    
    elif "network" in text or "fetch" in text or "api" in text or "timeout" in text or "cors" in text:
        bug_category = "network-error"
        actual_behavior = "Network request fails or times out"
        expected_behavior = "API calls should complete successfully"
        if "cors" in text:
            root_cause = "CORS (Cross-Origin Resource Sharing) policy blocking request from different origin. Server doesn't have proper CORS headers configured to allow requests from the frontend domain."
        else:
            root_cause = "Network request failed due to connectivity issues, server timeout, or incorrect API endpoint URL. Could be caused by server being down, slow network, or malformed request."
        suggested_solution = "Implement retry logic: `axios.get(url).catch(() => retry())`. Add timeout handling. For CORS: configure server with proper headers: `Access-Control-Allow-Origin`. Check network connectivity and API endpoint availability."
    
    elif "login" in text or "auth" in text or "authentication" in text or "oauth" in text:
        bug_category = "authentication"
        actual_behavior = "Authentication or login process fails"
        expected_behavior = "Users should be able to authenticate successfully"
        root_cause = "Authentication failure caused by invalid credentials, expired tokens, misconfigured OAuth settings, or CORS issues preventing auth cookies from being set. Check token storage and validation logic."
        suggested_solution = "Verify OAuth credentials and callback URLs. Check token expiration: implement token refresh logic. Ensure secure cookie/session configuration. Review CORS settings for auth endpoints. Check network requests in DevTools."
    
    elif "ui" in text or "display" in text or "layout" in text or "css" in text or "rendering" in text:
        bug_category = "ui-rendering"
        actual_behavior = "UI elements are not displayed or positioned correctly"
        expected_behavior = "UI should render properly across all screen sizes"
        root_cause = "CSS specificity conflict, z-index layering issue, or missing responsive breakpoints causing incorrect rendering. Could also be caused by JavaScript modifying DOM incorrectly."
        suggested_solution = "Inspect element with browser DevTools. Check for CSS specificity conflicts. Verify z-index layering. Test responsive breakpoints. Clear browser cache. Check for CSS syntax errors in stylesheet."
    
    elif "performance" in text or "slow" in text or "lag" in text:
        bug_category = "performance"
        actual_behavior = "Application responds slowly or exhibits lag"
        expected_behavior = "Application should respond quickly to user interactions"
        root_cause = "Performance bottleneck caused by excessive re-renders, large bundle size, unoptimized images, or inefficient algorithms. Could also be caused by memory leaks or blocking operations on main thread."
        suggested_solution = "Profile application performance using browser DevTools. Optimize rendering by memoizing components. Implement code splitting and lazy loading. Reduce bundle size and minimize re-renders."
    
    elif "memory" in text or "leak" in text:
        bug_category = "memory-leak"
        actual_behavior = "Memory usage increases over time"
        expected_behavior = "Memory usage should remain stable"
        root_cause = "Memory leak caused by event listeners not being cleaned up, intervals/timeouts not being cleared on unmount, or circular references preventing garbage collection."
        suggested_solution = "Remove event listeners in cleanup functions. Clear intervals/timeouts when components unmount. Avoid circular references. Use browser memory profiler to identify leaks."
    
    # Extract actual behavior from description if present
    if "actual:" in text or "observed:" in text:
        lines = text.split('\n')
        for line in lines:
            if "actual:" in line.lower():
                actual_behavior = line.split('actual:')[1].strip()[:200]
                break
    
    # Extract expected behavior from description if present
    if "expected:" in text or "should:" in text:
        lines = text.split('\n')
        for line in lines:
            if "expected:" in line.lower():
                expected_behavior = line.split('expected:')[1].strip()[:200]
                break
    
    # Generate summary
    return SummaryResponse(
        environment=environment,
        actualBehavior=actual_behavior,
        expectedBehavior=expected_behavior,
        bugCategory=bug_category,
        rootCause=root_cause,
        suggestedSolution=suggested_solution
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
