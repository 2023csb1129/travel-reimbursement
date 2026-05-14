# Reimbursify 💎

Reimbursify is a modern, offline-first web application designed to streamline the expense reporting and reimbursement process for institutions like IIT Ropar. Built with a responsive and sleek user interface, it provides a seamless way to track trips, manage receipts, and automatically generate complex institutional forms.

## 🌟 Key Features

- **Progressive Web App (PWA)**: Completely offline-capable. You can add trips and upload receipt attachments without an internet connection. Data automatically syncs when you're back online.
- **Smart Form Auto-filling**: Select a trip, and Reimbursify will intelligently parse your expenses and auto-fill complex tables (Travel, Accommodation, Miscellaneous) on institutional forms.
- **Save Drafts Locally**: Stop halfway through a long form? Click "Save Draft" to persist your progress locally, and pick up right where you left off later.
- **Robust Authentication**: Supports standard Username & Password login via NextAuth Credentials Provider, as well as seamless Google OAuth sign-in.
- **Dynamic Administrator Dashboard**: "Reimbursifiers" can easily view, manage, and process submitted forms within their dedicated institution group.
- **Role-Based Access**: Specialized views for standard `USER` accounts (Submitters) and `ADMINISTRATOR` accounts (Approvers).

## 🚀 Tech Stack

- **Frontend**: Next.js 14/15, React, Vanilla CSS, Lucide React (Icons)
- **Backend**: Next.js App Router API Routes
- **Database**: SQLite (via Prisma ORM)
- **Authentication**: NextAuth.js v4 (Credentials & Google Providers)
- **Deployment**: Vercel (Frontend/API) & Render (Optional backend services)

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/2023csb1129/travel-reimbursement.git
   cd travel-reimbursement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
   *Make sure to include your `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` if you plan to use Google OAuth.*

4. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the Database (Optional)**
   To load the default IIT Ropar Form Template and create an Admin User:
   ```bash
   node scripts/seed_iit_form.js
   ```

6. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
