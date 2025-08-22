# Frame 15 – Time (Pro)

Private site with:
- Time tracking at `/time`
- Projects admin at `/projects`
- Netlify Function backend using Google Sheets

## Quick start
1) `npm install`
2) Tailwind is pre-configured
3) Add env vars in Netlify:
   - GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID
   - ALLOWED_EMAIL_DOMAIN or ALLOWED_EMAILS
4) Deploy. Visit `/projects` to create your first project (auto-numbering starts at 1000).

