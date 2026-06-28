# GETHIRED_SEARCH_COMPONENT_MAP_V1
_Generated: 2026-06-28_

## Component tree (public search mode)

```
PublicListComponent (public/public-list/)
├── [search mode: *ngIf="isSearchMode"]
│   ├── SearchAutocompleteComponent (shared/components/gh-search/search-autocomplete/)
│   │   ├── input[role=searchbox]
│   │   └── ul[role=listbox]
│   │       └── li[role=option] × N (job_title / company / location / shortcut)
│   ├── Filter chips row
│   │   └── .gh-chip × N (active filters)
│   ├── Filter controls row
│   │   ├── select (workSetup)
│   │   ├── select (employmentType)
│   │   ├── select (sort)
│   │   └── span[aria-live] (result count)
│   ├── SearchSkeletonComponent (while loading)
│   ├── [error state div role=alert]
│   ├── [results list role=region]
│   │   └── SearchJobCardComponent × N
│   ├── SearchEmptyStateComponent (when 0 results)
│   └── [pagination div]
└── [browse mode: #browseMode ng-template]
    ├── SearchAutocompleteComponent (search bar only, no results)
    ├── PublicCompaniesRecommendedComponent
    ├── JobBoardEmployerCtaComponent
    ├── JobPostsListComponent
    └── PublicExploreUsersComponent
```

## Data flow

```
URL ?q=developer&workSetup=remote
  → ActivatedRoute.queryParams (Observable)
  → PublicListComponent.ngOnInit pipe
    → distinctUntilChanged + switchMap
    → SearchService.searchPublic(params)
      → GET /api/search/public
        → searchController.publicSearch()
        → searchService.searchPublicJobs()
        → PostgreSQL FTS
      → SearchResponse { results[], pagination }
    → this.searchResults = results
    → SearchJobCardComponent *ngFor="let job of searchResults"
```

## Module membership
All gh-search components are declared and exported in `SharedModule`. `PublicModule` imports `SharedModule`, so `PublicListComponent` can use all four components without any additional module declaration.

## State management
No NgRx, no BehaviorSubject store. State lives in:
1. URL query params (source of truth for search state)
2. Local component properties (`searchResults`, `searchLoading`, `searchError`, `searchTotal`, etc.) derived from the URL params observable.
