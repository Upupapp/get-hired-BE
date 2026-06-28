# GETHIRED_SEARCH_SYNONYM_DICTIONARY_V1
_Generated: 2026-06-28 | File: services/searchSynonymService.js_

## Purpose
Philippine job market uses many slang, abbreviations, and local terms that differ from standard English job titles. PostgreSQL's English stemmer doesn't know that "WFH" and "remote" are the same thing. The synonym service expands the user's raw query before it reaches `plainto_tsquery`.

## Expansion strategy
1. Lowercase the input.
2. Try phrase synonyms first (longest match wins — avoids partial replacements).
3. Then try word synonyms (token-by-token).
4. Return the expanded query string (may be longer than input).

The expanded string is fed to `plainto_tsquery('english', expandedQuery)` which then applies English stemming on top.

## Phrase synonyms (multi-word, checked first)
| User types | Expands to |
|---|---|
| `work from home` | `remote` |
| `fresh graduate` | `entry level` |
| `fresh grad` | `entry level` |
| `no experience needed` | `entry level` |
| `no experience required` | `entry level` |
| `customer service representative` | `customer service` |
| `virtual assistant` | `administrative assistant` |
| `night shift` | `graveyard shift` |
| `work on site` | `onsite` |
| `on site` | `onsite` |

## Word synonyms (single-token)
| User types | Expands to |
|---|---|
| `wfh` | `remote` |
| `csr` | `customer service` |
| `lgu` | `local government` |
| `va` | `virtual assistant` |
| `dev` | `developer` |
| `devops` | `developer operations` |
| `qa` | `quality assurance` |
| `ui` | `user interface designer` |
| `ux` | `user experience designer` |
| `hr` | `human resources` |
| `it` | `information technology` |
| `bd` | `business development` |
| `bpo` | `business process outsourcing` |
| `ict` | `information communications technology` |
| `po` | `product owner` |
| `pm` | `project manager` |
| `sm` | `scrum master` |
| `ba` | `business analyst` |
| `seo` | `search engine optimization` |
| `smm` | `social media marketing` |
| `oa` | `office administrator` |
| `ea` | `executive assistant` |
| `ops` | `operations` |
| `eng` | `engineer` |
| `mgr` | `manager` |
| `sr` | `senior` |
| `jr` | `junior` |

## Adding new synonyms
Edit `services/searchSynonymService.js`. Phrase synonyms go in the `PHRASE_SYNONYMS` array (order matters — longest phrases first). Word synonyms go in the `WORD_SYNONYMS` object. No restart needed other than `pm2 restart gethired`.

## What is NOT done
- No stemmer override (PostgreSQL handles English stemming after expansion).
- No Tagalog → English translation (e.g., "trabaho" → "job") — would require a proper ML translation layer; deferred to backlog.
- No fuzzy/typo correction — typos are handled by the `plainto_tsquery` engine tolerating partial word matches through stemming. Full fuzzy (pg_trgm similarity) is in the backlog.
