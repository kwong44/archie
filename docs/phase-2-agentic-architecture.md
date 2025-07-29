# Phase 2: Implementing Agentic Architecture

## Overview
Transitioning from a sequential pipeline to a dynamic, agentic system where specialized agents collaborate based on the journal entry's context and content.

**Primary User Stories:**
- "As a user, I want the AI to be able to infer emotional themes from my journal entries."
- "As a user, I want the AI to be able to infer life themes from my journal entries."
- "As a user, I want the AI to be able to infer cognitive distortions from my journal entries."


## Key Components

### 1. Router Agent
- **Purpose**: Analyze journal entry and determine which worker agents to invoke
- **Implementation**:
  - Fast, lightweight model (e.g., Gemini 1.5 Flash)
  - Outputs structured decision about which agents to call
  - Considers entry content, user history, and current principles/goals

### 2. Worker Agents
- **Emotional Analyst**
  - Implements Plutchik's Wheel of Emotions
  - Outputs primary and secondary emotions with intensity
  
- **Thematic Analyst**
  - Identifies and tracks themes over time
  - Uses vector embeddings for semantic similarity
  
- **CBT Identifier**
  - Detects cognitive distortions
  - Implements a comprehensive knowledge base of CBT patterns
  
- **CBT Reframer**
  - Provides constructive reframes for identified distortions
  - Uses empathetic, supportive language

## Dynamic Workflow
1. Entry received by Router Agent
2. Router determines relevant agents to call
3. Worker agents process in parallel where possible
4. Results are synthesized into coherent insights

## Technical Implementation
- **State Management**:
  - Context passing between agents
  - Session state for multi-turn interactions
  - Long-term memory integration

- **Error Handling**:
  - Graceful degradation when agents fail
  - Fallback mechanisms
  - Comprehensive logging

## Performance Considerations
- Parallel processing of independent analyses
- Caching frequent queries
- Model tiering for cost optimization
