# DO NOT use alpine here
FROM node:20-bullseye

WORKDIR /app
ENV ROLLUP_SKIP_NODE_NATIVE=1

# we will re-generate the lockfile inside Linux, so start with package.json only
COPY package.json ./

# use npm install (not ci) so it can generate a fresh lockfile for this platform
RUN npm install

# now copy the rest of the app
COPY . .

# optional: expose, not strictly required for Vite
EXPOSE 5173
