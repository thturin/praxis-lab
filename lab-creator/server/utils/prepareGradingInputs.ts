const { parseTextFromHtml } = require('./parseHtml');

export interface PrepareGradingInputsParams {
  userAnswer: string;
  question: string;
  studentImageText?: string[];
  adminImageText?: string;
  answerKey?: string;
  adminKeyImageText?: string;
}

export interface PreparedGradingInputs {
  effectiveAnswer: string;
  effectiveQuestion: string;
  effectiveAnswerKey?: string;
}

export const prepareGradingInputs = ({ userAnswer, question, studentImageText, adminImageText, answerKey, adminKeyImageText }: PrepareGradingInputsParams): PreparedGradingInputs => {
  // Inline student image texts into the answer (each <img> replaced with extracted text in order)
  let imgIndex = 0;
  const htmlWithInlineImages = (userAnswer || '').replace(/<img[^>]*>/gi, () => {
    const text = studentImageText?.[imgIndex];
    imgIndex++;
    return text ? `[Screenshot ${imgIndex}: ${text}]` : '';
  });
  const effectiveAnswer = parseTextFromHtml(htmlWithInlineImages);

  // Append admin image text to the question
  //example question: 
  // //"What is shown in the image?" adminImageText: "A graph of sales over time" 
  // //-> effectiveQuestion: "What is shown in the image?
  // //\n\n[Image text]: A graph of sales over time"
  let effectiveQuestion = parseTextFromHtml(question);
  if (adminImageText?.trim()) effectiveQuestion += `\n\n[Image text]: ${adminImageText.trim()}`;

  // Optionally prepare the answer key
  //append images to teh end of the anaswer key if provided
  let effectiveAnswerKey: string | undefined;
  if (answerKey !== undefined) {
    effectiveAnswerKey = parseTextFromHtml(answerKey);
    if (adminKeyImageText?.trim()) effectiveAnswerKey += `\n\n[Image text]: ${adminKeyImageText.trim()}`;
  }

  return { effectiveAnswer, effectiveQuestion, effectiveAnswerKey };
};
