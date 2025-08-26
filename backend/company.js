// server/server.js

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { search } = require('duck-duck-scrape');
const { summary, search: wikiSearch } = require('wikipedia');
const { URL } = require('url');

const app = express();
const PORT = 3002; // Use a port different from your frontend

app.use(cors()); // Allow requests from the React app

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
};

// Helper functions (translated from Python)
const fetchUrl = async (url, timeout = 10000) => {
    try {
        const response = await axios.get(url, { headers: HEADERS, timeout, maxRedirects: 5 });
        if (response.status === 200 && response.headers['content-type'].includes('text/html')) {
            return response.data;
        }
    } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
    }
    return null;
};

const cleanText = (text) => {
    return text ? text.replace(/\s+/g, ' ').trim() : "";
};

const extractByHeadings = ($, keywords, max_chars = 800) => {
    const found = new Set();
    $('h1, h2, h3, h4, h5, strong, b').each((i, header) => {
        const headerText = $(header).text().toLowerCase();
        if (keywords.some(keyword => headerText.includes(keyword))) {
            let collected = [];
            let current = $(header).next();
            let steps = 0;
            while (current.length && steps < 6) {
                if (current.is('p, div, li')) {
                    collected.push(current.text());
                }
                if (current.is('h1, h2, h3, h4, h5, h6')) break;
                current = current.next();
                steps++;
            }
            if (collected.length) {
                const text = cleanText(collected.join(' ')).substring(0, max_chars);
                if (text.length > 50) found.add(text);
            }
        }
    });
    return Array.from(found);
};

const extractByKeywordSearch = ($, keywords, max_sentences = 3) => {
    const texts = new Set();
    $('p, li, div').each((i, para) => {
        const paraText = $(para).text().toLowerCase();
        if (keywords.some(keyword => paraText.includes(keyword))) {
            const cleanPara = cleanText($(para).text());
            if (cleanPara.length > 30) texts.add(cleanPara);
        }
        if (texts.size >= max_sentences) return false; // Break loop
    });
    return Array.from(texts);
};

const classifyBusinessType = ($) => {
    const pageText = $('body').text().toLowerCase();
    const productCount = (pageText.match(/\b(product|manufacturing|hardware|software|devices|equipment)\b/g) || []).length;
    const serviceCount = (pageText.match(/\b(service|consulting|support|solutions|advisory)\b/g) || []).length;

    if (productCount > serviceCount * 1.2) return "Product-based";
    if (serviceCount > productCount * 1.2) return "Service-based";
    return "Hybrid (Product & Service)";
};

const extractProductsServices = ($, limit = 10) => {
    const items = new Set();
    const keywords = ['products', 'services', 'offerings', 'solutions', 'what we do', 'our work'];
    $('h1, h2, h3, h4').each((i, header) => {
        const heading = $(header).text().toLowerCase();
        if (keywords.some(kw => heading.includes(kw))) {
            let nextElement = $(header).next();
            if (nextElement.is('ul')) {
                nextElement.find('li').each((j, li) => {
                    const itemText = cleanText($(li).text());
                    if (itemText.length > 10 && itemText.length < 200) items.add(itemText);
                });
            }
        }
    });
    return Array.from(items).slice(0, limit);
};

const extractFoundingInfo = (text) => {
    const textLower = text.toLowerCase();
    const yearMatch = textLower.match(/(founded|established|started|began)\s+(?:in\s+)?(\d{4})/);
    const foundingYear = yearMatch ? yearMatch[2] : null;
    const employeeMatch = textLower.match(/([\d,]+)\s*(?:employees|staff|team members|people)/);
    const employeeCount = employeeMatch ? employeeMatch[1] : null;
    return { foundingYear, employeeCount };
};


// Main API Endpoint
app.get('/api/profile', async (req, res) => {
    const { companyName } = req.query;
    if (!companyName) {
        return res.status(400).json({ error: "Company name is required." });
    }

    console.log(`Fetching profile for: ${companyName}`);
    let profile = {
        company_name: companyName,
        vision: null, mission: null, founding_year: null,
        employee_count: null, recent_achievements: [], working_culture: [],
        working_timings: null, business_type: null, products_services: [],
        sources_used: []
    };

    // 1. Wikipedia Search
    try {
        console.log("Searching Wikipedia...");
        const wikiResults = await wikiSearch(companyName);
        if (wikiResults.results.length > 0) {
            const page = await summary(wikiResults.results[0].title);
            profile.sources_used.push(`Wikipedia: ${page.url}`);
            const { foundingYear, employeeCount } = extractFoundingInfo(page.extract);
            if (foundingYear) profile.founding_year = foundingYear;
            if (employeeCount) profile.employee_count = employeeCount;
        }
    } catch (e) {
        console.error("Wikipedia search failed:", e.message);
    }

    // 2. Web Search
    const searchQueries = {
        about: `"${companyName}" about us vision mission`,
        culture: `"${companyName}" company culture work environment`,
        news: `"${companyName}" recent achievements awards news 2024 2025`,
        products: `"${companyName}" products services offerings`
    };
    const scrapedDomains = new Set();

    for (const [query_type, query] of Object.entries(searchQueries)) {
        console.log(`Searching DDG for ${query_type}...`);
        try {
            const searchResults = await search(query, { safeSearch: 'off' });
            for (const result of searchResults.results.slice(0, 3)) { // Limit to top 3 results per query
                const domain = new URL(result.url).hostname;
                if (scrapedDomains.has(domain)) continue;

                console.log(`Scraping: ${result.url}`);
                const html = await fetchUrl(result.url);
                if (html) {
                    const $ = cheerio.load(html);
                    scrapedDomains.add(domain);
                    profile.sources_used.push(`Web: ${result.url}`);

                    // Process content
                    if (!profile.vision) profile.vision = (extractByHeadings($, ['vision', 'our vision'], 800) || [])[0];
                    if (!profile.mission) profile.mission = (extractByHeadings($, ['mission', 'our mission', 'purpose'], 800) || [])[0];
                    if (!profile.founding_year || !profile.employee_count) {
                        const { foundingYear, employeeCount } = extractFoundingInfo($('body').text());
                        if (foundingYear && !profile.founding_year) profile.founding_year = foundingYear;
                        if (employeeCount && !profile.employee_count) profile.employee_count = employeeCount;
                    }
                    if (!profile.business_type) profile.business_type = classifyBusinessType($);
                    if (profile.products_services.length === 0) profile.products_services = extractProductsServices($);

                    profile.working_culture.push(...extractByKeywordSearch($, ['culture', 'values', 'workplace'], 2));
                    profile.recent_achievements.push(...extractByKeywordSearch($, ['award', 'achievement', 'recognition', 'milestone'], 3));
                }
            }
        } catch (e) {
            console.error(`DDG search failed for ${query_type}:`, e.message);
        }
    }
    
    // Clean up duplicates and limit sizes
    profile.working_culture = [...new Set(profile.working_culture)].slice(0, 3);
    profile.recent_achievements = [...new Set(profile.recent_achievements)].slice(0, 5);

    console.log("Profile fetching complete.");
    res.json(profile);
});


app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});