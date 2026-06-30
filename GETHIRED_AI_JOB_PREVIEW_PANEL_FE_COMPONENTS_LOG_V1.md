# GETHIRED_AI_JOB_PREVIEW_PANEL_FE_COMPONENTS_LOG_V1

Command: GETHIRED_PUBLIC_EMPLOYER_ALL_CTA_AI_JOB_CREATE_PANEL_PARTIAL_PREVIEW_AUTH_CONTINUATION_FULLSTACK_V1

---

## AiJobPreviewPanelComponent

**Path**: `src/app/public/employer-portal/ai-job-preview-panel/`  
**Selector**: `app-ai-job-preview-panel`  
**Declared in**: `PublicModule`

### Inputs / Outputs
```typescript
@Input() open: boolean       // Controls visibility
@Output() closed: EventEmitter<void>  // Emitted on X button, backdrop click, Escape, or after auth navigation
```

### State
```typescript
step: 'input' | 'loading' | 'preview' | 'error'
jobTitle: string
location: string
workSetup: string
employmentType: string
titleError: string
errorMsg: string
previewData: AnonPreviewResponse | null
```

### Step Transitions
```
idle (open=false)
  → [open=true] → 'input'
     → [generate() called, valid] → 'loading'
        → [API success] → 'preview'
        → [API error] → 'error'
     → [tryAgain()] → 'input'
```

### Panel UX
- **Backdrop**: `position:fixed, inset:0, rgba(0,0,0,0.6)` — click-to-close
- **Panel**: `max-width:560px, border-radius:20px, animation:aijp-panel-in`
- **Mobile**: `border-radius:20px 20px 0 0, align-items:flex-end` (bottom sheet)
- **Escape key**: closes via `onKeydown()` listener on backdrop div
- **body.overflow**: set to 'hidden' on open, restored on close/destroy

### Auth Handoff
1. User sees partial preview → clicks "Create free employer account"
2. `goSignup()`: saves `previewToken` to sessionStorage → emits `closed` → navigates to `/signup?role=2`
3. `goSignin()`: saves `previewToken` to sessionStorage → emits `closed` → navigates to `/signin`
4. After auth: `EmployerPanelComponent.checkAndClaimAiPreview()` handles the claim

---

## PublicJobPreviewService

**Path**: `src/app/public/services/public-job-preview.service.ts`  
**Provided in**: `root` (global singleton)

### Methods
| Method | Description |
|--------|-------------|
| `generatePreview(inputs)` | POST /api/public/employer/ai-preview-generate |
| `claimPreview(token)` | POST /api/recruiter/job-post-assistant/claim-preview |
| `savePendingToken(token)` | Writes to sessionStorage['gh_ai_preview_token'] |
| `getPendingToken()` | Reads from sessionStorage (try/catch safe) |
| `clearPendingToken()` | Removes from sessionStorage |
| `hasPendingToken()` | Boolean check |

---

## EmployerPortalComponent Changes

**Path**: `src/app/public/employer-portal/employer-portal.component.ts`

**New state**: `aiPanelOpen = false`  
**Changed method**: `startHiring()` — now sets `aiPanelOpen = true` instead of navigating  
**New method**: `onAiPanelClosed()` — sets `aiPanelOpen = false`, restores body scroll  

**Template change**: `<app-ai-job-preview-panel [open]="aiPanelOpen" (closed)="onAiPanelClosed()">` added at end of template (after `</main>`).

All 9 "Start hiring" CTA buttons already called `startHiring()` — no individual button changes required.

---

## EmployerPanelComponent Changes

**Path**: `src/app/employer-panel/employer-panel.component.ts`

**New import**: `PublicJobPreviewService`  
**New injection**: `private jobPreviewService: PublicJobPreviewService`  
**New method**: `checkAndClaimAiPreview()` — private, called from ngOnInit  

```typescript
private checkAndClaimAiPreview(): void {
  const token = this.jobPreviewService.getPendingToken();
  if (!token) return;

  this.jobPreviewService.claimPreview(token)
    .pipe(take(1))
    .subscribe({
      next: (res) => {
        this.jobPreviewService.clearPendingToken();
        if (res && res.jobId) {
          this.router.navigate(['/recruiter/jobs/list'], {
            queryParams: { claimedDraft: '1' },
          });
        }
      },
      error: () => {
        // Non-fatal — token expired; clear silently
        this.jobPreviewService.clearPendingToken();
      },
    });
}
```

**Why here**: `EmployerPanelComponent` is the shell wrapping all `/recruiter/*` routes. It's the first authenticated employer component to initialize after signup or signin. Checking for a pending token here ensures the claim fires exactly once, regardless of which child route the employer lands on.

---

## PublicModule Changes

```typescript
import { AiJobPreviewPanelComponent } from './employer-portal/ai-job-preview-panel/ai-job-preview-panel.component';

declarations: [
  ...existing...,
  AiJobPreviewPanelComponent,
]
```

`FormsModule` is already imported in `PublicModule` — required for `[(ngModel)]` bindings in the panel.
