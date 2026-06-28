# State Map — Company Profile Subtabs

## Component State

```
EmployerCompanyComponent {
  activeTab: number        // 1 | 2 | 3 — local, resets on destroy
  saving: boolean          // unused in this version, reserved
  saveSuccess: boolean     // unused in this version, reserved

  // NgRx store observables (read-only in Brand/Benefits tabs)
  company$: Observable<Company>   // from companyFacade.companyDetails$
  workSetup$: Observable<Options[]> // from companyFacade.setup$
  industry$: Observable<Options[]>  // from companyFacade.industry$
}
```

## NgRx Store (unchanged)

```
company feature state {
  selected: Company     // loaded via getCompany() action
  list: Company[]       // not used by this component
  error: any
  succesMsg: string     // 'created' | 'updated' | ''
  loading: boolean
  dashboard: Dashboard  // not used by this component
  setup: Options[]      // work_setup list, loaded via getSetup()
  industry: Options[]   // industry list, loaded via getIndustry()
  users: CompanyUser[]  // not used by this component
  subs: CompanySubscriptions // not used by this component
}
```

## Data Flow

```
ngOnInit()
  → companyFacade.getCompany()  → GET /company/usercompany → getUserCompany(uid) → store.selected
  → companyFacade.getSetup()    → GET /options/setuplist   → store.setup
  → companyFacade.getIndustry() → GET /company/industries  → store.industry

Tab 1 (Profile):
  CompanyDetailsFormComponent subscribes to companyFacade.companyDetails$
  On save: dispatches CompanyAction.updateCompany → PUT /company/update (with BOLA check)

Tab 2 (Brand):
  Reads company$ | async → shows company.companyDetails, company.companyLogoUrl

Tab 3 (Benefits):
  Reads company$ | async + workSetup$ | async → shows work_setup chip, numberOfEmployee chip

onProfileUpdate() (tab 1 → tab 2/3 sync):
  Calls companyFacade.getCompany() to refresh store after save
```

## Loading States
- Brand/Benefits tabs show skeleton shimmer while company$ is null
- Profile tab: `CompanyDetailsFormComponent` handles its own loading (modal dialog via MatDialog)

## Error States
- Brand/Benefits: if company$ resolves to null (no company set up), the `ng-container *ngIf` is skipped
  and the skeleton remains (acceptable — employer should set up company first via /recruiter/company/settings)
- Profile tab: existing error handling in `CompanyDetailsFormComponent` unchanged
