# GETHIRED_SEARCH_COPY_QA_V1
_Generated: 2026-06-28_

## Copy audit: all search UI text strings

### Search input
| Element | Copy | Issues |
|---|---|---|
| Placeholder | "Search jobs, companies, skills, or locations" | ✅ Clear, sets expectation |
| Submit button aria-label | "Search" | ✅ |
| Clear button aria-label | "Clear search" | ✅ |

### Autocomplete dropdown
| Element | Copy | Issues |
|---|---|---|
| Group label: job titles | "Job Titles" | ✅ |
| Group label: companies | "Companies" | ✅ |
| Group label: locations | "Locations" | ✅ |
| Group label: shortcuts | "Quick Searches" | ✅ |
| Loading state | (spinner, no text) | ✅ — spinner is self-explanatory |

### Filter row
| Element | Copy | Issues |
|---|---|---|
| Work setup default | "All setups" | ✅ |
| Employment type default | "All types" | ✅ |
| Sort default | "Most relevant" | ✅ |
| Result count | "142 results" / "1 result" | ✅ — grammatically correct singular/plural |

### Filter chips
| Element | Copy | Issues |
|---|---|---|
| Chip remove aria-label | "Remove filter: Remote" | ✅ — uses actual filter value |
| Clear all button | "Clear all" | ✅ |

### Error state
| Element | Copy | Issues |
|---|---|---|
| Error message | "Search is temporarily unavailable. Please try again in a moment." | ✅ — honest, not alarmist |
| Retry button | "Try again" | ✅ |

### Empty state
| Element | Copy | Issues |
|---|---|---|
| Heading (with query) | `No results for "{{query}}"` | ✅ — quotes the user's query |
| Heading (no query) | "No jobs match these filters" | ✅ |
| Body (with query) | "Try different keywords, or check for typos. Philippine job market tip: try abbreviations like "WFH", "CSR", or "VA"." | ✅ — actionable + PH-specific tip |
| Body (no query) | "Try removing some filters to see more results." | ✅ |
| Clear filters button | "Clear filters" | ✅ |
| Browse all button | "Browse all jobs" | ✅ |
| CV Doctor link | "Having trouble finding the right fit? Try CV Doctor →" | ✅ — relevant recovery path |

### Pagination
| Element | Copy | Issues |
|---|---|---|
| Previous button | "← Previous" | ✅ |
| Next button | "Next →" | ✅ |
| Page info | "Page 3" | ✅ — simple, not "Showing 41-60 of 142" (intentional — total pagination info can be noisy) |

## Copy verdict
**PASS** — All strings are honest, clear, and actionable. No fake claims, no generic "Something went wrong" without context. PH-specific tip in empty state adds genuine local value.
