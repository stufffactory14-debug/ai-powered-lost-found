# AI-Powered Lost & Found

AI-Powered Lost & Found is a planned platform for helping people report, discover, and reconnect with lost belongings. The project is currently in its foundation phase, with the client and server setup in place but no user-facing product features implemented yet.

## Problem Statement

Lost-and-found processes are often fragmented across notice boards, group chats, and informal conversations. This makes it difficult for people to report an item, discover a possible match, or follow up in one reliable place.

## Planned Solution

The planned solution is a central web platform where users can submit lost or found item reports and search for possible matches. Later roadmap steps will introduce the workflows and supporting services needed to make those reports useful and safe.

## Tech Stack

Current project foundation:

- Client: React, Vite, Tailwind CSS, React Router, Axios
- Server: Node.js, Express, Mongoose, dotenv
- Database: MongoDB Atlas connection is configured through an environment variable

## Planned Features

The following are planned only; they are not implemented yet.

- Lost and found item reporting
- Item discovery and search
- Claim and follow-up workflows
- User authentication and account management
- Image handling for item reports
- AI-assisted matching or search capabilities

## Development Status

This project follows a strict 24-step roadmap. The repository, backend foundation, frontend foundation, and this initial README skeleton are complete. Application features are pending later roadmap steps.

## Local Setup

### Server

```bash
cd server
npm install
```

Create a local `server/.env` file using `server/.env.example` as a template, then start the server:

```bash
npm run dev
```

### Client

```bash
cd client
npm install
```

Create a local `client/.env` file using `client/.env.example` as a template, then start the client:

```bash
npm run dev
```

## Environment Variables

Use local `.env` files only. Do not commit real values or secrets.

### Server

- `PORT`
- `MONGODB_URI`

### Client

- `VITE_API_BASE_URL`

## TODO

- Add detailed feature documentation as the corresponding roadmap steps are completed.
- Add contribution, deployment, and API documentation only when those areas are implemented.
