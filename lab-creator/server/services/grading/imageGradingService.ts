import { TopologyAnalysis } from '../vision/visionService';
import { calculateEmbeddingSimilarity } from './embeddingService';
import { generateFusionFeedback } from './feedbackService';

const FUSION_PASS_THRESHOLD = 0.5;

const IMAGE_FUSION_WEIGHTS = {
  topologyFingerprint: 0.50,
  primaryFunction:     0.30,
  identifiedPattern:   0.20,
};

//=============SERIALIZATION =============

const serializeTopologyFingerprint = (a: TopologyAnalysis): string =>
  a.topology_fingerprint.join('\n');

export const serializeTopologyAnalysis = (a: TopologyAnalysis): string =>
  `Primary function: ${a.analytical_summary.primary_function}\n` +
  `Pattern: ${a.analytical_summary.identified_pattern}\n` +
  `Topology:\n${serializeTopologyFingerprint(a)}`;

//=============FUSION GRADING =============

export interface GradeImageAnalysisParams {
  studentAnalysis: TopologyAnalysis;
  adminAnalysis: TopologyAnalysis;
  question: string;
  timeoutMs?: number;
}

export interface GradeImageAnalysisResult {
  score: number;
  result: string;
  feedback: string;
}

export const gradeImageAnalysisWithFusion = async ({ studentAnalysis, adminAnalysis, question, timeoutMs = 20000 }: GradeImageAnalysisParams): Promise<GradeImageAnalysisResult> => {

  const [topologySim, primaryFunctionSim, identifiedPatternSim] = await Promise.all([
    calculateEmbeddingSimilarity( //topology similarity 
      serializeTopologyFingerprint(studentAnalysis),
      serializeTopologyFingerprint(adminAnalysis)
    ),
    calculateEmbeddingSimilarity(//primary function similarity 
      studentAnalysis.analytical_summary.primary_function,
      adminAnalysis.analytical_summary.primary_function
    ),
    calculateEmbeddingSimilarity(
      studentAnalysis.analytical_summary.identified_pattern,
      adminAnalysis.analytical_summary.identified_pattern
    ),
  ]);

  const fusedScore =
    IMAGE_FUSION_WEIGHTS.topologyFingerprint * topologySim +
    IMAGE_FUSION_WEIGHTS.primaryFunction     * primaryFunctionSim +
    IMAGE_FUSION_WEIGHTS.identifiedPattern   * identifiedPatternSim;

  console.log('Image analysis fusion:', {
    topologySim:          topologySim.toFixed(3),
    primaryFunctionSim:   primaryFunctionSim.toFixed(3),
    identifiedPatternSim: identifiedPatternSim.toFixed(3),
    fusedScore:           fusedScore.toFixed(3),
  });

  const score = fusedScore >= FUSION_PASS_THRESHOLD ? 1 : 0;

  const feedback = await generateFusionFeedback({
    userAnswer: serializeTopologyAnalysis(studentAnalysis),
    answerKey: serializeTopologyAnalysis(adminAnalysis),
    question,
    fusedScore,
    timeoutMs,
  });

  return { score, result: score ? 'PASS' : 'FAIL', feedback };
};
