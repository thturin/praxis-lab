import { ImageAnalysis } from '../vision/visionService';
import { calculateEmbeddingSimilarity } from './embeddingService';
import { generateFusionFeedback } from './feedbackService';

const FUSION_PASS_THRESHOLD = 0.5;

const IMAGE_FUSION_WEIGHTS = {
  primaryFunction:   0.325,
  identifiedPattern: 0.275,
  logicalFlow:       0.225,
  visualComponents:  0.175,
};

//=============SERIALIZATION HELPERS =============
// Element IDs (FF1, FF2) excluded — they pollute embeddings without semantic meaning

const serializeLogicalFlow = (a: ImageAnalysis): string =>
  `${a.logical_flow.process_type}: ${a.logical_flow.steps.map(s => s.action).join(' → ')}`;

const serializeVisualComponents = (a: ImageAnalysis): string =>
  a.visual_components.elements.map(e => `${e.type}: ${e.description}`).join('; ');

const serializeAnalyticalSummary = (a: ImageAnalysis): string =>
  `Primary function: ${a.analytical_summary.primary_function}\n` +
  `Pattern: ${a.analytical_summary.identified_pattern}`;

export const serializeImageAnalysis = (a: ImageAnalysis): string =>
  `${serializeAnalyticalSummary(a)}\n` +
  `Components: ${serializeVisualComponents(a)}\n` +
  `Process: ${serializeLogicalFlow(a)}`;

  //example output:
  // Primary function: 4-bit serial-in parallel-out shift register
  // Pattern: Linear feedback shift register with AND gate output enable
  // Components: Flip-flop: Stores a single bit of state; AND gate: Outputs HIGH only when all flip-flops are set
  // Process: Sequential: Data shifts through flip-flops on clock signal → Feedback loop from output to input with AND gate controlling output enable

//=============IMAGE ANALYSIS FUSION GRADING =============

export interface GradeImageAnalysisParams {
  studentAnalysis: ImageAnalysis;
  adminAnalysis: ImageAnalysis;
  question: string;
  timeoutMs?: number;
}

export interface GradeImageAnalysisResult {
  score: number;
  result: string;
  feedback: string;
}

export const gradeImageAnalysisWithFusion = async ({ studentAnalysis, adminAnalysis, question, timeoutMs = 20000 }: GradeImageAnalysisParams): Promise<GradeImageAnalysisResult> => {
  console.log('Grading image analysis with fusion. Student analysis:', studentAnalysis, 'Admin analysis:', adminAnalysis);
  const [primaryFunctionSim, identifiedPatternSim, logicalFlowSim, visualComponentsSim] = await Promise.all([
    calculateEmbeddingSimilarity(studentAnalysis.analytical_summary.primary_function, adminAnalysis.analytical_summary.primary_function),
    calculateEmbeddingSimilarity(studentAnalysis.analytical_summary.identified_pattern, adminAnalysis.analytical_summary.identified_pattern),
    calculateEmbeddingSimilarity(serializeLogicalFlow(studentAnalysis), serializeLogicalFlow(adminAnalysis)),
    calculateEmbeddingSimilarity(serializeVisualComponents(studentAnalysis), serializeVisualComponents(adminAnalysis)),
  ]);

  const fusedScore =
    IMAGE_FUSION_WEIGHTS.primaryFunction   * primaryFunctionSim +
    IMAGE_FUSION_WEIGHTS.identifiedPattern * identifiedPatternSim +
    IMAGE_FUSION_WEIGHTS.logicalFlow       * logicalFlowSim +
    IMAGE_FUSION_WEIGHTS.visualComponents  * visualComponentsSim;

  console.log('Image analysis fusion:', {
    primaryFunctionSim:   primaryFunctionSim.toFixed(3),
    identifiedPatternSim: identifiedPatternSim.toFixed(3),
    logicalFlowSim:       logicalFlowSim.toFixed(3),
    visualComponentsSim:  visualComponentsSim.toFixed(3),
    fusedScore:           fusedScore.toFixed(3),
  });

  const score = fusedScore >= FUSION_PASS_THRESHOLD ? 1 : 0;

  const feedback = await generateFusionFeedback({
    userAnswer: serializeImageAnalysis(studentAnalysis),
    answerKey: serializeImageAnalysis(adminAnalysis),
    question,
    fusedScore,
    timeoutMs,
  });

  return { score, result: score ? 'PASS' : 'FAIL', feedback };
};
