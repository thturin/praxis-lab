export const createSession = (labTitle="null",username="null", userId=null, labId=null)=> (
    {
        labTitle,
        username,
        userId, //required in schema
        labId, //required in schema
        lastModified: new Date().toISOString(),
        responses:{},
        gradedResults:{},
        finalScore:{
            totalScore:0,
            maxScore:0,
            percent:0
        }
    }
);

