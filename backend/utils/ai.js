const axios = require("axios");

async function generateSummaryAndQuiz(content) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { summary: "API Key Missing", quiz: "API Key Missing" };

  // 🛠️ USE THE ALIAS: 'gemini-flash-latest' 
  // This automatically finds the version your key is allowed to use.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: `Summarize this text and create a 3-question quiz.
                 Format:
                 Summary: [text]
                 Quiz: [text]
                 
                 Text: ${content}`
        }]
      }]
    });

    if (response.data && response.data.candidates) {
      const rawText = response.data.candidates[0].content.parts[0].text;
      console.log("✅ AI SUCCESS! Using flash-latest alias.");

      const parts = rawText.split(/Quiz:/i);
      return { 
        summary: parts[0].replace(/Summary:/i, "").trim(), 
        quiz: parts[1] ? parts[1].trim() : "Quiz generated." 
      };
    }
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.error("RATE LIMIT: Please wait 30 seconds. Your project is in a restricted free tier.");
      return { summary: "Rate limit reached. Try again in a minute.", quiz: "Quota exceeded." };
    }
    
    console.error("FINAL ATTEMPT ERROR:", err.response ? JSON.stringify(err.response.data) : err.message);
    return { summary: "AI generation failed.", quiz: "Check API console." };
  }
}

module.exports = { generateSummaryAndQuiz };