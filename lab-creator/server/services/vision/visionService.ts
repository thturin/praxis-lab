import axios from 'axios';
const { callLLM } = require('../llm/llmClient');

interface VisionResult {
  text: string;
}

// Step 1 output — faithful recognition of what's in the image (gemini analysis)
interface ImageAnalysis {
  text_extraction: string;
  diagram_type: string; // 'circuit' | 'block_program' | 'flowchart' | 'state_diagram' | 'other'
  elements: Array<{
    type: string;   // normalized functional type (e.g. D_flip_flop, NAND_gate, event_trigger)
    label: string;  // label as it appears in the image
    role: string;   // input | output | storage | logic | control | action | event
  }>;
  connections: Array<{
    from: string;        // element label or signal name
    to: string;          // element label or signal name
    relationship: string; // drives | triggers | feeds | inverts | enables | connects_to
  }>;
}

// Final output — used for grading comparison
export interface TopologyAnalysis {
  text_extraction: string;
  topology_fingerprint: string[];
  analytical_summary: {
    primary_function: string;
    identified_pattern: string;
  };
}

/**
 * Extract text from an image using a vision LLM via OpenRouter.
 * Use for handwritten work, code screenshots, or any image where only text is needed.
 */
export async function extractImage(base64Data: string, mimeType: string): Promise<VisionResult> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) throw new Error('OPEN_ROUTER_API_KEY is not configured');

  const prompt = `Extract and transcribe all text from this image exactly as written. Return only the transcribed text, nothing else.`;

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const text = response.data?.choices?.[0]?.message?.content || '';
  return { text };
}

/**
 * Step 1 — Vision model recognizes elements and connections from the image.
 * Produces a faithful intermediate representation without semantic normalization.
 */
async function analyzeImageStructure(base64Data: string, mimeType: string): Promise<ImageAnalysis> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) throw new Error('OPEN_ROUTER_API_KEY is not configured');

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      //model: 'google/gemini-2.0-flash-lite-001',
      //model: 'google/gemini-2.5-pro',  // reasoning mode — does not emit tool_calls
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Identify all components/blocks and their connections in this diagram.

Normalize any IC part numbers or brand-specific labels to their functional type (e.g. 74HC00 → NAND_gate, 7474 → D_flip_flop, "when green flag clicked" → event_trigger).

General rules for connections:
- Never create a self-referential connection — from and to must be different elements or pins.
- Every signal source that enters the diagram from outside (clock, input pin, event trigger, sensor) must appear as a separate element with role "input".
- Record each distinct signal path as its own connection entry.

For connections, be specific enough to reveal the topology:
- Circuits: use pin-level references. For each flip-flop trace its clock pin and data pin separately. A ripple counter has FF1.Q_inv → FF2.clk (inverted Q drives the next FF's clock); a shift register has FF1.Q → FF2.D (Q drives the next FF's data input). A synchronous design has the external CLK driving every FF's clk pin individually (CLK → FF1.clk, CLK → FF2.clk, etc.).
- Block programs: use block outputs or branches (forever_loop.body → move_steps, if_block.true_branch → play_sound).
- Flowcharts: use decision branch labels (decision.yes → action1, decision.no → action2).`
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Data}` },
            },
          ],
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_structure',
            description: 'Return the elements and connections found in the diagram',
            parameters: {
              type: 'object',
              properties: {
                text_extraction: {
                  type: 'string',
                  description: 'All raw text found in the image, transcribed verbatim'
                },
                diagram_type: {
                  type: 'string',
                  description: 'One of: circuit, block_program, flowchart, state_diagram, other'
                },
                elements: {
                  type: 'array',
                  description: 'Each component or block in the diagram. Use normalized functional types — convert IC part numbers and brand labels to their function.',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', description: 'Normalized functional type (e.g. D_flip_flop, NAND_gate, event_trigger, forever_loop, move_steps)' },
                      label: { type: 'string', description: 'Label as it appears in the image' },
                      role: { type: 'string', description: 'One of: input, output, storage, logic, control, action, event' }
                    },
                    required: ['type', 'label', 'role']
                  }
                },
                connections: {
                  type: 'array',
                  description: 'Signal or control flow connections. Be specific enough to reveal topology. For circuits use pin-level references (FF1.Q_inv → FF2.clk). For block programs use block outputs or branches (if_block.true_branch, forever_loop.body). For flowcharts use decision branch labels (decision.yes, decision.no).',
                  items: {
                    type: 'object',
                    properties: {
                      from: { type: 'string', description: 'Source with specificity — circuit: FF1.Q_inv, FF1.Q, CLK; block program: forever_loop.body, if_block.true_branch; flowchart: decision.yes' },
                      to: { type: 'string', description: 'Destination with specificity — circuit: FF2.clk, FF2.D, LED.input; block program: move_steps.trigger; flowchart: action_block' },
                      relationship: { type: 'string', description: 'One of: drives, triggers, feeds, inverts, enables, connects_to' }
                    },
                    required: ['from', 'to', 'relationship']
                  }
                }
              },
              required: ['text_extraction', 'diagram_type', 'elements', 'connections']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_structure' } },
      max_tokens: 2000,
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    }
  );

  const message = response.data?.choices?.[0]?.message;
  const raw = message?.tool_calls?.[0]?.function?.arguments|| message?.content|| '';
  return JSON.parse(raw) as ImageAnalysis;
}

interface TopologyResult {
  topology_fingerprint: string[];
  analytical_summary: {
    primary_function: string;
    identified_pattern: string;
  };
}

/**
 * Step 2 — Text model generates topology fingerprint from the intermediate structure.
 * Normalizes component identity, abstracts to relational semantics.
 */
async function createTopology(intermediate: ImageAnalysis): Promise<TopologyResult> {
  const structureJson = JSON.stringify(intermediate, null, 2);

  const raw = await callLLM({
    messages: [
      {
        role: 'system',
        content: `You are a diagram analysis expert. Given a structured description of a diagram, generate a topology fingerprint — a list of strings that describe relational connections.

Rules for fingerprint strings:
- Use snake_case
- Use active verbs: drives, triggers, feeds, inverts, enables, connects_to
- Use normalized functional types only — drop all student-assigned IDs and labels (IC1, U1, G1, FF1 → use functional position like first_dff, second_nand_gate)
- Flow direction is always source → destination
- The final string must describe the overall topology pattern

Examples (circuit):
- "2Hz_clock_drives_first_dff"
- "first_dff_inverted_Q_triggers_second_dff_clock"
- "logic_topology_is_asynchronous_4bit_ripple_counter"

Examples (block program):
- "green_flag_event_triggers_forever_loop"
- "forever_loop_drives_move_10_steps"
- "forever_loop_drives_edge_bounce_check"
- "logic_topology_is_event_driven_continuous_motion_script"`
      },
      {
        role: 'user',
        content: `Generate the topology fingerprint for this diagram:\n\n${structureJson}`
      }
    ],
    temperature: 0.1,
    maxTokens: 1000,
    tools: [
      {
        type: 'function',
        function: {
          name: 'generate_fingerprint',
          description: 'Return the topology fingerprint and analytical summary',
          parameters: {
            type: 'object',
            properties: {
              topology_fingerprint: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of snake_case relational strings describing signal/control flow. Final entry must describe the overall topology pattern.'
              },
              analytical_summary: {
                type: 'object',
                properties: {
                  primary_function: { type: 'string', description: 'What this diagram does overall, in plain English' },
                  identified_pattern: { type: 'string', description: 'Design pattern or structure recognized (e.g. ripple counter, event-driven script, Moore state machine)' }
                },
                required: ['primary_function', 'identified_pattern']
              }
            },
            required: ['topology_fingerprint', 'analytical_summary']
          }
        }
      }
    ]
  });

  return JSON.parse(raw);
}

/**
 * Analyze an image using a two-step prompt chain:
 * 1. Vision model (Gemini) — recognizes elements and connections
 * 2. Text model (DeepSeek) — generates topology fingerprint and analytical summary
 *
 * Used for grading image-analysis type questions.
 */
export async function analyzeImage(base64Data: string, mimeType: string): Promise<TopologyAnalysis> {
  let intermediate;
  try{
     intermediate = await analyzeImageStructure(base64Data, mimeType);
     console.log('+++++++++++++++++++++++++++++++++++++++++Image structure analysis result+++++++++++++++++++++++++++++++++++++++\n', intermediate);
  }catch(err){
    console.error('Error in analyzeImageStructure:', err.response?.data || err.message);
    throw new Error('Failed to analyze image structure');
  }
  let topologyResult;
  try{
    topologyResult= await createTopology(intermediate);
    console.log('+++++++++++++++++++++++++++++++++++++++++Topology analysis result+++++++++++++++++++++++++++++++++++++++\n', topologyResult);
  }catch(err){
    console.error('Error in createTopology:', err.response?.data || err.message);
    throw new Error('Failed to create topology from image analysis');
  }
  
  const { topology_fingerprint, analytical_summary } = topologyResult;

  return {
    text_extraction: intermediate.text_extraction,
    topology_fingerprint,
    analytical_summary,
  };
}
