API Reference
Tavily Map
Tavily Map traverses websites like a graph and can explore hundreds of paths in parallel with intelligent discovery to generate comprehensive site maps.

POST
/
map
Beta Feature - The Tavily Map endpoint is currently in Beta. While fully functional, the API may undergo changes as we continue to refine and improve the service.
Authorizations
​
Authorization
stringheaderrequired
Bearer authentication header in the form Bearer <token>, where <token> is your Tavily API key (e.g., Bearer tvly-YOUR_API_KEY).

Body
application/json
Parameters for the Tavily Map request.

​
url
stringrequired
The root URL to begin the mapping.

Example:
"docs.tavily.com"

​
instructions
string
Natural language instructions for the crawler. When specified, the cost increases to 2 API credits per 10 successful pages instead of 1 API credit per 10 pages.

Example:
"Find all pages about the Python SDK"

​
max_depth
integerdefault:1
Max depth of the mapping. Defines how far from the base URL the crawler can explore.

Required range: x >= 1
​
max_breadth
integerdefault:20
Max number of links to follow per level of the tree (i.e., per page).

Required range: x >= 1
​
limit
integerdefault:50
Total number of links the crawler will process before stopping.

Required range: x >= 1
​
select_paths
string[]
Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*).

​
select_domains
string[]
Regex patterns to select crawling to specific domains or subdomains (e.g., ^docs\.example\.com$).

​
exclude_paths
string[]
Regex patterns to exclude URLs with specific path patterns (e.g., /private/.*, /admin/.*).

​
exclude_domains
string[]
Regex patterns to exclude specific domains or subdomains from crawling (e.g., ^private\.example\.com$).

​
allow_external
booleandefault:true
Whether to include external domain links in the final results list.

Response

200

application/json
Map results returned successfully

​
base_url
string
The base URL that was mapped.

Example:
"docs.tavily.com"

​
results
string[]
A list of URLs that were discovered during the mapping.

Example:
[
  "https://docs.tavily.com/welcome",
  "https://docs.tavily.com/documentation/api-credits",
  "https://docs.tavily.com/documentation/about"
]
​
response_time
number
Time in seconds it took to complete the request.

Example:
1.23

​
request_id
string
A unique request identifier you can share with customer support to help resolve issues with specific requests.

Example:
"123e4567-e89b-12d3-a456-426614174111"

Tavily Crawl


```javascript
const { tavily } = require("@tavily/core");

const tvly = tavily({ apiKey: "tvly-YOUR_API_KEY" });
const response = await tvly.map("https://docs.tavily.com");

console.log(response);
```

## 200

```
{
  "base_url": "docs.tavily.com",
  "results": [
    "https://docs.tavily.com/welcome",
    "https://docs.tavily.com/documentation/api-credits",
    "https://docs.tavily.com/documentation/about"
  ],
  "response_time": 1.23,
  "request_id": "123e4567-e89b-12d3-a456-426614174111"
}
```