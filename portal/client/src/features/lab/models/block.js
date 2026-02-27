export const createQuestion = () => ({
  id: Date.now().toString(),
  blockType: "question",
  type: "short", //defaults to short but can change
  prompt: "",
  key: "",
  explanation:"",
  subQuestions: [],
  isScored:true,
  imageText: ""
});

export const createMaterial = () => ({
  id: Date.now().toString(),
  blockType: "material",
  content: "",
  images: [], //array of base64 strings
  imageText: ""
});