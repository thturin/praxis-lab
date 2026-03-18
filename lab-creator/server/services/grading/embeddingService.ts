const { callEmbeddingModel } = require('../llm/llmClient');

interface CosineSimilarityVerification {
  similarity: number;
  answerQuality: 'PASS' | 'FAIL';
}

//=============EMBEDDING MODEL (TSM)=============
export const calculateEmbeddingSimilarity = async (text1: string, text2: string): Promise<number> => {
  try {
    const embedding = await callEmbeddingModel({ input: [text1, text2] });
    let dotProduct = 0;
    for (let i = 0; i < embedding[0].length; i++) {
      dotProduct += embedding[0][i] * embedding[1][i];
    }
    let magnitudeA = 0;
    for (let i = 0; i < embedding[0].length; i++) {
      magnitudeA += embedding[0][i] * embedding[0][i];
    }
    magnitudeA = Math.sqrt(magnitudeA);

    let magnitudeB = 0;
    for (let i = 0; i < embedding[1].length; i++) {
      magnitudeB += embedding[1][i] * embedding[1][i];
    }
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  } catch (err) {
    console.error('Error calculating embedding similarity', err.response?.data);
    console.error(err.response?.message);
    return 0;
  }
};

export const verifyWithCosineSimilarity = async (userAnswer: string, answerKey: string): Promise<CosineSimilarityVerification> => {
  try {
    const similarity = await calculateEmbeddingSimilarity(userAnswer, answerKey);
    console.log('Cosine similarity verification:', similarity);
    const answerQuality = similarity >= 0.6 ? 'PASS' : 'FAIL';
    return { similarity, answerQuality };
  } catch (err) {
    console.error('Error in verifyWithCosineSimilarity:', err);
    return { similarity: -1, answerQuality: 'FAIL' };
  }
};
