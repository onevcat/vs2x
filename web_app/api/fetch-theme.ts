import { VercelRequest, VercelResponse } from '@vercel/node';
import { parse } from 'jsonc-parser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow requests from your frontend development and production domains
  // Adjust the origin '*' in production for better security if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required in the request body' });
  }

  try {
    // Validate the URL format (basic validation)
    new URL(url);
  } catch (_error) { // Prefix unused variable with underscore
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    console.log(`Fetching theme from URL: ${url}`);
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json, text/plain, */*' // Be flexible with accept header
        }
    });

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${url}, Status: ${response.status}`);
      // Try to get error text, but handle cases where it might not be text
      let errorText = `Failed to fetch URL. Status: ${response.status}`;
      try {
          const text = await response.text();
          errorText += ` - ${text.substring(0, 100)}`; // Limit error message length
      } catch (_e) { // Prefix unused variable with underscore
          // Ignore if reading text fails
      }
      return res.status(response.status).json({ error: errorText });
    }

    const contentType = response.headers.get('content-type');
    const rawText = await response.text(); // Get text first

    // Check if content type suggests JSON or if it looks like JSON
    if (contentType?.includes('json') || (rawText.trim().startsWith('{') && rawText.trim().endsWith('}'))) {
        try {
            // Parse the JSONC content using jsonc-parser
            const parseErrors: any[] = [];
            const jsonData = parse(rawText, parseErrors, { allowTrailingComma: true });

            if (parseErrors.length > 0) {
                console.error(`Error parsing JSONC from ${url}:`, parseErrors);
                const snippet = rawText.substring(0, 200); // Get first 200 chars
                // Provide a more specific error based on the first parse error
                const firstError = parseErrors[0];
                return res.status(400).json({ error: `Fetched content is not valid JSONC. Error: ${firstError.error} at offset ${firstError.offset}. Snippet: ${snippet}` });
            }

            console.log(`Successfully fetched and parsed JSONC from ${url}`);
            // Send back the parsed JSON data directly
            // VercelResponse.json will stringify it correctly
            return res.status(200).json({ themeJson: jsonData });
        } catch (parseError) { // Catch potential errors from parse itself, though less likely with jsonc-parser
            console.error(`Unexpected error parsing JSONC from ${url}:`, parseError);
            const snippet = rawText.substring(0, 200);
            return res.status(400).json({ error: `Error processing fetched content. Snippet: ${snippet}` });
        }
    } else {
        console.warn(`Content type from ${url} is not JSON: ${contentType}`);
        return res.status(400).json({ error: 'Fetched content does not appear to be JSON' });
    }

  } catch (error: unknown) { // Use unknown instead of any
    console.error(`Error fetching or processing URL ${url}:`, error);
    // Provide a more generic error message for network or unexpected issues
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `Server error fetching URL: ${message}` });
  }
}