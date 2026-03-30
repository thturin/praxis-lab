import { TopologyAnalysis } from '../vision/visionService';
import { calculateEmbeddingSimilarity } from './embeddingService';
import { generateFusionFeedback } from './feedbackService';

const TOPOLOGY_PASS_THRESHOLD = 0.5;

//=============SERIALIZATION =============

const serializeTopologyFingerprint = (a: TopologyAnalysis): string =>
  a.topology_fingerprint.join('\n');

export const serializeTopologyAnalysis = (a: TopologyAnalysis): string =>
  `Primary function: ${a.analytical_summary.primary_function}\n` +
  `Pattern: ${a.analytical_summary.identified_pattern}\n` +
  `Topology:\n${serializeTopologyFingerprint(a)}`;

//=============FUSION GRADING =============generateFusion

export interface GradeImageAnalysisParams {
  studentAnalysis: TopologyAnalysis;
  adminAnalysis: TopologyAnalysis;
  question: string;
  timeoutMs?: number; // default 45s — image feedback prompts are larger than text prompts
}

export interface GradeImageAnalysisResult {
  score: number;
  result: string;
  feedback: string;
}

export const gradeImageAnalysisWithFusion = async ({ studentAnalysis, adminAnalysis, question, timeoutMs = 45000 }: GradeImageAnalysisParams): Promise<GradeImageAnalysisResult> => {

  const topologySim = await calculateEmbeddingSimilarity(
    serializeTopologyFingerprint(studentAnalysis),
    serializeTopologyFingerprint(adminAnalysis)
  );

  console.log('Image analysis topology similarity:', topologySim.toFixed(3));

  const score = topologySim >= TOPOLOGY_PASS_THRESHOLD ? 1 : 0;

  const feedback = await generateFusionFeedback({
    userAnswer: studentAnalysis.topology_fingerprint.join('\n'),
    answerKey: adminAnalysis.topology_fingerprint.join('\n'),
    question,
    fusedScore: topologySim,
    questionType: 'image-analysis',
    timeoutMs,
  });

  return { score, result: score ? 'PASS' : 'FAIL', feedback };
};
