# Profile Subtab — Implementation Log

## Approach
The Profile subtab delegates entirely to the existing `CompanyDetailsFormComponent`. Zero changes to that component.

## Files Changed
- `employer-company.component.ts` — injected `CompanyFacade`, added `subtabs` array, `activeTab`, `selectTab()`, `onProfileUpdate()`.
- `employer-company.component.html` — added subtab nav + tab panels; Tab 1 renders `<app-company-details-form>`.
- `employer-company.component.scss` — styled subtab nav + all UI effects.

## Fields in Profile Tab (via existing form)
- Company Logo (file upload, logo preview)
- Company Name (required)
- Company Description / Overview (`company_details`)
- Industry (dropdown from industry list)
- Work Setup (dropdown from setup list)
- Number of Employees (number input)
- Email (required)
- Work Phone
- Company Address (Google Maps address component)
- Publicly Shown checkbox

## Preservation Confirmation
- `CompanyDetailsFormComponent`: NOT modified
- `company.service.ts`: NOT modified
- `company.effects.ts`: NOT modified
- `company.facade.ts`: NOT modified
- `company.reducer.ts`: NOT modified
- `company.actions.ts`: NOT modified
- `company.model.ts`: NOT modified
- All existing form validators: unchanged
- Save / update flow: unchanged (still dispatches `CompanyAction.updateCompany`)

## Template Snippet (Tab 1 Panel)
```html
<div class="cp-tab-panel" *ngIf="activeTab === 1" role="tabpanel" ...>
  <div class="cp-tab-intro">
    <p>A complete company profile helps candidates understand who is hiring.
       You can publish jobs before completing every company detail.</p>
  </div>
  <app-company-details-form (updateCompany)="onProfileUpdate($event)"></app-company-details-form>
</div>
```

## Status: COMPLETE
