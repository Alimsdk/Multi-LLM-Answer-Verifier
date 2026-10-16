import OpenAI from "openai";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

const MAX_STEP=20;

dotenv.config();

const openaiClient=new OpenAI({
    apiKey:`${process.env.OPENAI_SDK}`
});

const claudeaiClient=new Anthropic({
   apiKey:`${process.env.CLAUDE_SDK}`
});

async function reviewWithClaude(userQuestion,step){
   const response = await claudeaiClient.messages.create({
  model: "claude-haiku-5-5",
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content:`Review this step from an AI problem-solving pipeline.

        Original user question: ${userQuestion}
        Pipeline step: ${step.step}
        Step content: ${step.text}

        Check for factual, mathematical, or logical errors.
        Return concise feedback and a verdict of APPROVE or REVISE.
        Do not simply approve without checking.and ignore if the step text has very minor textual errors and dont give very long output`
    }
  ]
});

 return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

const SYSTEM_PROMPT=`
  You are an expert AI Engineer. You need to analyze what user is asking and
   what is his intention , what he needs to know then analyze it and come up with a output
    cross check it if the output is correct or not . Break the user problem into
     sub problems before coming up with a response.

     We are going to follow a pipeline to solve problems of "INITIAL","THINK","ANALYSE","OUTPUT"

     "INITIAL" when user give us input we will have an initial thought process on what the user is trying to do.
     "THINK" this is where we are going to think about how to solve the problem and start to breakdown the problem.
     "ANALYSE" this is where we will analyze the solution and also verify if the result is correct or not
     "THINK" we can go back to think mode where we now see if any sub problem remains and think
     "ANALYSE" again analyse the problem and get onto a solution
     "OUTPUT" this is where we can end and give the final output to the user.

     Rules:
  - Always output one step at a time and wait for other step before proceeding.
  - Always maintain the sequence of pipeline as given in example
  - Always follow JSON output format strictly.

  Example:
  - "USER": What is 2 + 2 - 5 * 10 / 3?
  OUTPUT:
  - "INITAL": "The user wants me to solve a maths equation"
  - "THINK": "I will use the BODMAS formula and based on that I should firt multiple 5 * 10 which is 50"
  - "ANALYSE": "Yes, the bodmas is actaully right and now equation is 2 + 2 - 50 / 3"
  - "THINK": "Now as per rule I should perform divide which is dividing 50 / 3 which is 16.666667"
  - "ANALYSE": "Now the new equations remains 2 + 2 - 16.666667"
  - "THINK": "Now its simple we can just do 2 + 2 = 4 and new equation remains 4 - 16.6666667"
  - "ANALYSE": "Great, now lets just do the final step as simple subtraction"
  - "THINK": "After the final subtraction the ans remations -12.666667"
  - "OUTPUT": "The final output is "-12.666667"

  Output Format:
  { "step": "INITAL" | "THINK" | "ANALYSE" | "OUTPUT", "text": "<The Actual Text>" }

`;

  const MESSAGE_DB=[{role:"system",content:SYSTEM_PROMPT}];

async function main(prompt){
   
    MESSAGE_DB.push({role:"user",content:prompt});

    let completed=false;

    for(let i=0;i<MAX_STEP;i++){
        const result=await openaiClient.chat.completions.create({
    model:"gpt-4o",
    messages:MESSAGE_DB
});

   const rawResult= result.choices[0].message.content;
    const parsedResult=JSON.parse(rawResult);

      MESSAGE_DB.push({role:'assistant',content:rawResult});
     console.log(`🤖 (${parsedResult.step}): ${parsedResult.text}`);

    if(parsedResult.step.toLowerCase() === 'think' || parsedResult.step.toLowerCase() === 'analyse'){
 const feedback = await reviewWithClaude(prompt, parsedResult);

      console.log(`🧠 (CLAUDE REVIEW): ${feedback}`);

      // Send Claude's feedback back to OpenAI as external input.
      MESSAGE_DB.push({
        role: "user",
        content: `
Claude reviewed your ${parsedResult.step} step.
Review feedback:
${feedback}

Consider this feedback in your next response.
Continue the pipeline using the required JSON format.
`,
    }
      )
    }

  
    if (parsedResult.step.toLowerCase() === 'output'){
        completed=true;
      break;
    } 
       

}

    if(!completed){
        throw new Error("Pipeline reached MAX_STEP without an OUTPUT step");
    }



}


main("how to become mentally unfuckable");