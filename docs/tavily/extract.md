API Reference
Tavily Extract
Extract web page content from one or more specified URLs using Tavily Extract.

POST
/
extract
Authorizations
​
Authorization
stringheaderrequired
Bearer authentication header in the form Bearer <token>, where <token> is your Tavily API key (e.g., Bearer tvly-YOUR_API_KEY).

Body
application/json
Parameters for the Tavily Extract request.

​
urls

string
required
The URL to extract content from.

Example:
"https://en.wikipedia.org/wiki/Artificial_intelligence"

​
include_images
booleandefault:false
Include a list of images extracted from the URLs in the response. Default is false.

​
include_favicon
booleandefault:false
Whether to include the favicon URL for each result.

​
extract_depth
enum<string>default:basic
The depth of the extraction process. advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency.basic extraction costs 1 credit per 5 successful URL extractions, while advanced extraction costs 2 credits per 5 successful URL extractions.

Available options: basic, advanced 
​
format
enum<string>default:markdown
The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.

Available options: markdown, text 
​
timeout
numberdefault:None
Maximum time in seconds to wait for the URL extraction before timing out. Must be between 1.0 and 60.0 seconds. If not specified, default timeouts are applied based on extract_depth: 10 seconds for basic extraction and 30 seconds for advanced extraction.

Required range: 1 <= x <= 60
Response

200

application/json
Extraction results returned successfully

​
results
object[]
A list of extracted content from the provided URLs.

Show child attributes

​
failed_results
object[]
A list of URLs that could not be processed.

Show child attributes

Example:
[]
​
response_time
number
Time in seconds it took to complete the request.

Example:
0.02

​
request_id
string
A unique request identifier you can share with customer support to help resolve issues with specific requests.

Example:
"123e4567-e89b-12d3-a456-426614174111"


```javascript
const { tavily } = require("@tavily/core");

const tvly = tavily({ apiKey: "tvly-YOUR_API_KEY" });
const response = await tvly.extract("https://en.wikipedia.org/wiki/Artificial_intelligence");

console.log(response);
```

## 200

```json
{
  "results": [
    {
      "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
      "raw_content": "\"Jump to content\\nMain menu\\nSearch\\nAppearance\\nDonate\\nCreate account\\nLog in\\nPersonal tools\\n        Photograph your local culture, help Wikipedia and win!\\nToggle the table of contents\\nArtificial intelligence\\n161 languages\\nArticle\\nTalk\\nRead\\nView source\\nView history\\nTools\\nFrom Wikipedia, the free encyclopedia\\n\\\"AI\\\" redirects here. For other uses, see AI (disambiguation) and Artificial intelligence (disambiguation).\\nPart of a series on\\nArtificial intelligence (AI)\\nshow\\nMajor goals\\nshow\\nApproaches\\nshow\\nApplications\\nshow\\nPhilosophy\\nshow\\nHistory\\nshow\\nGlossary\\nvte\\nArtificial intelligence (AI), in its broadest sense, is intelligence exhibited by machines, particularly computer systems. It is a field of research in computer science that develops and studies methods and software that enable machines to perceive their environment and use learning and intelligence to take actions that maximize their chances of achieving defined goals.[1] Such machines may be called AIs.\\nHigh-profile applications of AI include advanced web search engines (e.g., Google Search); recommendation systems (used by YouTube, Amazon, and Netflix); virtual assistants (e.g., Google Assistant, Siri, and Alexa); autonomous vehicles (e.g., Waymo); generative and creative tools (e.g., ChatGPT and AI art); and superhuman play and analysis in strategy games (e.g., chess and Go)...................",
      "images": [],
      "favicon": "https://en.wikipedia.org/static/favicon/wikipedia.ico"
    }
  ],
  "failed_results": [],
  "response_time": 0.02,
  "request_id": "123e4567-e89b-12d3-a456-426614174111"
}
```