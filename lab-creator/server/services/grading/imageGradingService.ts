import { ImageAnalysis } from '../vision/visionService';
import { calculateEmbeddingSimilarity } from './embeddingService';
import { evaluateWithLLM } from './textGradingService';

const FUSION_PASS_THRESHOLD = 0.5;
const LGE_WEIGHT = 0.35;

const IMAGE_FUSION_WEIGHTS = {
  primaryFunction:   0.30,
  identifiedPattern: 0.25,
  logicalFlow:       0.20,
  visualComponents:  0.15,
  anomalies:         0.10,
};

//=============SERIALIZATION HELPERS =============
// Element IDs (FF1, FF2) excluded — they pollute embeddings without semantic meaning

const serializeLogicalFlow = (a: ImageAnalysis): string =>
  `${a.logical_flow.process_type}: ${a.logical_flow.steps.map(s => s.action).join(' → ')}`;

const serializeVisualComponents = (a: ImageAnalysis): string =>
  a.visual_components.elements.map(e => `${e.type}: ${e.description}`).join('; ');

const serializeAnalyticalSummary = (a: ImageAnalysis): string =>
  `Primary function: ${a.analytical_summary.primary_function}\n` +
  `Pattern: ${a.analytical_summary.identified_pattern}\n` +
  `Anomalies: ${a.analytical_summary.noted_anomalies_or_constraints.join(', ')}`;

export const serializeImageAnalysis = (a: ImageAnalysis): string =>
  `${serializeAnalyticalSummary(a)}\n` +
  `Components: ${serializeVisualComponents(a)}\n` +
  `Process: ${serializeLogicalFlow(a)}`;

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

  const [primaryFunctionSim, identifiedPatternSim, logicalFlowSim, visualComponentsSim, anomaliesSim] = await Promise.all([
    calculateEmbeddingSimilarity(studentAnalysis.analytical_summary.primary_function, adminAnalysis.analytical_summary.primary_function),
    calculateEmbeddingSimilarity(studentAnalysis.analytical_summary.identified_pattern, adminAnalysis.analytical_summary.identified_pattern),
    calculateEmbeddingSimilarity(serializeLogicalFlow(studentAnalysis), serializeLogicalFlow(adminAnalysis)),
    calculateEmbeddingSimilarity(serializeVisualComponents(studentAnalysis), serializeVisualComponents(adminAnalysis)),
    calculateEmbeddingSimilarity(
      studentAnalysis.analytical_summary.noted_anomalies_or_constraints.join(', '),
      adminAnalysis.analytical_summary.noted_anomalies_or_constraints.join(', ')
    ),
  ]);

  const fusedScore =
    IMAGE_FUSION_WEIGHTS.primaryFunction   * primaryFunctionSim +
    IMAGE_FUSION_WEIGHTS.identifiedPattern * identifiedPatternSim +
    IMAGE_FUSION_WEIGHTS.logicalFlow       * logicalFlowSim +
    IMAGE_FUSION_WEIGHTS.visualComponents  * visualComponentsSim +
    IMAGE_FUSION_WEIGHTS.anomalies         * anomaliesSim;

  console.log('Image analysis fusion:', {
    primaryFunctionSim:   primaryFunctionSim.toFixed(3),
    identifiedPatternSim: identifiedPatternSim.toFixed(3),
    logicalFlowSim:       logicalFlowSim.toFixed(3),
    visualComponentsSim:  visualComponentsSim.toFixed(3),
    anomaliesSim:         anomaliesSim.toFixed(3),
    fusedScore:           fusedScore.toFixed(3),
  });

  const lgeResult = await evaluateWithLLM({
    userAnswer: serializeImageAnalysis(studentAnalysis),
    answerKey: serializeImageAnalysis(adminAnalysis),
    question,
    questionType: 'image-analysis',
    AIPrompt: '',
    timeoutMs,
  });

  if (!lgeResult.success) {
    throw new Error(`LGE failed during image analysis grading — ${lgeResult.error || 'unknown error'}`);
  }

  const lgeScore = lgeResult.score ?? 0;
  const combinedScore = (LGE_WEIGHT * lgeScore) + ((1 - LGE_WEIGHT) * fusedScore);
  const score = combinedScore >= FUSION_PASS_THRESHOLD ? 1 : 0;

  return { score, result: score ? 'PASS' : 'FAIL', feedback: lgeResult.feedback || '' };
};
