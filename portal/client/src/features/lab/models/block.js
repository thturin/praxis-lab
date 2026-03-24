export const createQuestion = () => ({
  id: Date.now().toString(),
  blockType: "question",
  type: "short", //defaults to short but can change
  prompt: "",
  key: "",
  explanation:"",
  subQuestions: [],
  isScored:true,
  imageText: "",  //image text in question prompt
  keyImageAnalysis: null, // structured ImageAnalysis JSON for the answer key image (image-analysis type)
});

export const createMaterial = () => ({
  id: Date.now().toString(),
  blockType: "material",
  content: "",
  images: [], //array of base64 strings
  imageText: ""
});