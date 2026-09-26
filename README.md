# School Alumni Portal

A full-stack alumni platform for a school community, built with React, Vite, Tailwind CSS, Express, MongoDB, and JWT authentication.

## Features

- Alumni directory with batch/year filtering
- Search by name, year, or house
- Dynamic alumni profile cards and detail pages
- Signup and login with JWT
- Profile management for authenticated users
- Notifications and unread count
- Admin profile approval with verified badges and a 10-hour decline grace period
- Responsive design for desktop, tablet, and mobile
- Seed data generation for demo usage

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Router DOM
- Axios
- Lucide React

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT
- bcryptjs
- cors
- dotenv

## Project Structure

```bash
alumni-portal/
├── client/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── package.json
│   └── server.js
├── .env.example
├── README.md
├── package.json
└── .gitignore
```

## Installation

From the root directory:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

## Environment Variables

Create a `.env` file in the project root using the sample below:

```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/alumni-portal
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=1JXydFxZ97NOUp22k1LW0ckCyXcwR-k3-
ADMIN_EMAIL=alumniadmin@navodaya.com
ADMIN_PASSWORD=use-a-strong-private-password
```

If `MONGO_URI` is not provided, the app will fall back to an in-memory MongoDB instance for local testing.
Alumni sign in at `/login`; administrator sign in is at `/admin`. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the ignored root `.env` file. Admin credentials are verified only on the server, and admin sessions use a separate token from alumni sessions.
Signup does not require a profile photo: users can choose one of the included boy or girl default avatars. If a user uploads a photo, the Google service account email, private key, and folder ID above are required. Share the [profile image folder](https://drive.google.com/drive/folders/1JXydFxZ97NOUp22k1LW0ckCyXcwR-k3-?usp=drive_link) with that service account as an editor. Uploaded images are shared as viewable links and the URL is saved in the user profile. Image uploads accept JPEG, PNG, GIF, and WebP up to 5 MB. Uploaded images are stored only in Google Drive; there is no local-storage fallback.

## Running the App

Start both frontend and backend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run server
npm run client
```

## Seed Data

Populate the database with sample alumni records:

```bash
npm run seed
```

This creates demo data across multiple batches and houses.

## API Endpoints

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Admin
- `POST /api/admin/login`
- `GET /api/admin/dashboard` (admin token required)
- `GET /api/admin/users?batch=2024&house=Aravali` (admin token required)
- `PUT /api/admin/users/:id` (admin token required)
- `PUT /api/admin/users/:id/verification` (admin token required; body: `{ "status": "approved" | "declined" }`)
- `DELETE /api/admin/users/:id` (admin token required; permanently deletes the account and notifications)

The admin dashboard lists alumni grouped by batch and can filter by batch or house. New accounts start with verification pending. Administrators can approve an account, which adds a verified badge to its public profile, or decline it. Declined accounts remain available during a 10-hour grace period and can be approved again before deletion; after the grace period, the server permanently removes the account and its notifications. Administrators can also edit profile details or permanently delete an account immediately after confirming the action.

### Alumni
- `GET /api/alumni`
- `GET /api/alumni/:id`
- `GET /api/alumni/year/:year`
- `GET /api/alumni/search`

### User Profile
- `PUT /api/users/profile`
- `POST /api/uploads/profile-image` (authenticated; multipart field: `image`)

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`

Profile image uploads accept JPEG, PNG, GIF, and WebP images up to 5 MB and are stored only in Google Drive. Configure all three `GOOGLE_DRIVE_*` values in `.env` and share the configured folder with the service account as an editor. The resulting Drive sharing link is stored as the user's profile image URL.

## Authentication Flow

1. User signs up with name, batch, house, navodaya, password, etc.
2. Password is hashed before saving to MongoDB.
3. Server issues a JWT after successful login.
4. JWT is stored in localStorage and attached to API requests.
5. Protected routes verify the token using middleware.

## Future Improvements

- Managed object storage for deployed profile image uploads
- Email verification and password reset flow
- Event and job posting features
- Messaging and alumni groups

## License

MIT
