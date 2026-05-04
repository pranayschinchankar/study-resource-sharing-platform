# 📚 StudyShare – Study Resource Sharing Platform

A full-stack web platform where students can upload, share, browse, and download study materials such as notes, PDFs, and useful links.

---

## 🗂 Project Structure

```
studyshare/
├── backend/          ← Node.js + Express API
│   ├── middleware/
│   │   ├── db.js     ← PostgreSQL connection pool
│   │   ├── auth.js   ← JWT middleware
│   │   └── schema.js ← DB table initialization
│   ├── routes/
│   │   ├── auth.js       ← Signup / Login
│   │   ├── resources.js  ← Upload, browse, download, rate, comment
│   │   └── admin.js      ← Admin stats, manage resources & users
│   ├── uploads/      ← Uploaded files stored here
│   ├── server.js     ← Express entry point
│   ├── .env          ← Environment variables
│   └── package.json
└── frontend/         ← Vanilla HTML/CSS/JS
    ├── index.html    ← Browse & search resources
    ├── upload.html   ← Upload files or links
    ├── profile.html  ← User profile + saved items
    ├── admin.html    ← Admin dashboard
    ├── css/style.css
    └── js/app.js     ← Shared auth, API helper, nav
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
npm install
```

Edit `.env` if needed:
```env
DATABASE_URL=postgres://user_8f3k2:Kj92nLmPq4@dpg-cq7a1b2cd3e4f5g6h7i8-a.oregon-postgres.render.com:5432/db_9xw4z
JWT_SECRET=studyshare_super_secret_jwt_2024
PORT=5000
```

Start the server:
```bash
npm start
# Or for development with auto-reload:
npm install -g nodemon
npm run dev
```

The API runs at: `http://localhost:5000`

### 2. Frontend Setup

No build step needed! Just open the frontend files in a browser.

**Option A – VS Code Live Server:**
Right-click `index.html` → Open with Live Server

**Option B – Python HTTP Server:**
```bash
cd frontend
python3 -m http.server 3000
# Visit http://localhost:3000
```

**Option C – Any static file host** (Netlify, Vercel, GitHub Pages)

> **Note:** If your backend is hosted at a different URL, update `API_BASE` at the top of `frontend/js/app.js`:
> ```js
> const API_BASE = window.BACKEND_URL || 'https://your-api.onrender.com';
> ```

---

## 🌟 Features

### 1. User Authentication
- Signup & login with JWT tokens
- Password hashing with bcryptjs
- User avatar via ui-avatars.com
- Admin role: sign up with `admin@studyshare.com`

### 2. Upload Study Resources
- Upload PDFs, DOCX, PPTX, TXT, images, ZIP (max 20MB)
- Or share a link (Google Drive, YouTube, etc.)
- Add title, subject, description, and tags
- Drag & drop file upload with progress bar

### 3. Browse & Download
- Resource grid with cards showing type, subject, rating, downloads
- Click any card to open detail modal
- Download files or open links
- Save resources to your personal collection

### 4. Search by Subject
- Filter by subject (Math, Physics, Chemistry, etc.)
- Full-text search by title, description, or tags
- Sort by newest, oldest, most downloaded, top rated
- Filter by file type (file vs link)

### 5. Admin Control
- Admin dashboard with stats overview
- View all active resources
- Remove inappropriate files (soft delete)
- Restore removed resources
- View all registered users

### Extra Features
- ⭐ 1–5 star ratings per resource
- 💬 Comments on resources
- 🔖 Save/bookmark resources
- 📊 Subject breakdown chart in admin

---

## 🔌 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | – | Register |
| POST | `/api/auth/login` | – | Login |
| GET | `/api/resources` | – | List/search resources |
| GET | `/api/resources/:id` | – | Resource details |
| POST | `/api/resources/upload` | ✅ | Upload resource |
| POST | `/api/resources/:id/download` | – | Increment downloads |
| POST | `/api/resources/:id/rate` | ✅ | Rate resource |
| POST | `/api/resources/:id/comment` | ✅ | Add comment |
| POST | `/api/resources/:id/save` | ✅ | Toggle save |
| DELETE | `/api/resources/:id` | ✅ | Delete own resource |
| GET | `/api/resources/user/my-uploads` | ✅ | My uploads |
| GET | `/api/resources/user/saved` | ✅ | My saved |
| GET | `/api/admin/stats` | 🔐 | Admin stats |
| GET | `/api/admin/resources` | 🔐 | All resources |
| PATCH | `/api/admin/resources/:id/remove` | 🔐 | Remove resource |
| PATCH | `/api/admin/resources/:id/restore` | 🔐 | Restore resource |
| GET | `/api/admin/users` | 🔐 | All users |

✅ = requires login &nbsp;&nbsp; 🔐 = requires admin

---

## 🗄 Database

PostgreSQL hosted on Render. Tables auto-created on first run:
- `users` – accounts
- `resources` – uploaded files and links
- `ratings` – star ratings per user per resource
- `comments` – comments per resource
- `saved_resources` – user bookmarks

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js, Express |
| Database | PostgreSQL (Render) |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Fonts | Syne + DM Sans (Google Fonts) |
